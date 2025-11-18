from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import NoResultFound

from . import CRUDManager
from app.models.models import TrainedModel


# ---------- Pydantic Schemas ----------
class TrainedModelCreate(BaseModel):
    version: str = Field(..., description="Model version string")
    trained_on: Optional[datetime] = Field(None, description="Training timestamp")
    dataset_version: Optional[str] = Field(None, description="Dataset version used")
    metrics: Optional[Dict] = Field(default_factory=dict, description="Training metrics")
    status: Optional[str] = Field("staging", description="Model status (production, rejected, etc.)")
    model_path: Optional[str] = Field(None, description="Path to saved model")
    notes: Optional[str] = Field(None, description="Developer notes")


class TrainedModelUpdate(BaseModel):
    version: Optional[str] = None
    trained_on: Optional[datetime] = None
    dataset_version: Optional[str] = None
    metrics: Optional[Dict] = None
    status: Optional[str] = None
    model_path: Optional[str] = None
    notes: Optional[str] = None


class TrainedModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: str
    trained_on: Optional[datetime]
    dataset_version: Optional[str]
    metrics: Optional[Dict]
    status: Optional[str]
    model_path: Optional[str]
    notes: Optional[str]


# ---------- Handler ----------
class TrainedModelHandler(CRUDManager[TrainedModel, TrainedModelCreate, TrainedModelUpdate, TrainedModelResponse]):
    def __init__(self, db: Session):
        super().__init__(db=db, model=TrainedModel, response_schema=TrainedModelResponse)

    def create(self, obj_in: TrainedModelCreate) -> TrainedModelResponse:
        return super().create(obj_in)

    def read(self, id: int) -> TrainedModelResponse:
        return super().read(id)
        
    def update(self, id: int, obj_in: TrainedModelUpdate) -> TrainedModelResponse:
        return super().update(id, obj_in)
        
    def delete(self, id: int) -> dict:
        return super().delete(id)
    
    def list_all(self, skip: int = 0, limit: int = 20) -> List[TrainedModelResponse]:
        return super().list_all(skip, limit)

    def get_latest(self, status: str = "production") -> Optional[TrainedModelResponse]:
        """Get the most recent trained model for a given status."""
        try:
            model = (
                self._db.query(TrainedModel)
                .filter(TrainedModel.status == status)
                .order_by(TrainedModel.trained_on.desc())
                .first()
            )
            return TrainedModelResponse.model_validate(model) if model else None
        except NoResultFound:
            return None
