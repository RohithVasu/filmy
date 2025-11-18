from sqlalchemy import Column, TIMESTAMP, String, Text, Integer, JSON
from app.core.base import Base


class TrainedModel(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50))
    trained_on = Column(TIMESTAMP(timezone=True))
    dataset_version = Column(String(100))
    metrics = Column(JSON)
    status = Column(String(50))  # e.g., 'production', 'rejected'
    model_path = Column(Text)
    notes = Column(Text)