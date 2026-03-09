import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app import models_db as models


@pytest.fixture(scope="function")
def db_session():
    # Создаем тестовую БД в памяти
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = Session(engine)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_user_model(db_session):
    # Тест модели User
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password_123",
        city="Москва",
        yoga_style="Хатха",
        experience="Начинающий",
        goals="Расслабление"
    )
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Проверяем поля
    assert user.id is not None
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.city == "Москва"
    assert user.is_active is True
    assert isinstance(user.created_at, datetime)


def test_mentor_model(db_session):
    # Тест модели Mentor
    mentor = models.Mentor(
        name="Анна Петрова",
        description="Опытный инструктор",
        gender="female",
        city="Москва",
        price=2000,
        yoga_style="Хатха",
        rating=4.8,
        experience_years=5,
        photo_url="https://example.com/photo.jpg",
        is_available=True
    )
    
    db_session.add(mentor)
    db_session.commit()
    db_session.refresh(mentor)
    
    assert mentor.id is not None
    assert mentor.name == "Анна Петрова"
    assert mentor.price == 2000
    assert mentor.is_available is True
    assert mentor.rating == 4.8


def test_note_model(db_session):
    # Тест модели Note
    # Сначала создаем пользователя
    user = models.User(
        username="testuser2",
        email="test2@example.com",
        hashed_password="hashed_password_456"
    )
    db_session.add(user)
    db_session.commit()
    
    # Создаем заметку
    note = models.Note(
        text="Моя первая заметка о йоге",
        user_id=user.id
    )
    
    db_session.add(note)
    db_session.commit()
    db_session.refresh(note)
    
    assert note.id is not None
    assert note.text == "Моя первая заметка о йоге"
    assert note.user_id == user.id
    assert note.user == user


def test_booking_model(db_session):
    # Тест модели Booking
    # Создаем пользователя и ментора
    user = models.User(
        username="client",
        email="client@example.com",
        hashed_password="hashed_password_789"
    )
    
    mentor = models.Mentor(
        name="Иван Сидоров",
        description="Мастер виньяса йоги",
        gender="male",
        city="Санкт-Петербург",
        price=2500,
        yoga_style="Виньяса"
    )
    
    db_session.add_all([user, mentor])
    db_session.commit()
    
    # Создаем бронирование
    session_date = datetime.now(timezone.utc) + timedelta(days=1)
    booking = models.Booking(
        user_id=user.id,
        mentor_id=mentor.id,
        session_date=session_date,
        duration_minutes=90,
        price=3750,
        status="pending",
        notes="Нужен коврик"
    )
    
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    
    assert booking.id is not None
    assert booking.price == 3750
    assert booking.status == "pending"
    assert booking.user == user
    assert booking.mentor == mentor


def test_refresh_token_model(db_session):
    # Тест модели RefreshToken
    # Создаем пользователя
    user = models.User(
        username="tokenuser",
        email="token@example.com",
        hashed_password="hashed_password_999"
    )
    db_session.add(user)
    db_session.commit()
    
    # Создаем refresh токен
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    refresh_token = models.RefreshToken(
        token="test_refresh_token_123",
        user_id=user.id,
        expires_at=expires_at,
        is_active=True
    )
    
    db_session.add(refresh_token)
    db_session.commit()
    db_session.refresh(refresh_token)
    
    assert refresh_token.id is not None
    assert refresh_token.token == "test_refresh_token_123"
    assert refresh_token.is_active is True
    assert refresh_token.user == user


# Запуск без pytest
if __name__ == "__main__":
    print("Запуск тестов моделей...")
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    session = Session(test_engine)
    
    try:
        test_user_model(session)
        print("✅ test_user_model: OK")
        test_mentor_model(session)
        print("✅ test_mentor_model: OK")
        test_note_model(session)
        print("✅ test_note_model: OK")
        test_booking_model(session)
        print("✅ test_booking_model: OK")
        test_refresh_token_model(session)
        print("✅ test_refresh_token_model: OK")
        print("✅ Все тесты моделей пройдены успешно!")
    except AssertionError as e:
        print(f"❌ Ошибка в тесте: {e}")
    finally:
        session.close()