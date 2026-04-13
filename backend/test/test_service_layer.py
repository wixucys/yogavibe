from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app import crud, schemas
from app.services.auth_service import AuthService
from app.services.booking_service import BookingService
from app.services.file_service import FileService
from app.services.note_service import NoteService
from app.services.user_service import UserService

pytestmark = pytest.mark.unit


def test_auth_service_register_duplicate_email_returns_400(db_session, user_factory):
    existing_user = user_factory(role="user")

    with pytest.raises(HTTPException) as exc:
        AuthService.register(
            db_session,
            schemas.UserCreate(
                username="new_user",
                email=existing_user.email,
                password="pass123",
            ),
        )

    assert exc.value.status_code == 400
    assert "Email already registered" in exc.value.detail


def test_booking_service_create_booking_in_past_returns_400(db_session, user_factory, mentor_factory):
    user = user_factory(role="user")
    _, mentor = mentor_factory(is_available=True)

    booking_data = schemas.BookingCreate(
        mentor_id=mentor.id,
        session_date=datetime.now(timezone.utc) - timedelta(hours=1),
        duration_minutes=60,
        notes="Test",
        session_type="individual",
    )

    with pytest.raises(HTTPException) as exc:
        BookingService.create_booking(db_session, user.id, booking_data)

    assert exc.value.status_code == 400
    assert "будущ" in exc.value.detail.lower()


def test_note_service_update_conflict_returns_409(db_session, user_factory):
    user = user_factory(role="user")
    note = crud.note_crud.create_note(db_session, schemas.NoteCreate(text="first"), user.id)

    updates = schemas.NoteUpdate(
        text="updated",
        expected_updated_at=datetime.now(timezone.utc) + timedelta(days=1),
    )

    with pytest.raises(HTTPException) as exc:
        NoteService.update_note(db_session, note.id, user.id, updates)

    assert exc.value.status_code == 409
    assert "измен" in exc.value.detail.lower()


def test_user_service_cannot_delete_last_admin(db_session, user_factory):
    admin = user_factory(role="admin")

    with pytest.raises(HTTPException) as exc:
        UserService.delete_user(db_session, admin.id)

    assert exc.value.status_code == 400
    assert "последнего администратора" in exc.value.detail.lower()


def test_file_service_rejects_invalid_owner_category(db_session, mentor_factory):
    mentor_user, _ = mentor_factory()

    upload = schemas.FileUploadRequest(
        filename="doc.pdf",
        content_base64="ZmFrZV9jb250ZW50",
        mime_type="application/pdf",
        category="medical_document",
    )

    with pytest.raises(HTTPException) as exc:
        FileService.upload_mentor_file(db_session, mentor_user.id, upload)

    assert exc.value.status_code == 400
    assert "нельзя привязать" in exc.value.detail.lower()


def test_file_service_rejects_invalid_base64_payload(db_session, user_factory):
    user = user_factory(role="user")

    upload = schemas.FileUploadRequest(
        filename="avatar.png",
        content_base64="%%%invalid%%%",
        mime_type="image/png",
        category="avatar",
    )

    with pytest.raises(HTTPException) as exc:
        FileService.upload_user_file(db_session, user.id, upload)

    assert exc.value.status_code == 400
    assert "некорректное содержимое" in exc.value.detail.lower()
