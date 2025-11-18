#!/bin/bash
set -e  # stop the script if any command fails

# Activate virtual environment
echo "Activating virtual environment..."
uv sync
source .venv/bin/activate

# Determine which environment file to use
if [ -z "$ENV_FOR_DYNACONF" ]; then
    # ENV_FOR_DYNACONF not set, default to development
    ENV_FOR_DYNACONF="development"
fi

echo "Using ENV_FOR_DYNACONF=$ENV_FOR_DYNACONF"

# Load environment variables from the selected file
ENV_FILE=".env.${ENV_FOR_DYNACONF}"

if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: $ENV_FILE not found, skipping"
fi

# Pull values from env variables or hardcoded config
HOST=$(python3 -c "from app.core.settings import settings; print(settings.fastapi.host)")
PORT=$(python3 -c "from app.core.settings import settings; print(settings.fastapi.port)")

# Start backend server in background
echo "Starting backend server on $HOST:$PORT..."
PYTHONPATH=. uvicorn app.main:app \
  --host "$HOST" \
  --port "$PORT" \
  --reload \
  --reload-dir ./app
