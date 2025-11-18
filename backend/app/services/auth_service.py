from fastapi import HTTPException
from app.utils.auth import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.model_handlers.user_handler import UserHandler, UserCreate

class AuthService:
    def __init__(self, db):
        self.user_handler = UserHandler(db)

    def register(self, user_data: UserCreate):
        if self.user_handler.get_by_email(user_data.email):
            raise HTTPException(400, "Email already registered")

        user_data.hashed_password = hash_password(user_data.hashed_password)

        return self.user_handler.create(user_data)


    def login(self, email: str, password: str):
        user = self.user_handler.get_by_email(email, with_password=True)
        if not user:
            raise HTTPException(401, "User not found")

        if not verify_password(password, user.hashed_password):
            raise HTTPException(401, "Invalid credentials")

        return {
            "access_token": create_access_token({"sub": user.email}),
            "refresh_token": create_refresh_token({"sub": user.email}),
            "token_type": "bearer"
        }


    def refresh(self, refresh_token: str):
        payload = decode_token(refresh_token, refresh=True)
        if not payload or "sub" not in payload:
            raise HTTPException(401, "Invalid refresh token")
        email = payload["sub"]
        return {
            "access_token": create_access_token({"sub": email}),
            "token_type": "bearer"
        }
