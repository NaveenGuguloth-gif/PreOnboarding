from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from backend.settings import settings
from backend.db_manager import client

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
users_collection = client[settings.DB_NAME]["users"] if client is not None else None

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str):
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
