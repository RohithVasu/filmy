import os
import shutil
import json
import mlflow
import mlflow.pyfunc
from mlflow.tracking import MlflowClient
import numpy as np
from loguru import logger
from implicit.als import AlternatingLeastSquares

from app.core.settings import settings
from app.core.db import get_global_db_session
from app.pipelines.training.training_helper import (
    load_feedbacks_from_db,
    build_dataset_map,
    build_interaction_matrix,
    save_artifacts_to_tempdir,
    evaluate_model
)
from app.pipelines.training.als_mlflow_wrapper import ALSModelWrapper


# --------------------------
# Hyperparameters
# --------------------------
FACTORS = settings.mlflow.factors
REGULARIZATION = settings.mlflow.regularization
ALPHA = settings.mlflow.alpha
EPOCHS = settings.mlflow.epochs

MLFLOW_EXPERIMENT = settings.mlflow.experiment
MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5500")

ARTIFACT_TEMP_DIR = "/tmp/implicit_artifacts"

# Load synthetic config JSON
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "data", "generate_config.json"))
DATA_CONFIG = json.load(open(CONFIG_PATH))


def train():
    logger.info("Connecting to database...")
    db = next(get_global_db_session())

    # Load feedbacks
    feedbacks = load_feedbacks_from_db(db)
    logger.info(f"Loaded {len(feedbacks)} feedback rows.")

    # Build mapping
    dataset_map = build_dataset_map(feedbacks)
    user_map = dataset_map["user_map"]
    item_map = dataset_map["item_map"]

    logger.info(f"Users={len(user_map)}, Items={len(item_map)}")

    # Build sparse matrix (item × user)
    interactions = build_interaction_matrix(
        feedbacks, user_map, item_map, alpha=ALPHA
    )
    logger.info(f"Matrix shape = {interactions.shape}")

    # MLflow setup
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT)

    with mlflow.start_run(run_name="implicit_als") as run:
        run_id = run.info.run_id
        logger.info(f"Run ID = {run_id}")

        # Log data config
        mlflow.log_params({f"data_{k}": v for k, v in DATA_CONFIG.items()})

        # Log training params
        mlflow.log_params({
            "factors": FACTORS,
            "regularization": REGULARIZATION,
            "epochs": EPOCHS,
            "alpha": ALPHA,
            "n_users": len(user_map),
            "n_items": len(item_map),
        })

        # Train ALS
        logger.info("Training ALS...")
        model = AlternatingLeastSquares(
            factors=FACTORS,
            regularization=REGULARIZATION,
            iterations=EPOCHS,
            use_gpu=False,
        )
        model.fit(interactions.tocsr(), show_progress=True)

        # Evaluation
        p10, r10 = evaluate_model(model, interactions, dataset_map)
        mlflow.log_metric("precision_at_10", p10)
        mlflow.log_metric("recall_at_10", r10)

        # Save artifacts (pickle, numpy)
        artifact_dir = save_artifacts_to_tempdir(
            model=model,
            dataset_map=dataset_map,
            interactions=interactions,
            temp_dir=ARTIFACT_TEMP_DIR
        )
        mlflow.log_artifacts(artifact_dir)
        logger.info(f"Artifacts logged: {artifact_dir}")

        # Register MLflow PyFunc Model
        conda_env = mlflow.pyfunc.get_default_conda_env()
        input_example = np.random.rand(1, FACTORS)
        signature = mlflow.models.infer_signature(input_example, input_example @ np.random.rand(FACTORS, FACTORS))

        mlflow.pyfunc.log_model(
            name="als_model",
            python_model=ALSModelWrapper(),
            registered_model_name="filmy_implicit_model",
            conda_env=conda_env,
            signature=signature,
            input_example=input_example,
            artifacts={
                "implicit_model": os.path.join(artifact_dir, "implicit_model.pkl"),
                "dataset_map": os.path.join(artifact_dir, "dataset_map.pkl"),
                "user_factors": os.path.join(artifact_dir, "user_factors.npy"),
                "item_factors": os.path.join(artifact_dir, "item_factors.npy"),
            },
        )

        logger.info("MLflow model logged and registered.")

        client = MlflowClient()

        # Get latest registered version
        versions = client.search_model_versions("name='filmy_implicit_model'")
        latest = max(versions, key=lambda v: int(v.version))

        # Mark this version as production
        client.set_model_version_tag(
            name="filmy_implicit_model",
            version=latest.version,
            key="stage",
            value="production"
        )

        logger.info(f"🔥 Model version {latest.version} tagged as PRODUCTION")

    logger.info("Training complete.")
    return run_id


if __name__ == "__main__":
    train()
