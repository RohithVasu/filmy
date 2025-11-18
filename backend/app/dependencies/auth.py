from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.db import get_global_db_session
from app.utils.auth import decode_token
from app.model_handlers.user_handler import UserHandler, UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login/token")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_global_db_session)
) -> UserResponse:
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = UserHandler(db).get_by_email(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user