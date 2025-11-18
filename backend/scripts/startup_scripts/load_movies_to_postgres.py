import os
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from tqdm import tqdm

# Database connection URL
username = "filmy"
password = "filmy"
host = "localhost"
port = 5432
database = "filmy_db"

DATABASE_URL = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}"
engine = create_engine(DATABASE_URL)

DATA_PATH = "data/tmdb_movies_updated.parquet"
TABLE_NAME = "movies"


# -----------------------------------
# 🧩 Utility Functions
# -----------------------------------
def clean_genres(value):
    """Ensure genres are in JSON-compatible list format."""
    if pd.isna(value):
        return []
    try:
        if isinstance(value, str):
            if "[" in value:  # e.g., stringified list
                import json
                genres = json.loads(value)
                return [g["name"] if isinstance(g, dict) else g for g in genres]
            else:
                return [g.strip() for g in value.split(",") if g.strip()]
        elif isinstance(value, list):
            return value
    except Exception:
        return []
    return []


def load_movies_parquet(path: str):
    """Read parquet file and clean columns."""
    print(f"📥 Loading movies from {path} ...")
    df = pd.read_parquet(path)

    # Fill missing values
    df["overview"] = df["overview"].fillna("")
    df["original_language"] = df["original_language"].fillna("English")
    df["runtime"] = df["runtime"].fillna(0)
    df["popularity"] = df["popularity"].fillna(0)
    df["poster_path"] = df["poster_path"].fillna("")
    df["release_year"] = df["release_year"].fillna(0).astype(int)
    df["genres"] = df["genres"].apply(clean_genres)

    print(f"✅ Loaded {len(df)} rows from dataset.")
    return df


def insert_movies(df: pd.DataFrame, batch_size: int = 500):
    """Insert movies into database (skip duplicates)."""
    with engine.begin() as conn:
        existing_ids = {
            row[0]
            for row in conn.execute(text(f"SELECT tmdb_id FROM {TABLE_NAME};"))
        }

    print(f"🧮 Found {len(existing_ids)} existing movies, skipping duplicates...")

    new_movies = df[~df["tmdb_id"].isin(existing_ids)]
    print(f"🚀 Inserting {len(new_movies)} new movies into DB...")

    if new_movies.empty:
        print("✅ No new movies to insert.")
        return

    for i in tqdm(range(0, len(new_movies), batch_size)):
        batch = new_movies.iloc[i : i + batch_size]
        batch.to_sql(TABLE_NAME, engine, if_exists="append", index=False, method="multi")

    print("✅ Finished inserting movies into PostgreSQL.")


def main():
    print("🎬 Starting movie data load to PostgreSQL...")
    try:
        df = load_movies_parquet(DATA_PATH)
        insert_movies(df)
        print("🎉 Movies successfully loaded into PostgreSQL.")
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


if __name__ == "__main__":
    main()
