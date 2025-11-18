import os
import numpy as np
import pandas as pd
from datetime import datetime
from lightfm import LightFM
from lightfm.data import Dataset
from sqlalchemy import create_engine
import mlflow
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:pass@localhost:5432/filmy_db")
engine = create_engine(DATABASE_URL)

NEW_DATA_THRESHOLD = 50  # retrain when ≥50 new feedbacks

MLFLOW_TRACKING_URI = "http://localhost:5000"
MLFLOW_EXPERIMENT = "filmy_lightfm"
MODEL_PATH = "data/models/lightfm_model.npz"


def get_feedback_count():
    with engine.connect() as conn:
        result = conn.execute("SELECT COUNT(*) FROM user_feedback;")
        return result.scalar()


def fetch_data():
    feedbacks = pd.read_sql("SELECT * FROM user_feedback;", engine)
    movies = pd.read_sql("SELECT * FROM movies;", engine)
    return feedbacks, movies


def extract_features(row):
    features = [f"genre:{g}" for g in (row.genres or [])]
    if row.runtime:
        if row.runtime < 90: features.append("runtime:short")
        elif row.runtime < 120: features.append("runtime:medium")
        else: features.append("runtime:long")
    if row.release_year:
        if row.release_year < 2000: features.append("year:old")
        elif row.release_year < 2015: features.append("year:mid")
        else: features.append("year:recent")
    return features


def build_dataset(feedbacks, movies):
    dataset = Dataset()
    all_users = feedbacks["user_id"].unique()
    all_movies = movies["id"].unique()

    movie_feature_map = {m["id"]: extract_features(m) for _, m in movies.iterrows()}
    all_features = set(f for feats in movie_feature_map.values() for f in feats)

    dataset.fit(all_users, all_movies, item_features=all_features)

    interactions, _ = dataset.build_interactions([
        (r.user_id, r.movie_id, compute_weight(r.rating, r.feedback))
        for _, r in feedbacks.iterrows()
    ])

    item_features = dataset.build_item_features([
        (mid, feats) for mid, feats in movie_feature_map.items()
    ])

    return dataset, interactions, item_features


def compute_weight(rating, feedback):
    base = {"like": 1.0, "neutral": 0.3, "dislike": 0.0}.get(feedback, 0)
    if rating: base += (rating - 3) * 0.2
    return max(base, 0.0)


def should_retrain():
    new_count = get_feedback_count()
    last_count = 0
    os.makedirs("data", exist_ok=True)
    if os.path.exists("data/last_feedback_count.txt"):
        with open("data/last_feedback_count.txt") as f:
            last_count = int(f.read().strip())
    if new_count - last_count >= NEW_DATA_THRESHOLD:
        print(f"🟢 Enough new data ({new_count - last_count} rows). Retraining...")
        return True, new_count
    print("🟡 Not enough new data, skipping retrain.")
    return False, new_count


def main():
    retrain, current_count = should_retrain()
    if not retrain:
        return

    feedbacks, movies = fetch_data()
    dataset, interactions, item_features = build_dataset(feedbacks, movies)

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT)

    with mlflow.start_run(run_name=f"lightfm_{datetime.now()}"):
        model = LightFM(loss="warp")
        model.fit(interactions, item_features=item_features, epochs=20, num_threads=4)
        np.savez(MODEL_PATH, model=model)

        mlflow.log_artifact(MODEL_PATH)
        mlflow.log_param("feedback_rows", len(feedbacks))
        mlflow.log_param("movies", len(movies))

        print("✅ Model trained, logged, and saved.")

        with open("data/last_feedback_count.txt", "w") as f:
            f.write(str(current_count))


if __name__ == "__main__":
    main()
