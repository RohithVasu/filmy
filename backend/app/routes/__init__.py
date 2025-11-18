from pydantic import BaseModel
from typing import Any, Optional

class AppResponse(BaseModel):
    status: str
    message: str
    data: Optional[Any] = None