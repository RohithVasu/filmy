import os
import json
import asyncio
import aiohttp
import aiofiles
import pandas as pd
from tqdm.asyncio import tqdm
from dotenv import load_dotenv
from aiohttp import ClientSession, ClientTimeout

# ==========================================
# CONFIG
# ==========================================

load_dotenv()
TMDB_TOKEN = os.getenv("TMDB_API_TOKEN")

INPUT_FILE = "backend/data/missing_movies.csv"
OUTPUT_JSON = "backend/data/missing_movies_fetched.json"
FINAL_DATA = "backend/data/tmdb_movies_updated.parquet"
EXISTING_DATA = "backend/data/tmdb_movies.parquet"
PROGRESS_FILE = "backend/data/fetch_progress.json"

RATE_LIMIT = 40   # TMDB: 40 requests / 10 seconds
WINDOW_SECONDS = 10
CONCURRENT_REQUESTS = 10
SAVE_EVERY_BATCHES = 50  # production save interval

MAX_RETRIES = 3

# ✅ Test flag
TEST_MODE = False      # <--- set True for testing 1 batch, False for full run
TEST_BATCHES = 1      # number of batches to run in test mode

# ==========================================
# UTILS
# ==========================================

def load_checkpoint():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"last_completed_batch": 0}


def save_checkpoint(batch_num):
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"last_completed_batch": batch_num}, f)


def load_existing_json():
    if os.path.exists(OUTPUT_JSON):
        with open(OUTPUT_JSON, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []


async def save_progress(data, batch_num):
    async with aiofiles.open(OUTPUT_JSON, "w") as f:
        await f.write(json.dumps(data, indent=2))
    save_checkpoint(batch_num)
    print(f"💾 Progress saved after batch {batch_num} → {len(data)} movies total")


def extract_genres(genre_list):
    if isinstance(genre_list, list):
        return [g.get("name") for g in genre_list if "name" in g]
    return []


# ==========================================
# TMDB FETCH LOGIC
# ==========================================

async def fetch_movie(session: aiohttp.ClientSession, movie_id: int):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}"
    headers = {"Authorization": f"Bearer {TMDB_TOKEN}"}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with session.get(url, headers=headers, ssl=False) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ {movie_id}: {data.get('title')}")
                    return data
                else:
                    err_text = await response.text()
                    print(f"❌ {movie_id}: {response.status} {err_text[:80]}")
                    return None

        except aiohttp.ClientConnectorError as e:
            print(f"⚠️ [Attempt {attempt}] Connection error for {movie_id}: {e}")
        except aiohttp.ClientOSError as e:
            print(f"⚠️ [Attempt {attempt}] OS error for {movie_id}: {e}")
        except Exception as e:
            print(f"⚠️ [Attempt {attempt}] Unexpected error for {movie_id}: {e}")

        # Retry with exponential backoff
        await asyncio.sleep(2 ** attempt)

    print(f"❌ {movie_id}: Failed after {MAX_RETRIES} retries")
    return None



async def fetch_all_movies(movie_ids, start_batch=0, existing_data=None):
    """Fetch all movies in batches respecting TMDB rate limits."""
    timeout = ClientTimeout(total=30)
    connector = aiohttp.TCPConnector(limit=CONCURRENT_REQUESTS)
    results = existing_data or []

    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        batch_num = start_batch

        for i in range(start_batch * RATE_LIMIT, len(movie_ids), RATE_LIMIT):
            batch = movie_ids[i:i + RATE_LIMIT]
            batch_num += 1
            print(f"\n🚀 Fetching batch {batch_num} ({len(batch)} movies)...")

            tasks = [fetch_movie(session, mid) for mid in batch]
            responses = await asyncio.gather(*tasks)

            for res in responses:
                if res:
                    results.append(res)

            # Save progress periodically
            if batch_num % SAVE_EVERY_BATCHES == 0 or TEST_MODE:
                await save_progress(results, batch_num)

            # Respect rate limit
            if i + RATE_LIMIT < len(movie_ids):
                print(f"⏳ Sleeping {WINDOW_SECONDS}s to respect rate limits...")
                await asyncio.sleep(WINDOW_SECONDS)

    return results


# ==========================================
# MAIN
# ==========================================

async def main():
    if not TMDB_TOKEN:
        print("❌ TMDB_API_TOKEN not found. Please set it in .env or hardcode it.")
        return

    # Load movie IDs
    missing_df = pd.read_csv(INPUT_FILE)
    movie_ids = missing_df["id"].dropna().astype(int).unique().tolist()
    print(f"🎬 Total missing movies to fetch: {len(movie_ids)}")

    # Limit if testing
    if TEST_MODE:
        movie_ids = movie_ids[:RATE_LIMIT * TEST_BATCHES]
        print(f"🧪 Test Mode: Running only {TEST_BATCHES} batch(es) → {len(movie_ids)} movies")

    # Load checkpoint
    progress = load_checkpoint()
    start_batch = progress.get("last_completed_batch", 0)
    print(f"🔁 Resuming from batch: {start_batch}")

    # Load existing partial data
    existing_json = load_existing_json()
    print(f"📂 Loaded {len(existing_json)} previously fetched movies")

    # Fetch remaining movies
    fetched_data = await fetch_all_movies(movie_ids, start_batch=start_batch, existing_data=existing_json)
    print(f"✅ Total fetched (including previous): {len(fetched_data)} movies")

    # Final save
    await save_progress(fetched_data, len(movie_ids) // RATE_LIMIT)

    if not TEST_MODE:
        # Normalize & merge only in full mode
        print("📦 Normalizing fetched data...")
        movies_new = pd.json_normalize(fetched_data)
        movies_new["genres"] = movies_new["genres"].apply(extract_genres)

        cols = [
            "id", "title", "overview", "genres", "original_language", "runtime",
            "popularity", "poster_path", "release_date", 
        ]
        movies_new = movies_new[[c for c in cols if c in movies_new.columns]]

        movies_new.to_parquet("backend/data/missing_movies.parquet", index=False)

        movies_new["release_date"] = pd.to_datetime(movies_new["release_date"])
        movies_new["release_year"] = movies_new["release_date"].dt.year
        # movies_new["release_year"] = movies_new["release_year"].astype(int)

        existing_df = pd.read_parquet(EXISTING_DATA)
        combined_df = pd.concat([existing_df, movies_new], ignore_index=True)
        combined_df.drop_duplicates(subset="id", inplace=True)
        combined_df.to_parquet(FINAL_DATA, index=False)

        print(f"🎉 Final merged dataset saved to {FINAL_DATA}")
        print(f"🧮 Total movies now: {len(combined_df)}")
    else:
        print("🧪 Test run complete — skipping merge and normalization.")


# ==========================================
# ENTRY POINT
# ==========================================

if __name__ == "__main__":
    asyncio.run(main())
