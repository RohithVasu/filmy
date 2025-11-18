import numpy as np
import pandas as pd
from tqdm import tqdm
from qdrant_client import QdrantClient
from qdrant_client.http import models

DATA_PATH = "data/movie_vectors.npz"

# Load environment
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "movies"

# Connect clients
qdrant = QdrantClient(url=QDRANT_URL)


def ensure_collection():
    """Ensure the movies collection exists in Qdrant"""
    try:
        qdrant.get_collection(COLLECTION_NAME)
        print(f"✅ Collection '{COLLECTION_NAME}' already exists.")
    except Exception:
        print(f"⚙️ Creating collection '{COLLECTION_NAME}'...")
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
            on_disk_payload=True,
        )


def load_vectors():
    """Load stored vectors"""
    print(f"📦 Loading vectors from {DATA_PATH}...")
    data = np.load(DATA_PATH, allow_pickle=True)
    return data


def index_to_qdrant(data):
    """Index movie vectors into Qdrant."""
    ensure_collection()

    ids = data["ids"]
    titles = data["titles"]
    vectors = data["embeddings"]
    genres = data["genres"]
    release_year = data["release_year"]
    popularity = data["popularity"]
    posters = data["poster_path"]

    print("🚀 Indexing vectors into Qdrant...")

    batch_size = 200
    for i in tqdm(range(0, len(ids), batch_size)):
        batch_slice = slice(i, i + batch_size)
        payloads = [
            {
                "id": int(ids[j]),
                "title": str(titles[j]),
                "genres": genres[j].tolist() if isinstance(genres[j], np.ndarray) else genres[j],
                "release_year": int(release_year[j]),
                "popularity": float(popularity[j]),
                "poster_path": str(posters[j]) if posters[j] else None,
            }
            for j in range(batch_slice.start, min(batch_slice.stop, len(ids)))
        ]

        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                models.PointStruct(
                    id=int(payloads[k]["id"]),
                    vector=vectors[i + k].tolist(),
                    payload=payloads[k],
                )
                for k in range(len(payloads))
            ],
        )

    print(f"✅ Indexed {len(ids)} movies into Qdrant.")


def main():
    data = load_vectors()

    # Load metadata into dataframe
    df = pd.DataFrame({
        "tmdb_id": data["ids"],
        "title": data["titles"],
        "genres": data["genres"],
        "release_year": data["release_year"],
        "popularity": data["popularity"],
        "poster_path": data["poster_path"],
    })

    # Index into Qdrant
    index_to_qdrant(data)

if __name__ == "__main__":
    main()
