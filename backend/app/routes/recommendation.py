from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.db import get_global_db_session
from app.services.recommendation_service import RecommendationService
from app.dependencies.auth import get_current_user
from app.routes import AppResponse

recommendation_router = APIRouter(prefix="/recommendations", tags=["recommendations"])


# ------------------------------
# 🎬 Guest Mode (Content-Based)
# ------------------------------
@recommendation_router.get("/guest", response_model=AppResponse)
def guest_recommendations(
    db: Session = Depends(get_global_db_session),
    genres: Optional[List[str]] = Query(None, description="List of genres (max 3)"),
    examples: Optional[List[str]] = Query(None, description="Example movie names user liked"),
    limit: int = Query(10, description="Number of recommendations"),
):
    """
    🎬 Get movie recommendations for guest users.
    - If `genres` → DB search (filter + popularity)
    - If `examples` → Qdrant vector search
    - Otherwise → Popular fallback
    """
    rec_service = RecommendationService(db)
    movies = rec_service.guest_recommendations(
        genres=genres,
        examples=examples,
        limit=limit,
    )

    return AppResponse(
        status="success",
        message="Guest recommendations generated successfully",
        data=movies,
    )


# ------------------------------
# 👤 Personalized (Logged-in)
# ------------------------------
@recommendation_router.get("/personalized", response_model=AppResponse)
def personalized_recommendations(
    db: Session = Depends(get_global_db_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Get personalized movie recommendations for logged-in users.
    Uses LightFM user embeddings.
    """
    rec_service = RecommendationService(db)
    movies = rec_service.personalized_recommendations(current_user["id"])
    return AppResponse(
        status="success",
        message="Personalized recommendations generated successfully",
        data=movies,
    )


# ------------------------------
# ⚙️ Hybrid (Personalized + Context)
# ------------------------------
@recommendation_router.post("/hybrid", response_model=AppResponse)
def hybrid_recommendations(
    query: str = Query(..., description="User query like mood, genre, or example movie"),
    db: Session = Depends(get_global_db_session),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(10)
):
    """
    Get hybrid recommendations combining user preference (LightFM)
    and contextual search (Qdrant).
    """
    rec_service = RecommendationService(db)
    movies = rec_service.hybrid_recommendations(current_user["id"], query, limit)
    return AppResponse(
        status="success",
        message="Hybrid recommendations generated successfully",
        data=movies,
    )
