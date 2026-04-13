from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Force dedicated test environment before app modules are imported.
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-bytes-long")
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/yogavibe-test-bootstrap.db")
os.environ.setdefault("FILE_STORAGE_PROVIDER", "local")
os.environ.setdefault("STORAGE_PUBLIC_BASE_URL", "http://testserver")

from app import crud, schemas  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
import app.main as main_module  # noqa: E402
from app.services import weather_service  # noqa: E402
from app.services.object_storage_service import LOCAL_UPLOADS_DIR, ObjectStorageService  # noqa: E402


@pytest.fixture(scope="function")
def test_engine(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def testing_session_local(test_engine):
    return sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
        expire_on_commit=False,
    )


@pytest.fixture(scope="function")
def db_session(testing_session_local):
    db = testing_session_local()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(testing_session_local, monkeypatch):
    monkeypatch.setattr(settings, "FILE_STORAGE_PROVIDER", "local")
    monkeypatch.setattr(settings, "STORAGE_PUBLIC_BASE_URL", "http://testserver")
    monkeypatch.setattr(main_module, "init_db", lambda: True)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function", autouse=True)
def cleanup_local_uploads_dir():
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    for child in LOCAL_UPLOADS_DIR.iterdir():
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)

    yield

    for child in LOCAL_UPLOADS_DIR.iterdir():
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)


@pytest.fixture(scope="function")
def mock_weather_success(monkeypatch):
    async def _success(city: str, date=None):
        return schemas.WeatherForecast(
            city=city,
            country="RU",
            datetime_utc=datetime.now(timezone.utc),
            temperature_celsius=23.0,
            feels_like_celsius=22.2,
            humidity_percent=45,
            wind_speed_ms=3.0,
            condition="Clear",
            description="clear",
            icon_code="0",
            is_outdoor_suitable=True,
        )

    monkeypatch.setattr(weather_service.WeatherService, "get_forecast", staticmethod(_success))
    return _success


@pytest.fixture(scope="function")
def mock_weather_failure(monkeypatch):
    from fastapi import HTTPException

    async def _failure(city: str, date=None):
        raise HTTPException(status_code=504, detail="Weather provider unavailable")

    monkeypatch.setattr(weather_service.WeatherService, "get_forecast", staticmethod(_failure))
    return _failure


@pytest.fixture(scope="function")
def mock_s3_storage(monkeypatch):
    class DummyS3Client:
        def put_object(self, **kwargs):
            return {"status": "ok", "kwargs": kwargs}

        def delete_object(self, **kwargs):
            return {"status": "ok", "kwargs": kwargs}

        def generate_presigned_url(self, operation_name, Params=None, ExpiresIn=900):
            key = (Params or {}).get("Key", "file")
            return f"https://dummy-s3.local/{key}?expires={ExpiresIn}"

    dummy = DummyS3Client()

    monkeypatch.setattr(settings, "FILE_STORAGE_PROVIDER", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET_NAME", "test-bucket")
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "test-key")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "test-secret")

    monkeypatch.setattr(
        ObjectStorageService,
        "_get_s3_client",
        classmethod(lambda cls, public=False: dummy),
    )

    return dummy


@pytest.fixture(scope="function")
def user_factory(db_session: Session):
    counter = {"value": 0}

    def _create_user(role: str = "user", is_active: bool = True, password: str = "pass123"):
        counter["value"] += 1
        idx = counter["value"]
        user = crud.user_crud.create_user(
            db_session,
            schemas.UserCreate(
                username=f"user_{role}_{idx}",
                email=f"user_{role}_{idx}@example.com",
                password=password,
            ),
            role=role,
            is_active=is_active,
        )
        return user

    return _create_user


@pytest.fixture(scope="function")
def mentor_factory(db_session: Session):
    counter = {"value": 0}

    def _create_mentor(is_available: bool = True, price: int = 2000):
        counter["value"] += 1
        idx = counter["value"]
        mentor_user = crud.user_crud.create_user(
            db_session,
            schemas.UserCreate(
                username=f"mentor_user_{idx}",
                email=f"mentor_user_{idx}@example.com",
                password="pass123",
            ),
            role="mentor",
            is_active=True,
        )

        mentor = crud.mentor_crud.create_mentor(
            db_session,
            schemas.MentorCreate(
                user_id=mentor_user.id,
                name=f"Mentor {idx}",
                description="Experienced yoga mentor",
                gender="female",
                city="Moscow",
                price=price,
                yoga_style="Hatha",
                rating=4.8,
                experience_years=5,
                is_available=is_available,
            ),
        )
        return mentor_user, mentor

    return _create_mentor


@pytest.fixture(scope="function")
def auth_headers_factory(client: TestClient, db_session: Session):
    def _login(role: str = "user", is_active: bool = True, password: str = "pass123"):
        user = crud.user_crud.create_user(
            db_session,
            schemas.UserCreate(
                username=f"auth_{role}_{int(datetime.now().timestamp() * 1000000)}",
                email=f"auth_{role}_{int(datetime.now().timestamp() * 1000000)}@example.com",
                password=password,
            ),
            role=role,
            is_active=is_active,
        )

        response = client.post(
            "/api/v1/auth/login",
            json={"login": user.username, "password": password},
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        return user, {"Authorization": f"Bearer {token}"}

    return _login
