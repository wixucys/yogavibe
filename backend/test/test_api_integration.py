import base64
from datetime import datetime, timedelta, timezone

import pytest

from app import schemas
from app.services import weather_service

pytestmark = pytest.mark.integration


def test_register_login_and_get_me_contract(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "new_user",
            "email": "new_user@example.com",
            "password": "pass123",
        },
    )

    assert register_response.status_code == 200
    register_data = register_response.json()
    assert {"access_token", "refresh_token", "token_type", "user"}.issubset(register_data.keys())

    me_response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {register_data['access_token']}"},
    )
    assert me_response.status_code == 200

    me_data = me_response.json()
    assert {
        "id",
        "username",
        "email",
        "role",
        "is_active",
        "created_at",
    }.issubset(me_data.keys())


def test_refresh_with_invalid_token_returns_401_and_error_payload(client):
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid_token"})

    assert response.status_code == 401
    data = response.json()
    assert data["status"] == 401
    assert "detail" in data
    assert data["path"] == "/api/v1/auth/refresh"


def test_protected_endpoint_without_token_returns_403(client):
    response = client.get("/api/v1/users/me")

    assert response.status_code == 403
    data = response.json()
    assert data["status"] == 403
    assert data["path"] == "/api/v1/users/me"


def test_get_mentors_returns_paginated_shape(client, db_session, auth_headers_factory, mentor_factory):
    mentor_factory()
    _, headers = auth_headers_factory(role="user")

    response = client.get("/api/v1/mentors?page=1&page_size=10", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert "items" in data and isinstance(data["items"], list)
    assert "meta" in data and isinstance(data["meta"], dict)
    assert {"page", "page_size", "total", "pages"}.issubset(data["meta"].keys())


def test_get_mentors_with_invalid_page_returns_422(client, auth_headers_factory):
    _, headers = auth_headers_factory(role="user")

    response = client.get("/api/v1/mentors?page=0", headers=headers)

    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)


def test_create_booking_in_past_returns_400(client, auth_headers_factory, mentor_factory):
    _, mentor = mentor_factory(is_available=True)
    _, headers = auth_headers_factory(role="user")

    response = client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "mentor_id": mentor.id,
            "session_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
            "notes": "bad date",
            "session_type": "individual",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "будущ" in data["detail"].lower()


def test_create_note_with_too_long_text_returns_422(client, auth_headers_factory):
    _, headers = auth_headers_factory(role="user")

    response = client.post("/api/v1/notes", headers=headers, json={"text": "x" * 1001})

    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)


def test_user_cannot_access_admin_dashboard(client, auth_headers_factory):
    _, headers = auth_headers_factory(role="user")

    response = client.get("/api/v1/admin/dashboard", headers=headers)

    assert response.status_code == 403
    data = response.json()
    assert "недостаточно прав" in data["detail"].lower()


def test_upload_file_with_signature_mismatch_returns_415(client, auth_headers_factory):
    _, headers = auth_headers_factory(role="user")
    txt_b64 = base64.b64encode(b"plain text").decode("utf-8")

    response = client.post(
        "/api/v1/users/me/files",
        headers=headers,
        json={
            "filename": "image.png",
            "content_base64": txt_b64,
            "mime_type": "image/png",
            "category": "avatar",
        },
    )

    assert response.status_code == 415
    data = response.json()
    assert "не соответствует" in data["detail"].lower()


def test_weather_forecast_endpoint_contract(client, auth_headers_factory, monkeypatch):
    async def fake_forecast(city: str, date=None):
        return schemas.WeatherForecast(
            city=city,
            country="RU",
            datetime_utc=datetime.now(timezone.utc),
            temperature_celsius=25.0,
            feels_like_celsius=24.5,
            humidity_percent=50,
            wind_speed_ms=3.2,
            condition="Clear",
            description="ясно",
            icon_code="0",
            is_outdoor_suitable=True,
        )

    monkeypatch.setattr(weather_service.WeatherService, "get_forecast", staticmethod(fake_forecast))

    _, headers = auth_headers_factory(role="user")
    response = client.get("/api/v1/weather/forecast?city=Moscow", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert {
        "city",
        "country",
        "datetime_utc",
        "temperature_celsius",
        "feels_like_celsius",
        "humidity_percent",
        "wind_speed_ms",
        "condition",
        "description",
        "icon_code",
        "is_outdoor_suitable",
    }.issubset(data.keys())
