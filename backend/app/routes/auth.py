from fastapi import APIRouter, Depends, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from app.services.auth_service import AuthService
from app.core.db import get_global_db_session
from app.routes import AppResponse
from app.model_handlers.user_handler import UserResponse, UserCreate
from app.dependencies.auth import get_current_user
from app.utils.auth import create_access_token

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/register", response_model=AppResponse, status_code=201)
def register(
    user: UserCreate,
    db: Session = Depends(get_global_db_session)
):
    new_user = AuthService(db).register(user)
    return AppResponse(
        status="success",
        message="User registered",
        data={"email": new_user.email}
    )

@auth_router.post("/login", response_model=AppResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_global_db_session)
):
    tokens = AuthService(db).login(form_data.username, form_data.password)
    return AppResponse(
        status="success",
        message="Login successful",
        data=tokens
    )

@auth_router.post("/login/token") # for swagger auth
async def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    token = create_access_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}


@auth_router.post("/refresh", response_model=AppResponse)
def refresh(refresh_token: str = Form(...), db: Session = Depends(get_global_db_session)):
    new_access = AuthService(db).refresh(refresh_token)
    return AppResponse(
        status="success",
        message="Token refreshed",
        data=new_access
    )

@auth_router.get("/me", response_model=AppResponse)
async def read_users_me(
    current_user: Annotated[UserResponse, Depends(get_current_user)]
):
    return AppResponse(
        status="success",
        message="User fetched successfully",
        data=current_user
    )