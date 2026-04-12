import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import pytest
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
from app import schemas


def test_user_create_schema():
    user_data = {
        "username": "testuser",
        "email": "TEST@EXAMPLE.COM",
        "password": "securepassword123"
    }
    
    user = schemas.UserCreate(**user_data)
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.password == "securepassword123"
    
    try:
        schemas.UserCreate(username="", email="invalid", password="")
        assert False, "Должна быть ошибка валидации"
    except ValidationError:
        pass


def test_user_response_schema():
    user_data = {
        "id": 1,
        "username": "yogalover",
        "email": "yoga@example.com",
        "city": "Москва",
        "yoga_style": "Хатха",
        "experience": "Средний",
        "goals": "Гибкость",
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    user = schemas.UserResponse(**user_data)
    assert user.id == 1
    assert user.username == "yogalover"
    assert user.is_active is True


def test_login_request_schema():
    login_data = {
        "login": "user@example.com",
        "password": "password123"
    }
    
    login = schemas.LoginRequest(**login_data)
    assert login.login == "user@example.com"
    assert login.password == "password123"


def test_mentor_response_schema():
    mentor_data = {
        "id": 1,
        "name": "Анна Петрова",
        "description": "Опытный инструктор",
        "gender": "female",
        "city": "Москва",
        "price": 2000,
        "yoga_style": "Хатха",
        "rating": 4.8,
        "experience_years": 5,
        "photo_url": None,
        "is_available": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    mentor = schemas.MentorResponse(**mentor_data)
    assert mentor.id == 1
    assert mentor.name == "Анна Петрова"
    assert mentor.price == 2000
    assert mentor.is_available is True


def test_note_create_schema():
    note = schemas.NoteCreate(text="Важная заметка о практике")
    assert note.text == "Важная заметка о практике"
    
    try:
        schemas.NoteCreate(text="")
        assert False, "Должна быть ошибка валидации"
    except ValidationError:
        pass


def test_note_response_schema():
    note_data = {
        "id": 1,
        "user_id": 1,
        "text": "Тестовая заметка",
        "created_at": datetime.now(timezone.utc),
        "updated_at": None
    }
    
    note = schemas.NoteResponse(**note_data)
    
    assert isinstance(note.created_at, str)
    assert note.updated_at is None


def test_booking_create_schema():
    booking_data = {
        "mentor_id": 1,
        "session_date": datetime.now(timezone.utc) + timedelta(days=1),
        "duration_minutes": 90,
        "notes": "Нужен коврик"
    }
    
    booking = schemas.BookingCreate(**booking_data)
    assert booking.mentor_id == 1
    assert booking.duration_minutes == 90
    assert booking.notes == "Нужен коврик"


def test_auth_response_schema():
    user_data = {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "city": None,
        "yoga_style": None,
        "experience": None,
        "goals": None,
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    user = schemas.UserResponse(**user_data)
    
    auth_data = {
        "access_token": "access_token_123",
        "refresh_token": "refresh_token_456",
        "token_type": "bearer",
        "user": user
    }
    
    auth = schemas.AuthResponse(**auth_data)
    assert auth.access_token == "access_token_123"
    assert auth.refresh_token == "refresh_token_456"
    assert auth.token_type == "bearer"
    assert auth.user.username == "testuser"


if __name__ == "__main__":
    print("Запуск тестов схем...")
    try:
        test_user_create_schema()
        print("✅ test_user_create_schema: OK")
        test_user_response_schema()
        print("✅ test_user_response_schema: OK")
        test_login_request_schema()
        print("✅ test_login_request_schema: OK")
        test_mentor_response_schema()
        print("✅ test_mentor_response_schema: OK")
        test_note_create_schema()
        print("✅ test_note_create_schema: OK")
        test_note_response_schema()
        print("✅ test_note_response_schema: OK")
        test_booking_create_schema()
        print("✅ test_booking_create_schema: OK")
        test_auth_response_schema()
        print("✅ test_auth_response_schema: OK")
        print("✅ Все тесты схем пройдены успешно!")
    except AssertionError as e:
        print(f"❌ Ошибка в тесте: {e}")
    except ValidationError as e:
        print(f"❌ Ошибка валидации: {e.errors()}")
