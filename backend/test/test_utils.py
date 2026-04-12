import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from app import utils
import jwt
from app.config import settings


def test_password_hashing():
    password = "mysecretpassword123"
    
    hashed_password = utils.get_password_hash(password)
    assert hashed_password != password
    assert len(hashed_password) > 0
    
    assert utils.verify_password(password, hashed_password) is True
    
    assert utils.verify_password("wrongpassword", hashed_password) is False


def test_jwt_token_creation():
    test_data = {"sub": "123", "username": "testuser"}
    
    access_token = utils.create_access_token(test_data)
    assert access_token is not None
    assert isinstance(access_token, str)
    
    refresh_token = utils.create_refresh_token(test_data)
    assert refresh_token is not None
    assert isinstance(refresh_token, str)
    
    assert access_token != refresh_token


def test_jwt_token_verification():
    test_data = {"sub": "456", "username": "testuser", "type": "access"}
    
    token = utils.create_access_token(test_data)
    
    payload = utils.verify_token(token)
    assert payload is not None
    assert payload["sub"] == "456"
    assert payload["username"] == "testuser"
    assert payload["type"] == "access"
    
    invalid_payload = utils.verify_token("invalid.token.here")
    assert invalid_payload is None


def test_token_expiration():
    test_data = {"sub": "789"}
    
    custom_expiry = timedelta(minutes=30)
    token = utils.create_access_token(test_data, expires_delta=custom_expiry)
    
    refresh_token = utils.create_refresh_token(test_data)
    
    access_payload = jwt.decode(
        token, 
        settings.SECRET_KEY, 
        algorithms=[settings.ALGORITHM]
    )
    refresh_payload = jwt.decode(
        refresh_token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    
    assert access_payload["type"] == "access"
    assert refresh_payload["type"] == "refresh"


def test_password_context():
    password = "testpassword"
    
    hashed_sha256 = utils.pwd_context.hash(password, scheme="sha256_crypt")
    assert utils.pwd_context.verify(password, hashed_sha256)


if __name__ == "__main__":
    print("Запуск тестов утилит...")
    try:
        test_password_hashing()
        print("✅ test_password_hashing: OK")
        test_jwt_token_creation()
        print("✅ test_jwt_token_creation: OK")
        test_jwt_token_verification()
        print("✅ test_jwt_token_verification: OK")
        test_token_expiration()
        print("✅ test_token_expiration: OK")
        test_password_context()
        print("✅ test_password_context: OK")
        print("✅ Все тесты утилит пройдены успешно!")
    except AssertionError as e:
        print(f"❌ Ошибка в тесте: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {type(e).__name__}: {e}")
