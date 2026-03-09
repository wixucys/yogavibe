from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
import jwt
from passlib.context import CryptContext
from config import settings


# Хеширование паролей - используем sha256_crypt

pwd_context = CryptContext(
    schemes=["sha256_crypt", "bcrypt"],
    deprecated="auto",
    sha256_crypt__default_rounds=29000
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Проверка пароля
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    # Получение хеша пароля
    return pwd_context.hash(password)


# Функции для работы с JWT

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    # Создание access токена
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict) -> str:
    # Создание refresh токена
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict]:
    # Проверка токена
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None