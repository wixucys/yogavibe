#!/usr/bin/env python3
"""
Простой тест для проверки работы схемы авторизации с двумя токенами
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app import crud
from sqlalchemy.orm import Session

def setup_test_data(db: Session):
    """Создает тестового пользователя"""
    # Очищаем базу
    db.execute("DELETE FROM refresh_tokens")
    db.execute("DELETE FROM users")
    db.commit()

    # Создаем пользователя
    from app.schemas import UserCreate
    user = crud.user_crud.create_user(
        db,
        UserCreate(username="testuser", email="test@example.com", password="testpass123"),
        role="user",
        is_active=True
    )
    return user

def test_login_creates_tokens():
    """Тест: вход создает токены"""
    print("🧪 Тест: Вход создает токены")

    with TestClient(app) as client:
        # Создаем тестового пользователя
        db = next(get_db())
        user = setup_test_data(db)

        # Пытаемся войти
        response = client.post("/api/v1/auth/login", json={
            "login": "testuser",
            "password": "testpass123"
        })

        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()

        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data

        print("✅ Login создал токены")

        # Проверяем, что токен сохранен в БД
        result = db.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        count = result.fetchone()[0]
        assert count == 1, f"Expected 1 active token, got {count}"
        print("✅ Refresh токен сохранен в БД")

def test_login_revokes_previous_tokens():
    """Тест: повторный вход отзывает предыдущие токены"""
    print("🧪 Тест: Повторный вход отзывает предыдущие токены")

    with TestClient(app) as client:
        db = next(get_db())
        user = setup_test_data(db)

        # Первый вход
        response1 = client.post("/api/v1/auth/login", json={
            "login": "testuser",
            "password": "testpass123"
        })
        assert response1.status_code == 200

        # Проверяем, что есть активный токен
        result = db.execute("SELECT id FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        tokens = result.fetchall()
        assert len(tokens) == 1
        first_token_id = tokens[0][0]

        # Второй вход (повторный)
        response2 = client.post("/api/v1/auth/login", json={
            "login": "testuser",
            "password": "testpass123"
        })
        assert response2.status_code == 200

        # Проверяем, что первый токен деактивирован
        result = db.execute("SELECT is_active FROM refresh_tokens WHERE id = ?", (first_token_id,))
        is_active = result.fetchone()[0]
        assert is_active == 0, "Previous token should be deactivated"

        # Проверяем, что есть новый активный токен
        result = db.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        count = result.fetchone()[0]
        assert count == 1, f"Expected 1 active token after re-login, got {count}"

        print("✅ Повторный вход отозвал предыдущие токены")

def test_password_change_revokes_tokens():
    """Тест: смена пароля отзывает токены"""
    print("🧪 Тест: Смена пароля отзывает токены")

    with TestClient(app) as client:
        db = next(get_db())
        user = setup_test_data(db)

        # Вход
        response = client.post("/api/v1/auth/login", json={
            "login": "testuser",
            "password": "testpass123"
        })
        assert response.status_code == 200
        tokens = response.json()

        # Проверяем, что токен активен
        result = db.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        count = result.fetchone()[0]
        assert count == 1

        # Меняем пароль через API
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        update_response = client.put("/api/v1/users/me", json={
            "password": "newpassword123"
        }, headers=headers)
        assert update_response.status_code == 200

        # Проверяем, что токен отозван
        result = db.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        count_after = result.fetchone()[0]
        assert count_after == 0, "Token should be revoked after password change"

        print("✅ Смена пароля отозвала токены")

def test_user_deactivation_revokes_tokens():
    """Тест: деактивация пользователя отзывает токены"""
    print("🧪 Тест: Деактивация пользователя отзывает токены")

    with TestClient(app) as client:
        db = next(get_db())
        user = setup_test_data(db)

        # Создаем админа для теста
        admin = crud.user_crud.create_user(
            db,
            crud.schemas.UserCreate(username="admin", email="admin@example.com", password="admin123"),
            role="admin",
            is_active=True
        )

        # Вход как пользователь
        user_response = client.post("/api/v1/auth/login", json={
            "login": "testuser",
            "password": "testpass123"
        })
        assert user_response.status_code == 200

        # Вход как админ
        admin_response = client.post("/api/v1/auth/login", json={
            "login": "admin",
            "password": "admin123"
        })
        assert admin_response.status_code == 200
        admin_tokens = admin_response.json()

        # Админ деактивирует пользователя
        headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}
        deactivate_response = client.put(f"/api/v1/admin/users/{user.id}", json={
            "is_active": False
        }, headers=headers)
        assert deactivate_response.status_code == 200

        # Проверяем, что токены пользователя отозваны
        result = db.execute("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND is_active = 1", (user.id,))
        active_count = result.fetchone()[0]
        assert active_count == 0, "All user tokens should be revoked after deactivation"

        print("✅ Деактивация пользователя отозвала токены")

if __name__ == "__main__":
    print("🚀 Запуск тестов авторизации...")
    print("=" * 50)

    try:
        test_login_creates_tokens()
        test_login_revokes_previous_tokens()
        test_password_change_revokes_tokens()
        test_user_deactivation_revokes_tokens()

        print("=" * 50)
        print("✅ Все тесты авторизации пройдены успешно!")

    except Exception as e:
        print(f"❌ Ошибка в тесте: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)