from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from collections import defaultdict

from app.model_handlers.movie_handler import MovieHandler
from app.model_handlers.user_handler import UserResponse
from app.model_handlers.user_feedback_handler import (
    UserFeedbackHandler,
    UserFeedbackCreate,
    UserFeedbackUpdate,
)
from app.routes import AppResponse
from app.core.db import get_global_db_session
from app.dependencies.auth import get_current_user

user_feedback_router = APIRouter(prefix="/feedbacks", tags=["user_feedback"])


@user_feedback_router.post("/", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_feedback(
    feedback_in: UserFeedbackCreate,
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Create or update feedback for a movie by the current user.
    """
    feedback_handler = UserFeedbackHandler(db)

    # attach current user ID
    user_id = current_user.id
    movie_id = feedback_in.movie_id

    existing = feedback_handler.get_by_user_movie(user_id=user_id, movie_id=movie_id)

    if existing:
        updated = feedback_handler.update(existing.id, UserFeedbackUpdate(rating=feedback_in.rating, review=feedback_in.review, status=feedback_in.status))
        return AppResponse(
            status="success",
            message="Feedback updated successfully",
            data=updated,
        )

    feedback = UserFeedbackCreate(
        user_id=user_id,
        movie_id=feedback_in.movie_id,
        rating=feedback_in.rating,
        review=feedback_in.review,
        status=feedback_in.status
    )
    created = feedback_handler.create(feedback)

    return AppResponse(
        status="success",
        message="Feedback created successfully",
        data=created,
    )


@user_feedback_router.get("/", response_model=AppResponse)
async def get_my_feedbacks(
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Get all feedbacks given by the current logged-in user.
    """
    feedback_handler = UserFeedbackHandler(db)
    feedbacks = feedback_handler.get_user_feedbacks(current_user.id)

    return AppResponse(
        status="success",
        message="Your feedbacks fetched successfully",
        data=feedbacks,
    )

@user_feedback_router.get("/stats", response_model=AppResponse)
async def get_user_stats(
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
):
    handler = UserFeedbackHandler(db)
    movie_handler = MovieHandler(db)

    stats = handler.get_user_stats(current_user.id, movie_handler)

    return AppResponse(
        status="success",
        message="User stats fetched successfully",
        data=stats,
    )

@user_feedback_router.get("/genre-distribution", response_model=AppResponse)
def genre_distribution(
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user)
):
    user_id = current_user.id
    uf = UserFeedbackHandler(db)
    movie_handler = MovieHandler(db)
    feedbacks = uf.get_user_feedbacks(user_id)
    counts = defaultdict(int)
    for fb in feedbacks:
        if fb.status != "watched":
            continue
        m = movie_handler.get_by_id_raw(fb.movie_id)
        if not m:
            continue
        for g in (m.genres or "").split(","):
            name = g.strip()
            if name:
                counts[name] += 1
    data = [{"name": k, "value": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]
    return AppResponse(
        status="success",
        message="User genre distribution",
        data=data
    )


@user_feedback_router.get("/{movie_id}", response_model=AppResponse)
async def get_my_feedback_for_movie(
    movie_id: int,
    db: Session = Depends(get_global_db_session),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Get current user's feedback for a specific movie.
    """
    feedback_handler = UserFeedbackHandler(db)
    feedback = feedback_handler.get_by_user_movie(current_user.id, movie_id)

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return AppResponse(
        status="success",
        message="Feedback fetched successfully",
        data=feedback,
    )
