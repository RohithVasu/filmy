from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.qdrant import get_qdrant_client
# from app.model_handlers.model_loader import load_lightfm_model
from app.model_handlers.movie_handler import MovieHandler
import numpy as np

class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.qdrant = get_qdrant_client()
        # try:
        #     self.model, self.dataset, self.item_features = load_lightfm_model()
        # except Exception:
        #     self.model, self.dataset, self.item_features = None, None, None

    # ----------------------------
    # 🎬 Guest (Content-Based)
    # ----------------------------
    def guest_recommendations(
        self,
        genres: Optional[List[str]] = None,
        examples: Optional[List[str]] = None,
        limit: int = 10,
    ):
        """
        Recommend movies for guest users.

        - If `examples` are provided → perform Qdrant vector search
        - Else if `genres` are provided → perform DB search
        - Always sort DB results by popularity
        """

        # --- CASE 1: Similar movies (Vector Search) ---
        if examples:
            text_query = " ".join(examples)
            # filters = {}

            # # If genres are also passed, include them as metadata filters in Qdrant
            # if genres:
            #     filters["genres"] = genres[:3]

            movies = self.qdrant.search_similar(
                query=text_query,
                # filters=filters if filters else None,
                limit=limit,
            )
            return movies

        # --- CASE 2: Genre-based DB search ---
        elif genres:
            movie_handler = MovieHandler(self.db)
            return movie_handler.get_by_genres(genres, limit)


    # # ----------------------------
    # # 👤 Personalized (LightFM)
    # # ----------------------------
    # def personalized_recommendations(self, user_id: int, limit: int = 10):
    #     if not self.model:
    #         return []

    #     # Fetch all movies
    #     movies = self.db.query(Movie).all()
    #     movie_ids = [m.id for m in movies]

    #     # Predict scores using LightFM
    #     scores = self.model.predict(user_id, movie_ids, item_features=self.item_features)
    #     top_idx = np.argsort(-scores)[:limit]
    #     top_movies = [movies[i] for i in top_idx]

    #     return [
    #         {
    #             "id": m.id,
    #             "title": m.title,
    #             "genres": m.genres,
    #             "release_year": m.release_year,
    #             "poster_path": m.poster_path,
    #         }
    #         for m in top_movies
    #     ]

    # # ----------------------------
    # # ⚙️ Hybrid Recommendations
    # # ----------------------------
    # def hybrid_recommendations(self, user_id: int, query: str, limit: int = 10):
    #     """
    #     Combine Qdrant content similarity with user preferences.
    #     """
    #     if not self.model:
    #         # Fallback to Qdrant only
    #         return self.qdrant.search_similar(query=query, limit=limit)

    #     # Step 1: Retrieve semantically similar movies from Qdrant
    #     cbf_results = self.qdrant.search_similar(query=query, limit=50)
    #     movie_ids = [r["id"] for r in cbf_results]
    #     cbf_scores = np.array([r["score"] for r in cbf_results])

    #     # Step 2: Predict personalized scores
    #     scores = self.model.predict(user_id, movie_ids, item_features=self.item_features)

    #     # Step 3: Weighted reranking (hybrid)
    #     final_scores = 0.6 * scores + 0.4 * cbf_scores
    #     top_idx = np.argsort(-final_scores)[:limit]
    #     top_ids = [movie_ids[i] for i in top_idx]

    #     # Step 4: Retrieve movie info
    #     movies = self.db.query(Movie).filter(Movie.id.in_(top_ids)).all()
    #     return [
    #         {
    #             "id": m.id,
    #             "title": m.title,
    #             "genres": m.genres,
    #             "release_year": m.release_year,
    #             "poster_path": m.poster_path,
    #         }
    #         for m in movies
    #     ]
