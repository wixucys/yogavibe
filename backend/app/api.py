from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import crud
import schemas
from config import settings
from database import get_db
from utils import create_access_token, create_refresh_token, verify_token
from services.auth_service import AuthService
from services.user_service import UserService
from services.mentor_service import MentorService
from services.note_service import NoteService
from services.booking_service import BookingService

router = APIRouter(prefix="/api/v1")
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> schemas.UserResponse:
    token = credentials.credentials
    payload = verify_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный токен",
        )

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный идентификатор пользователя в токене",
        )

    user = crud.user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    return schemas.UserResponse.model_validate(user)


def require_roles(*allowed_roles: str):
    def dependency(
        current_user: schemas.UserResponse = Depends(get_current_user),
    ) -> schemas.UserResponse:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав",
            )
        return current_user

    return dependency


# =========================
# SETUP
# =========================
@router.post("/setup/bootstrap-admin", response_model=schemas.AuthResponse)
async def bootstrap_admin(
    request: schemas.BootstrapAdminCreate,
    db: Session = Depends(get_db),
):
    return AuthService.bootstrap_admin(db, request)


# =========================
# AUTH
# =========================
@router.post("/auth/register", response_model=schemas.AuthResponse)
async def register(
    request: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    return AuthService.register(db, request)


@router.post("/auth/login", response_model=schemas.AuthResponse)
async def login(
    request: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    return AuthService.login(db, request)


@router.post("/auth/refresh", response_model=schemas.Token)
async def refresh_tokens(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    return AuthService.refresh_token(db, request.refresh_token)


@router.post("/auth/logout")
async def logout(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    AuthService.logout(db, request.refresh_token)
    return {"message": "Выход выполнен успешно"}


# =========================
# USER
# =========================
@router.get("/users/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
):
    return current_user


@router.put("/users/me", response_model=schemas.UserResponse)
async def update_me(
    user_update: schemas.UserUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
    db: Session = Depends(get_db),
):
    return UserService.update_user(db, current_user.id, user_update)


# =========================
# MENTORS CATALOG
# =========================
@router.get("/mentors", response_model=List[schemas.MentorResponse])
async def get_mentors(
    city: Optional[str] = None,
    yoga_style: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db),
):
    filters = schemas.MentorFilters(city=city, yoga_style=yoga_style)
    return MentorService.get_all_mentors(db, filters, skip, limit)


@router.get("/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def get_mentor(
    mentor_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db),
):
    return MentorService.get_mentor_by_id(db, mentor_id)


# =========================
# MENTOR SELF
# =========================
@router.get("/mentor/me", response_model=schemas.MentorResponse)
async def get_my_mentor_profile(
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return MentorService.get_current_mentor(db, current_user.id)


@router.put("/mentor/me", response_model=schemas.MentorResponse)
async def update_my_mentor_profile(
    mentor_update: schemas.MentorUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return MentorService.update_mentor(db, current_user.id, mentor_update)


@router.get("/mentor/bookings", response_model=List[schemas.BookingResponse])
async def get_my_mentor_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return MentorService.get_mentor_bookings(db, current_user.id, skip, limit)


# =========================
# NOTES
# =========================
@router.get("/notes", response_model=List[schemas.NoteResponse])
async def get_notes(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return NoteService.get_user_notes(db, current_user.id, skip, limit)


@router.post("/notes", response_model=schemas.NoteResponse)
async def create_note(
    note_data: schemas.NoteCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return NoteService.create_note(db, current_user.id, note_data)


@router.put("/notes/{note_id}", response_model=schemas.NoteResponse)
async def update_note(
    note_id: int,
    note_data: schemas.NoteUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return NoteService.update_note(db, note_id, current_user.id, note_data)


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    NoteService.delete_note(db, note_id, current_user.id)
    return {"message": "Заметка удалена"}


# =========================
# BOOKINGS
# =========================
@router.get("/bookings", response_model=List[schemas.BookingResponse])
async def get_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.get_user_bookings(db, current_user.id, skip, limit)


@router.post("/bookings", response_model=schemas.BookingResponse)
async def create_booking(
    booking_data: schemas.BookingCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.create_booking(db, current_user.id, booking_data)


@router.put("/bookings/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.cancel_booking(db, booking_id, current_user.id)


# =========================
# ADMIN
# =========================
@router.get("/admin/dashboard", response_model=schemas.AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.get_dashboard_stats(db)


@router.get("/admin/users", response_model=List[schemas.UserListResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.list_users(db, skip, limit)


@router.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: schemas.AdminUserUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.update_user_by_admin(db, user_id, user_update)


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    UserService.delete_user(db, user_id)
    return {"message": "Пользователь удалён"}


@router.put("/admin/users/{user_id}/role", response_model=schemas.UserResponse)
async def admin_change_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.change_user_role(db, user_id, role_data)


@router.get("/admin/mentors", response_model=List[schemas.MentorResponse])
async def get_all_mentors_for_admin(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    filters = schemas.MentorFilters()
    return MentorService.get_all_mentors(db, filters, skip, limit)


@router.post("/admin/mentors", response_model=schemas.MentorResponse)
async def create_mentor(
    mentor_data: schemas.MentorCreatePayload,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return MentorService.create_mentor(db, mentor_data)


@router.put("/admin/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def update_mentor(
    mentor_id: int,
    mentor_update: schemas.MentorAdminUpdatePayload,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return MentorService.update_mentor_by_admin(db, mentor_id, mentor_update)


@router.delete("/admin/mentors/{mentor_id}")
async def delete_mentor(
    mentor_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    MentorService.delete_mentor(db, mentor_id)
    return {"message": "Ментор удален"}
    