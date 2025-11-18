import os
import requests
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient, models
from dotenv import load_dotenv

# Load env vars
load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:pass@localhost:5432/filmy_db")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))

engine = create_engine(DATABASE_URL)
qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# TMDB API base
TMDB_BASE = "https://api.themoviedb.org/3"
DISCOVER_URL = f"{TMDB_BASE}/discover/movie"

# Helper
def fetch_new_movies(page=1):
    """Fetch latest English movies from TMDB."""
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": "release_date.desc",
        "page": page,
        "include_adult": "false"
    }
    res = requests.get(DISCOVER_URL, params=params)
    res.raise_for_status()
    return res.json()["results"]

def process_movie(m):
    """Clean movie data into your schema."""
    return {
        "tmdb_id": m["id"],
        "title": m["title"],
        "overview": m.get("overview", ""),
        "genres": [],  # we'll fetch via another endpoint if needed
        "original_language": m.get("original_language"),
        "runtime": None,  # you can later update via /movie/{id}
        "popularity": m.get("popularity", 0),
        "poster_path": m.get("poster_path"),
        "release_year": int(m["release_date"].split("-")[0]) if m.get("release_date") else None,
        "created_at": datetime.now()
    }

def get_existing_tmdb_ids():
    """Check existing movie IDs in DB."""
    with engine.connect() as conn:
        result = conn.execute("SELECT tmdb_id FROM movies;")
        return set(r[0] for r in result.fetchall())

def embed_movie(text):
    """Generate text embedding."""
    return embedding_model.encode(text, normalize_embeddings=True).tolist()

def upsert_qdrant(movie_batch):
    """Upload movie vectors to Qdrant."""
    vectors = []
    payloads = []
    for m in movie_batch:
        text = f"{m['title']}. {m['overview']}. Genres: {', '.join(m.get('genres', []))}."
        vector = embed_movie(text)
        vectors.append(vector)
        payloads.append({
            "tmdb_id": m["tmdb_id"],
            "title": m["title"],
            "genres": m["genres"],
            "release_year": m["release_year"],
            "popularity": m["popularity"]
        })
    
    qdrant.upsert(
        collection_name="movies",
        points=[
            models.PointStruct(id=int(m["tmdb_id"]), vector=vectors[i], payload=payloads[i])
            for i, m in enumerate(movie_batch)
        ]
    )

def main():
    print("🚀 Starting TMDB ingestion pipeline...")

    existing_ids = get_existing_tmdb_ids()
    print(f"Found {len(existing_ids)} existing movies in DB.")

    new_movies = []
    for page in range(1, 4):  # fetch first 3 pages (~60 movies)
        results = fetch_new_movies(page)
        for m in results:
            if m["id"] not in existing_ids:
                new_movies.append(process_movie(m))

    if not new_movies:
        print("✅ No new movies found.")
        return

    df = pd.DataFrame(new_movies)
    print(f"Found {len(df)} new movies. Inserting into DB...")

    df.to_sql("movies", engine, if_exists="append", index=False)

    print("✅ Inserted new movies to DB. Generating embeddings...")
    upsert_qdrant(new_movies)
    print("✅ Movies synced with Qdrant.")

if __name__ == "__main__":
    main()
