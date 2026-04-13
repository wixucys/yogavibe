import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import HTTPException
import pytest

from app import crud, schemas
from app.config import settings
from app.services import weather_service

pytestmark = pytest.mark.e2e


PNG_1X1_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/w8AAn8B9p6LrwAAAABJRU5ErkJggg=="
)


def _register_and_login_user(client, username: str, email: str, password: str = "pass123"):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert response.status_code == 200
    payload = response.json()
    return payload


def _login(client, login: str, password: str = "pass123"):
    response = client.post(
        "/api/v1/auth/login",
        json={"login": login, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def _auth_headers(access_token: str):
    return {"Authorization": f"Bearer {access_token}"}


def test_e2e_auth_login_logout_and_session_recovery(client):
    auth = _register_and_login_user(
        client,
        username="session_user",
        email="session_user@example.com",
    )

    me_response = client.get("/api/v1/users/me", headers=_auth_headers(auth["access_token"]))
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "session_user"

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": auth["refresh_token"]},
    )
    assert refresh_response.status_code == 200
    refreshed_tokens = refresh_response.json()
    assert "access_token" in refreshed_tokens and "refresh_token" in refreshed_tokens

    me_after_refresh = client.get(
        "/api/v1/users/me",
        headers=_auth_headers(refreshed_tokens["access_token"]),
    )
    assert me_after_refresh.status_code == 200

    logout_response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refreshed_tokens["refresh_token"]},
    )
    assert logout_response.status_code == 200

    refresh_after_logout = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refreshed_tokens["refresh_token"]},
    )
    assert refresh_after_logout.status_code == 401
    assert "revoked" in refresh_after_logout.json()["detail"].lower()


def test_e2e_role_based_crud_operations(client, db_session):
    admin = crud.user_crud.create_user(
        db_session,
        schemas.UserCreate(
            username="admin_e2e",
            email="admin_e2e@example.com",
            password="pass123",
        ),
        role="admin",
        is_active=True,
    )
    mentor_user = crud.user_crud.create_user(
        db_session,
        schemas.UserCreate(
            username="mentor_e2e",
            email="mentor_e2e@example.com",
            password="pass123",
        ),
        role="mentor",
        is_active=True,
    )

    admin_tokens = _login(client, admin.username)

    create_mentor_response = client.post(
        "/api/v1/admin/mentors",
        headers=_auth_headers(admin_tokens["access_token"]),
        json={
            "user_id": mentor_user.id,
            "name": "Mentor E2E",
            "description": "Mentor for end-to-end checks",
            "gender": "female",
            "city": "Москва",
            "price": 2200,
            "yoga_style": "Хатха",
            "rating": 4.7,
            "experience_years": 7,
            "is_available": True,
        },
    )
    assert create_mentor_response.status_code == 200
    mentor_id = create_mentor_response.json()["id"]

    mentor_tokens = _login(client, mentor_user.username)

    mentor_profile_response = client.get(
        "/api/v1/mentor/me",
        headers=_auth_headers(mentor_tokens["access_token"]),
    )
    assert mentor_profile_response.status_code == 200
    assert mentor_profile_response.json()["id"] == mentor_id

    mentor_update_response = client.put(
        "/api/v1/mentor/me",
        headers=_auth_headers(mentor_tokens["access_token"]),
        json={"description": "Updated mentor profile", "is_available": False},
    )
    assert mentor_update_response.status_code == 200
    assert mentor_update_response.json()["is_available"] is False

    user_auth = _register_and_login_user(
        client,
        username="user_e2e",
        email="user_e2e@example.com",
    )

    create_note_response = client.post(
        "/api/v1/notes",
        headers=_auth_headers(user_auth["access_token"]),
        json={"text": "First note"},
    )
    assert create_note_response.status_code == 200
    note_id = create_note_response.json()["id"]

    get_note_response = client.get(
        f"/api/v1/notes/{note_id}",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert get_note_response.status_code == 200

    update_note_response = client.put(
        f"/api/v1/notes/{note_id}",
        headers=_auth_headers(user_auth["access_token"]),
        json={"text": "Updated note"},
    )
    assert update_note_response.status_code == 200
    assert update_note_response.json()["text"] == "Updated note"

    delete_note_response = client.delete(
        f"/api/v1/notes/{note_id}",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert delete_note_response.status_code == 200

    user_to_admin_endpoint = client.get(
        "/api/v1/admin/users",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert user_to_admin_endpoint.status_code == 403

    mentor_to_user_only_endpoint = client.get(
        "/api/v1/notes",
        headers=_auth_headers(mentor_tokens["access_token"]),
    )
    assert mentor_to_user_only_endpoint.status_code == 403

    delete_mentor_response = client.delete(
        f"/api/v1/admin/mentors/{mentor_id}",
        headers=_auth_headers(admin_tokens["access_token"]),
    )
    assert delete_mentor_response.status_code == 200


def test_e2e_filters_sorting_and_pagination(client, db_session):
    user_auth = _register_and_login_user(
        client,
        username="catalog_user",
        email="catalog_user@example.com",
    )

    mentor_specs = [
        ("mentor_cat_1", "mc1@example.com", "Москва", 1000, "Хатха"),
        ("mentor_cat_2", "mc2@example.com", "Москва", 2000, "Хатха"),
        ("mentor_cat_3", "mc3@example.com", "Москва", 3000, "Виньяса"),
        ("mentor_cat_4", "mc4@example.com", "Казань", 1500, "Хатха"),
    ]

    for idx, (username, email, city, price, style) in enumerate(mentor_specs, start=1):
        mentor_user = crud.user_crud.create_user(
            db_session,
            schemas.UserCreate(username=username, email=email, password="pass123"),
            role="mentor",
            is_active=True,
        )
        crud.mentor_crud.create_mentor(
            db_session,
            schemas.MentorCreate(
                user_id=mentor_user.id,
                name=f"Catalog Mentor {idx}",
                description="Catalog entry",
                gender="female" if idx % 2 else "male",
                city=city,
                price=price,
                yoga_style=style,
                rating=4.0 + idx * 0.1,
                experience_years=idx,
                is_available=True,
            ),
        )

    page_one_response = client.get(
        "/api/v1/mentors?page=1&page_size=2&city=Москва&sort_by=price&sort_order=asc",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert page_one_response.status_code == 200
    page_one = page_one_response.json()
    assert page_one["meta"]["page"] == 1
    assert page_one["meta"]["page_size"] == 2
    assert page_one["meta"]["total"] == 3
    assert [item["price"] for item in page_one["items"]] == [1000, 2000]

    page_two_response = client.get(
        "/api/v1/mentors?page=2&page_size=2&city=Москва&sort_by=price&sort_order=asc",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert page_two_response.status_code == 200
    page_two = page_two_response.json()
    assert page_two["meta"]["page"] == 2
    assert len(page_two["items"]) == 1
    assert page_two["items"][0]["price"] == 3000

    style_filtered_response = client.get(
        "/api/v1/mentors?page=1&page_size=10&city=Москва&yoga_style=Хатха&sort_by=price&sort_order=desc",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert style_filtered_response.status_code == 200
    style_filtered = style_filtered_response.json()
    assert [item["price"] for item in style_filtered["items"]] == [2000, 1000]

    invalid_range_response = client.get(
        "/api/v1/mentors?page=1&page_size=10&min_price=5000&max_price=1000",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert invalid_range_response.status_code == 422


def test_e2e_object_storage_file_upload_and_download(client, monkeypatch):
    monkeypatch.setattr(settings, "FILE_STORAGE_PROVIDER", "local")
    monkeypatch.setattr(settings, "STORAGE_PUBLIC_BASE_URL", "http://testserver")

    user_auth = _register_and_login_user(
        client,
        username="file_owner",
        email="file_owner@example.com",
    )
    second_user_auth = _register_and_login_user(
        client,
        username="file_other",
        email="file_other@example.com",
    )

    upload_response = client.post(
        "/api/v1/users/me/files",
        headers=_auth_headers(user_auth["access_token"]),
        json={
            "filename": "avatar.png",
            "content_base64": PNG_1X1_BASE64,
            "mime_type": "image/png",
            "category": "avatar",
        },
    )
    assert upload_response.status_code == 200
    uploaded_file = upload_response.json()
    file_id = uploaded_file["id"]

    get_url_response = client.get(
        f"/api/v1/files/{file_id}/download-url",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert get_url_response.status_code == 200

    download_url = get_url_response.json()["url"]
    parsed = urlparse(download_url)
    download_path_with_query = f"{parsed.path}?{parsed.query}"

    download_response = client.get(download_path_with_query)
    assert download_response.status_code == 200
    assert download_response.headers["content-type"].startswith("image/png")

    forbidden_url_response = client.get(
        f"/api/v1/files/{file_id}/download-url",
        headers=_auth_headers(second_user_auth["access_token"]),
    )
    assert forbidden_url_response.status_code == 403

    delete_response = client.delete(
        f"/api/v1/users/me/files/{file_id}",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert delete_response.status_code == 200

    missing_after_delete = client.get(
        f"/api/v1/files/{file_id}/download-url",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert missing_after_delete.status_code == 404


def test_e2e_third_party_api_success_and_failure_flows(client, db_session, monkeypatch):
    user_auth = _register_and_login_user(
        client,
        username="weather_user",
        email="weather_user@example.com",
    )

    mentor_user = crud.user_crud.create_user(
        db_session,
        schemas.UserCreate(
            username="weather_mentor",
            email="weather_mentor@example.com",
            password="pass123",
        ),
        role="mentor",
        is_active=True,
    )
    mentor = crud.mentor_crud.create_mentor(
        db_session,
        schemas.MentorCreate(
            user_id=mentor_user.id,
            name="Weather Mentor",
            description="Mentor with weather dependency",
            gender="female",
            city="Москва",
            price=2500,
            yoga_style="Хатха",
            rating=4.9,
            experience_years=9,
            is_available=True,
        ),
    )

    booking_response = client.post(
        "/api/v1/bookings",
        headers=_auth_headers(user_auth["access_token"]),
        json={
            "mentor_id": mentor.id,
            "session_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
            "notes": "Need weather",
            "session_type": "individual",
        },
    )
    assert booking_response.status_code == 200
    booking_id = booking_response.json()["id"]

    async def forecast_success(city: str, date=None):
        return schemas.WeatherForecast(
            city=city,
            country="RU",
            datetime_utc=datetime.now(timezone.utc),
            temperature_celsius=22.1,
            feels_like_celsius=21.5,
            humidity_percent=44,
            wind_speed_ms=3.1,
            condition="Clear",
            description="ясно",
            icon_code="0",
            is_outdoor_suitable=True,
        )

    monkeypatch.setattr(weather_service.WeatherService, "get_forecast", staticmethod(forecast_success))

    weather_ok = client.get(
        "/api/v1/weather/forecast?city=Москва",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert weather_ok.status_code == 200
    assert weather_ok.json()["city"] == "Москва"

    booking_weather_ok = client.get(
        f"/api/v1/bookings/{booking_id}/weather",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert booking_weather_ok.status_code == 200
    assert "is_outdoor_suitable" in booking_weather_ok.json()

    async def forecast_failure(city: str, date=None):
        raise HTTPException(status_code=504, detail="Сервис погоды недоступен. Попробуйте позже.")

    monkeypatch.setattr(weather_service.WeatherService, "get_forecast", staticmethod(forecast_failure))

    weather_fail = client.get(
        "/api/v1/weather/forecast?city=Москва",
        headers=_auth_headers(user_auth["access_token"]),
    )
    assert weather_fail.status_code == 504
    fail_payload = weather_fail.json()
    assert fail_payload["status"] == 504
    assert "недоступен" in fail_payload["detail"].lower()
