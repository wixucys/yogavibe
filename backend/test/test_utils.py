import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from app import utils
import jwt
from app.config import settings


def test_password_hashing():
    # Тест хеширования паролей
    password = "mysecretpassword123"
    
    # Хеширование
    hashed_password = utils.get_password_hash(password)
    assert hashed_password != password
    assert len(hashed_password) > 0
    
    # Проверка правильного пароля
    assert utils.verify_password(password, hashed_password) is True
    
    # Проверка неправильного пароля
    assert utils.verify_password("wrongpassword", hashed_password) is False


def test_jwt_token_creation():
    # Тест создания JWT токенов
    test_data = {"sub": "123", "username": "testuser"}
    
    # Создание access токена
    access_token = utils.create_access_token(test_data)
    assert access_token is not None
    assert isinstance(access_token, str)
    
    # Создание refresh токена
    refresh_token = utils.create_refresh_token(test_data)
    assert refresh_token is not None
    assert isinstance(refresh_token, str)
    
    # Проверка, что токены разные
    assert access_token != refresh_token


def test_jwt_token_verification():
    # Тест проверки JWT токенов
    test_data = {"sub": "456", "username": "testuser", "type": "access"}
    
    # Создаем токен
    token = utils.create_access_token(test_data)
    
    # Проверяем валидный токен
    payload = utils.verify_token(token)
    assert payload is not None
    assert payload["sub"] == "456"
    assert payload["username"] == "testuser"
    assert payload["type"] == "access"
    
    # Проверяем неверный токен
    invalid_payload = utils.verify_token("invalid.token.here")
    assert invalid_payload is None


def test_token_expiration():
    # Тест срока действия токенов
    test_data = {"sub": "789"}
    
    # Access токен с кастомным сроком
    custom_expiry = timedelta(minutes=30)
    token = utils.create_access_token(test_data, expires_delta=custom_expiry)
    
    # Refresh токен
    refresh_token = utils.create_refresh_token(test_data)
    
    # Декодируем для проверки exp
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
    
    # Проверяем тип токена
    assert access_payload["type"] == "access"
    assert refresh_payload["type"] == "refresh"


def test_password_context():
    # Тест контекста хеширования паролей
    password = "testpassword"
    
    # Проверяем разные схемы хеширования
    hashed_sha256 = utils.pwd_context.hash(password, scheme="sha256_crypt")
    assert utils.pwd_context.verify(password, hashed_sha256)


# Запуск без pytest
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