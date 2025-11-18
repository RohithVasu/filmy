from typing import List, Optional
from sqlalchemy.orm import Session
import numpy as np
import os
import pickle

from app.core.qdrant import get_qdrant_client
from app.model_handlers.movie_handler import MovieHandler
from app.model_handlers.user_feedback_handler import UserFeedbackHandler

# LightFM imports (for when model exists)
# try:
#     from lightfm import LightFM
# except Exception:
LightFM = None

MODEL_ARTIFACT_PATH = os.getenv("LIGHTFM_MODEL_PATH", "models/lightfm.pkl")
DATASET_MAP_PATH = os.getenv("LIGHTFM_DATASET_MAP_PATH", "models/dataset_map.pkl")

class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.movie_handler = MovieHandler(db)
        self.feedback_handler = UserFeedbackHandler(db)
        self.qdrant = get_qdrant_client()
        self.lightfm_model = None
        self.dataset_map = None
        self.item_features = None
        self._load_lightfm()

    def _load_lightfm(self):
        if LightFM is None:
            return
        if os.path.exists(MODEL_ARTIFACT_PATH) and os.path.exists(DATASET_MAP_PATH):
            with open(MODEL_ARTIFACT_PATH, "rb") as f:
                self.lightfm_model = pickle.load(f)
            with open(DATASET_MAP_PATH, "rb") as f:
                self.dataset_map = pickle.load(f)
        else:
            self.lightfm_model = None
            self.dataset_map = None

    # -------------------------
    # Guest: examples (movie titles or tmdb ids) -> DB fetch -> embed -> qdrant search -> DB results
    # -------------------------
    def guest_recommendations(
        self, 
        genres: Optional[List[str]] = None,
        examples: Optional[List[str]] = None,
        limit: int = 10
    ):
        if examples:
            docs = []
            for ex in examples:
                movie = self.movie_handler.get_by_title(ex)
                if movie:
                    movie_text = f"{movie.title}. {movie.overview or ''}. Genres: {movie.genres or ''}. Runtime: {movie.runtime or ''}"
                    docs.append(movie_text)
                else:
                    docs.append(ex)
            query = " ".join(docs)
            vec = self.qdrant.embedding_model.encode(query, normalize_embeddings=True)
            qres = self.qdrant.search_similar(movie_vector=vec, top=limit * 2)
            ids = [r["id"] for r in qres]
            movies = [self.movie_handler.get_by_id_raw(i) for i in ids]
            # keep order and remove Nones
            ordered = [m for m in (movies) if m]
            return [self.movie_handler._response_schema.model_validate(m) for m in ordered][:limit]

        if genres:
            return self.movie_handler.get_by_genres(genres, limit=limit)

        # fallback: popular
        return self.movie_handler.list_all(skip=0, limit=limit)

    # -------------------------
    # Personalized (LightFM ranking + fallback)
    # -------------------------
    def personalized_recommendations(self, user_id: int, limit: int = 10):
        # If no model or dataset_map -> fallback to content-based popular
        if not self.lightfm_model or not self.dataset_map:
            # fallback: use Qdrant/popularity hybrid: get top popular in genres user likes
            # For now return popular movies
            return self.recommend_popular_for_user(user_id, limit)

        # map user id -> model user index mapping (dataset_map should store user_map and item_map)
        user_map = self.dataset_map.get("user_map", {})
        item_map = self.dataset_map.get("item_map", {})
        inv_item_map = {v: k for k, v in item_map.items()}  # model-index -> movie id

        model_user_index = user_map.get(user_id)
        if model_user_index is None:
            return self.recommend_popular_for_user(user_id, limit)

        # prepare item list
        all_item_indices = list(inv_item_map.keys())
        item_ids = [inv_item_map[i] for i in all_item_indices]

        # predict
        scores = self.lightfm_model.predict(model_user_index, np.array(all_item_indices))
        top_idx = np.argsort(-scores)[:limit * 3]
        candidate_item_indices = [all_item_indices[i] for i in top_idx]
        candidate_ids = [inv_item_map[i] for i in candidate_item_indices]

        # filter watched
        watched = {fb.movie_id for fb in self.feedback_handler.get_user_feedbacks(user_id)}
        final = [mid for mid in candidate_ids if mid not in watched][:limit]
        movies = [self.movie_handler.get_by_id_raw(mid) for mid in final]
        return [self.movie_handler._response_schema.model_validate(m) for m in movies if m]

    def recommend_popular_for_user(self, user_id: int, limit=10):
        # simple fallback: highest popularity not watched
        all_popular = self.db.query(self.movie_handler._model).order_by(self.movie_handler._model.popularity.desc()).limit(limit*3).all()
        watched = {fb.movie_id for fb in self.feedback_handler.get_user_feedbacks(user_id)}
        filtered = [m for m in all_popular if m.id not in watched][:limit]
        return [self.movie_handler._response_schema.model_validate(m) for m in filtered]

    # -------------------------
    # Based on last N watched (single-section using last 3)
    # -------------------------
    def recommendations_based_on_recent_activity(
        self,
        user_id: int,
        limit: int = 12,
        last_n: int = 3
    ):
        fb_q = (
            self.db.query(self.feedback_handler._model)
            .filter(self.feedback_handler._model.user_id == user_id, self.feedback_handler._model.status == "watched")
            .order_by(self.feedback_handler._model.created_at.desc())
            .limit(last_n)
            .all()
        )
        if not fb_q:
            return []

        candidate_scores = {}
        for fb in fb_q:
            movie = self.movie_handler.get_by_id_raw(fb.movie_id)
            if not movie: 
                continue
            txt = f"{movie.title}. {movie.overview or ''}. Genres: {movie.genres or ''}. Runtime: {movie.runtime or ''}"
            vec = self.qdrant.embedding_model.encode(txt, normalize_embeddings=True)
            qres = self.qdrant.search_similar(movie_vector=vec, top=limit*2)
            for r in qres:
                mid = int(r["id"])
                candidate_scores[mid] = max(candidate_scores.get(mid, 0.0), r["score"])

        # remove watched
        watched = {fb.movie_id for fb in self.feedback_handler.get_user_feedbacks(user_id)}
        candidates = [(mid, score) for mid, score in candidate_scores.items() if mid not in watched]
        top = sorted(candidates, key=lambda x: -x[1])[:limit]
        movies = [self.movie_handler.get_by_id_raw(mid) for mid, _ in top]
        return [self.movie_handler._response_schema.model_validate(m) for m in movies if m]

    # -------------------------
    # Query-based search (dashboard search bar)
    # -------------------------
    def search_recommendations(
        self, 
        query: str,
        limit: int = 20,
        user_id: Optional[int] = None
    ):
        vec = self.qdrant.embedding_model.encode(query, normalize_embeddings=True)
        qres = self.qdrant.search_similar(movie_vector=vec, top=limit * 2)
        candidate_ids = [int(r["id"]) for r in qres]

        # if user present and model present -> hybrid rerank (simple: use lightfm scores when available)
        if user_id and self.lightfm_model and self.dataset_map:
            user_map = self.dataset_map.get("user_map", {})
            inv_item_map = {v: k for k, v in self.dataset_map.get("item_map", {}).items()}
            model_user_index = user_map.get(user_id)
            scores_map = {}
            if model_user_index is not None:
                # compute for candidate item indices (if in model)
                item_map = self.dataset_map.get("item_map", {})
                for mid in candidate_ids:
                    model_idx = item_map.get(mid)
                    if model_idx is None:
                        continue
                    sc = float(self.lightfm_model.predict(model_user_index, np.array([model_idx]))[0])
                    scores_map[mid] = sc

            # merge qdrant score + model score
            merged = []
            for r in qres:
                mid = int(r["id"])
                qscore = float(r["score"])
                mscore = scores_map.get(mid)
                final = (0.6 * mscore + 0.4 * qscore) if mscore is not None else qscore
                merged.append((mid, final))
            merged_sorted = sorted(merged, key=lambda x: -x[1])[:limit]
            movies = [self.movie_handler.get_by_id_raw(mid) for mid, _ in merged_sorted]
            # filter watched if user
            if user_id:
                watched = {fb.movie_id for fb in self.feedback_handler.get_user_feedbacks(user_id)}
                movies = [m for m in movies if m and m.id not in watched]
            return [self.movie_handler._response_schema.model_validate(m) for m in movies if m][:limit]

        # else: just return qdrant order (exclude watched if user)
        movies = [self.movie_handler.get_by_id_raw(mid) for mid in candidate_ids]
        if user_id:
            watched = {fb.movie_id for fb in self.feedback_handler.get_user_feedbacks(user_id)}
            movies = [m for m in movies if m and m.id not in watched]
        return [self.movie_handler._response_schema.model_validate(m) for m in movies][:limit]
