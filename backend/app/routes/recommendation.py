from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.db import get_global_db_session
from app.services.recommendation_service import RecommendationService
from app.model_handlers.user_handler import UserResponse
from app.dependencies.auth import get_current_user
from app.routes import AppResponse

recommendation_router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@recommendation_router.get("/guest", response_model=AppResponse)
def guest_recommendations(
    genres: Optional[List[str]] = Query(None),
    examples: Optional[List[str]] = Query(None),
    limit: int = Query(10),
    db: Session = Depends(get_global_db_session)
):
    service = RecommendationService(db)
    movies = service.guest_recommendations(genres=genres, examples=examples, limit=limit)
    return AppResponse(
        status="success",
        message="Guest recommendations",
        data=movies
    )

@recommendation_router.get("/personalized", response_model=AppResponse)
def personalized_recommendations(
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
    limit: int = Query(10),
):
    service = RecommendationService(db)
    movies = service.personalized_recommendations(current_user.id, limit=limit)
    return AppResponse(
        status="success",
        message="Personalized recommendations",
        data=movies
    )

@recommendation_router.get("/recent", response_model=AppResponse)
def recent_activity_recommendations(
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
    limit: int = Query(12),
):
    service = RecommendationService(db)
    movies = service.recommendations_based_on_recent_activity(current_user.id, limit=limit)
    return AppResponse(
        status="success",
        message="Recommendations based on recent activity",
        data=movies
    )

@recommendation_router.get("/search", response_model=AppResponse)
def search_recommendations(
    query: str = Query(...),
    limit: int = Query(20),
    db: Session = Depends(get_global_db_session),
    current_user: Optional[UserResponse] = Depends(get_current_user),
):
    service = RecommendationService(db)
    user_id = current_user.id if current_user else None
    movies = service.search_recommendations(query=query, limit=limit, user_id=user_id)
    return AppResponse(
        status="success",
        message=f"Search results for '{query}'",
        data=movies
    )
