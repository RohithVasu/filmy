from typing import Any


from sqlalchemy import Column, TIMESTAMP, String, Integer, ForeignKey, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.base import Base

class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Float)  # 1–5 scale
    review = Column(String)
    status = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="_user_movie_uc"),)

    # relationships
    user = relationship("User", back_populates="feedbacks")
    movie = relationship("Movie", back_populates="feedbacks")

