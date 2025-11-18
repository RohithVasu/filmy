import os
import json
import pandas as pd
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from pathlib import Path

DATA_PATH = Path("data/tmdb_movies_updated.parquet")
OUTPUT_PATH = Path("data/movie_vectors.npz")
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def clean_genres(genre_str):
    """Convert genre string to list"""
    if not genre_str or pd.isna(genre_str):
        return []
    try:
        # genres may be stored as stringified list or comma-separated string
        if isinstance(genre_str, str):
            if "[" in genre_str:
                genres = json.loads(genre_str)
                return [g["name"] if isinstance(g, dict) else g for g in genres]
            else:
                return [g.strip() for g in genre_str.split(",") if g.strip()]
    except Exception:
        return []
    return []


def build_embedding_text(row):
    """Construct descriptive text for embeddings"""
    title = row["title"]
    overview = row.get("overview") or ""
    genres = ", ".join(row.get("genres", []))
    runtime = row.get("runtime", "")
    release = row.get("release_year", "")
    return f"{title}. {overview}. Genres: {genres}. Runtime: {runtime} mins. Release year: {release}."


def main():
    print("🎬 Loading movie dataset...")
    df = pd.read_parquet(DATA_PATH)
    print(f"Loaded {len(df)} movies.")

    # Clean missing values
    df["genres"] = df["genres"].apply(clean_genres)
    df["overview"] = df["overview"].fillna("")
    df["runtime"] = df["runtime"].fillna(0)
    df["release_year"] = df["release_year"].fillna(0)

    # Initialize model
    print(f"⚙️ Loading embedding model: {EMBED_MODEL}")
    model = SentenceTransformer(EMBED_MODEL)

    # Generate embeddings
    texts = [build_embedding_text(row) for _, row in df.iterrows()]
    print("🧠 Generating embeddings (this may take a while)...")
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=64, show_progress_bar=True)

    # Save to disk
    os.makedirs("data", exist_ok=True)
    np.savez_compressed(
        OUTPUT_PATH,
        ids=df["tmdb_id"].values,
        titles=df["title"].values,
        embeddings=embeddings,
        genres=df["genres"].values,
        release_year=df["release_year"].values,
        popularity=df["popularity"].values,
        poster_path=df["poster_path"].values,
    )

    print(f"✅ Saved movie vectors to {OUTPUT_PATH} (shape={embeddings.shape})")


if __name__ == "__main__":
    main()
