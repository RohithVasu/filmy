from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------
# Password utils
# ---------------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password):
    return pwd_context.hash(password)

# ---------------------------
# Token creation
# ---------------------------
def create_token(data: dict, expires_delta: timedelta, secret_key: str):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret_key, algorithm=settings.auth.algorithm)

def create_access_token(data: dict):
    return create_token(
        data, timedelta(minutes=settings.auth.access_token_expire_minutes), settings.auth.secret_key
    )

def create_refresh_token(data: dict):
    return create_token(
        data, timedelta(days=settings.auth.refresh_token_expire_days), settings.auth.refresh_secret_key
    )

# ---------------------------
# Token decoding
# ---------------------------
def decode_token(token: str, refresh: bool = False):
    try:
        secret = settings.auth.refresh_secret_key if refresh else settings.auth.secret_key
        return jwt.decode(token, secret, algorithms=[settings.auth.algorithm])
    except JWTError:
        return None
        