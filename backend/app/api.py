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


def build_booking_response(booking) -> schemas.BookingResponse:
    mentor_data = None

    if getattr(booking, "mentor", None):
        mentor_data = {
            "id": booking.mentor.id,
            "name": booking.mentor.name,
            "city": booking.mentor.city,
            "yoga_style": booking.mentor.yoga_style,
        }

    return schemas.BookingResponse(
        id=booking.id,
        user_id=booking.user_id,
        mentor_id=booking.mentor_id,
        mentor=mentor_data,
        session_date=booking.session_date,
        duration_minutes=booking.duration_minutes,
        price=booking.price,
        status=booking.status,
        notes=booking.notes,
        session_type=getattr(booking, "session_type", "individual"),
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )


# =========================
# SETUP
# =========================
@router.post("/setup/bootstrap-admin", response_model=schemas.AuthResponse)
async def bootstrap_admin(
    request: schemas.BootstrapAdminCreate,
    db: Session = Depends(get_db),
):
    admins_count = crud.user_crud.count_users_by_role(db, "admin")
    if admins_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Администратор уже существует. Bootstrap отключен",
        )

    existing_email = crud.user_crud.get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    existing_username = crud.user_crud.get_user_by_username(db, request.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует",
        )

    user = crud.user_crud.create_user(db, request, role="admin", is_active=True)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    crud.refresh_token_crud.create_token(
        db,
        refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return schemas.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=schemas.UserResponse.model_validate(user),
    )


# =========================
# AUTH
# =========================
@router.post("/auth/register", response_model=schemas.AuthResponse)
async def register(
    request: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    existing_email = crud.user_crud.get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    existing_username = crud.user_crud.get_user_by_username(db, request.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует",
        )

    user = crud.user_crud.create_user(db, request, role="user", is_active=True)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    crud.refresh_token_crud.create_token(
        db,
        refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return schemas.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=schemas.UserResponse.model_validate(user),
    )


@router.post("/auth/login", response_model=schemas.AuthResponse)
async def login(
    request: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    user = crud.user_crud.authenticate_user(db, request.login, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    crud.refresh_token_crud.clear_expired_tokens(db, user.id)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    crud.refresh_token_crud.create_token(
        db,
        refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return schemas.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=schemas.UserResponse.model_validate(user),
    )


@router.post("/auth/refresh", response_model=schemas.Token)
async def refresh_tokens(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    payload = verify_token(request.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный refresh token",
        )

    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный refresh token",
        )

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный идентификатор пользователя в refresh token",
        )

    stored_token = crud.refresh_token_crud.get_token(db, request.refresh_token)
    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token не найден или деактивирован",
        )

    user = crud.user_crud.get_user(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь недоступен",
        )

    crud.refresh_token_crud.deactivate_token(db, request.refresh_token)

    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    crud.refresh_token_crud.create_token(
        db,
        new_refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return schemas.Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/auth/logout")
async def logout(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    success = crud.refresh_token_crud.deactivate_token(db, request.refresh_token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token не найден или уже деактивирован",
        )

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
    updated_user = crud.user_crud.update_user(
        db,
        current_user.id,
        user_update.model_dump(exclude_unset=True),
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    return schemas.UserResponse.model_validate(updated_user)


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
    mentors = crud.mentor_crud.get_mentors(
        db,
        skip=skip,
        limit=limit,
        city=city,
        yoga_style=yoga_style,
    )
    return [schemas.MentorResponse.model_validate(mentor) for mentor in mentors]


@router.get("/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def get_mentor(
    mentor_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db),
):
    mentor = crud.mentor_crud.get_mentor(db, mentor_id)
    if not mentor or not mentor.is_available:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор не найден",
        )

    return schemas.MentorResponse.model_validate(mentor)


# =========================
# MENTOR SELF
# =========================
@router.get("/mentor/me", response_model=schemas.MentorResponse)
async def get_my_mentor_profile(
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден",
        )

    return schemas.MentorResponse.model_validate(mentor)


@router.put("/mentor/me", response_model=schemas.MentorResponse)
async def update_my_mentor_profile(
    mentor_update: schemas.MentorSelfUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден",
        )

    updated_mentor = crud.mentor_crud.update_mentor_self(
        db,
        mentor.id,
        mentor_update.model_dump(exclude_unset=True),
    )

    if not updated_mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор не найден",
        )

    return schemas.MentorResponse.model_validate(updated_mentor)


@router.get("/mentor/bookings", response_model=List[schemas.BookingResponse])
async def get_my_mentor_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден",
        )

    bookings = crud.booking_crud.get_mentor_bookings(
        db,
        mentor.id,
        skip=skip,
        limit=limit,
    )

    return [build_booking_response(booking) for booking in bookings]


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
    notes = crud.note_crud.get_user_notes(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
    )
    return [schemas.NoteResponse.model_validate(note) for note in notes]


@router.post("/notes", response_model=schemas.NoteResponse)
async def create_note(
    note_data: schemas.NoteCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    note = crud.note_crud.create_note(db, note_data, current_user.id)
    return schemas.NoteResponse.model_validate(note)


@router.put("/notes/{note_id}", response_model=schemas.NoteResponse)
async def update_note(
    note_id: int,
    note_data: schemas.NoteCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    note = crud.note_crud.get_note(db, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заметка не найдена",
        )

    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой заметке",
        )

    updated_note = crud.note_crud.update_note(db, note_id, note_data)
    if not updated_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заметка не найдена",
        )

    return schemas.NoteResponse.model_validate(updated_note)


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    note = crud.note_crud.get_note(db, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заметка не найдена",
        )

    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой заметке",
        )

    if crud.note_crud.delete_note(db, note_id):
        return {"message": "Заметка удалена"}

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Ошибка при удалении заметки",
    )


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
    bookings = crud.booking_crud.get_user_bookings(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
    )
    return [build_booking_response(booking) for booking in bookings]


@router.post("/bookings", response_model=schemas.BookingResponse)
async def create_booking(
    booking_data: schemas.BookingCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    try:
        booking = crud.booking_crud.create_booking(db, booking_data, current_user.id)
        return build_booking_response(booking)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.put("/bookings/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    booking = crud.booking_crud.get_booking(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )

    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию",
        )

    if booking.status in ["cancelled", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Бронирование уже {booking.status}",
        )

    booking_date = booking.session_date
    if booking_date.tzinfo is None:
        booking_date = booking_date.replace(tzinfo=timezone.utc)

    if booking_date <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отменить прошедшую сессию",
        )

    cancelled_booking = crud.booking_crud.update_booking_status(
        db,
        booking_id,
        "cancelled",
    )

    if not cancelled_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )

    return build_booking_response(cancelled_booking)


# =========================
# ADMIN
# =========================
@router.get("/admin/dashboard", response_model=schemas.AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return schemas.AdminDashboardResponse(
        total_users=crud.user_crud.count_all_users(db),
        active_users=crud.user_crud.count_active_users(db),
        admins_count=crud.user_crud.count_users_by_role(db, "admin"),
        mentors_count=crud.user_crud.count_users_by_role(db, "mentor"),
        mentor_profiles_count=crud.mentor_crud.count_mentor_profiles(db),
        regular_users_count=crud.user_crud.count_users_by_role(db, "user"),
        bookings_count=crud.booking_crud.count_bookings(db),
        active_bookings_count=crud.booking_crud.count_bookings_by_status(db, "active"),
        notes_count=crud.note_crud.count_notes(db),
    )


@router.get("/admin/users", response_model=List[schemas.UserListResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    users = crud.user_crud.get_users(db, skip=skip, limit=limit)
    return [schemas.UserListResponse.model_validate(user) for user in users]


@router.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    try:
        updated_user = crud.user_crud.admin_update_user(
            db,
            user_id,
            user_update.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    return schemas.UserResponse.model_validate(updated_user)


@router.put("/admin/users/{user_id}/role", response_model=schemas.UserResponse)
async def admin_change_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    try:
        updated_user = crud.user_crud.admin_update_user(
            db,
            user_id,
            {"role": role_data.role},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    return schemas.UserResponse.model_validate(updated_user)


@router.get("/admin/mentors", response_model=List[schemas.MentorResponse])
async def get_all_mentors_for_admin(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    mentors = crud.mentor_crud.get_all_mentors(db, skip=skip, limit=limit)
    return [schemas.MentorResponse.model_validate(mentor) for mentor in mentors]


@router.post("/admin/mentors", response_model=schemas.MentorResponse)
async def create_mentor(
    mentor_data: schemas.MentorCreate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    try:
        mentor = crud.mentor_crud.create_mentor(db, mentor_data)
        return schemas.MentorResponse.model_validate(mentor)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.put("/admin/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def update_mentor(
    mentor_id: int,
    mentor_update: schemas.MentorAdminUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    mentor = crud.mentor_crud.update_mentor(
        db,
        mentor_id,
        mentor_update.model_dump(exclude_unset=True),
    )

    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор не найден",
        )

    return schemas.MentorResponse.model_validate(mentor)


@router.delete("/admin/mentors/{mentor_id}")
async def delete_mentor(
    mentor_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    if crud.mentor_crud.delete_mentor(db, mentor_id):
        return {"message": "Ментор удален"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Ментор не найден",
    )