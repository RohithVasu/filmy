import os
import mlflow
import mlflow.pyfunc
from mlflow.tracking import MlflowClient
from loguru import logger

def load_latest_production_model(model_name="filmy_implicit_model"):
    MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5500")
    mlflow.set_tracking_uri(MLFLOW_URI)

    client = MlflowClient()
    versions = client.search_model_versions(
        f"name = '{model_name}' and tags.stage = 'production'"
    )

    if not versions:
        logger.error("❌ No Production model found")
        return None, None, None, None

    v = versions[0]
    logger.info(f"Loading Production model v{v.version}")

    model = mlflow.pyfunc.load_model(f"models:/{model_name}/{v.version}")

    dataset_map = model.dataset_map
    item_factors = model.item_factors
    user_factors = model.user_factors

    logger.info("Model loaded successfully.")

    return model, dataset_map, item_factors, user_factors
