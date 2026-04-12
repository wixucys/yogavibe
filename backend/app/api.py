from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError
from sqlalchemy.orm import Session

import crud
import schemas
from database import get_db
from utils import verify_token
from services.auth_service import AuthService
from services.user_service import UserService
from services.mentor_service import MentorService
from services.note_service import NoteService
from services.booking_service import BookingService
from services.file_service import FileService
from services.weather_service import WeatherService

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


def _raise_query_validation_error(exc: ValidationError) -> None:
    errors = [
        {
            "loc": error.get("loc", []),
            "msg": error.get("msg", "Validation error"),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors) from exc


def build_mentor_list_query(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    gender: Optional[str] = None,
    city: Optional[str] = None,
    yoga_style: Optional[str] = None,
    min_price: Optional[int] = Query(None, ge=0),
    max_price: Optional[int] = Query(None, ge=0),
    is_available: Optional[bool] = None,
    sort_by: schemas.MentorSortField = "created_at",
    sort_order: schemas.SortOrder = "desc",
) -> schemas.MentorListQuery:
    try:
        return schemas.MentorListQuery(
            page=page,
            page_size=page_size,
            search=search,
            gender=gender,
            city=city,
            yoga_style=yoga_style,
            min_price=min_price,
            max_price=max_price,
            is_available=is_available,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except ValidationError as exc:
        _raise_query_validation_error(exc)


def build_booking_list_query(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status_filter: Optional[schemas.BookingStatus] = Query(None, alias="status"),
    mentor_id: Optional[int] = None,
    session_type: Optional[schemas.SessionType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: schemas.BookingSortField = "session_date",
    sort_order: schemas.SortOrder = "desc",
) -> schemas.BookingListQuery:
    try:
        return schemas.BookingListQuery(
            page=page,
            page_size=page_size,
            status=status_filter,
            mentor_id=mentor_id,
            session_type=session_type,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except ValidationError as exc:
        _raise_query_validation_error(exc)


def build_note_list_query(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: schemas.NoteSortField = "created_at",
    sort_order: schemas.SortOrder = "desc",
) -> schemas.NoteListQuery:
    try:
        return schemas.NoteListQuery(
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except ValidationError as exc:
        _raise_query_validation_error(exc)


def build_user_list_query(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[schemas.UserRole] = None,
    is_active: Optional[bool] = None,
    sort_by: schemas.UserSortField = "created_at",
    sort_order: schemas.SortOrder = "desc",
) -> schemas.UserListQuery:
    try:
        return schemas.UserListQuery(
            page=page,
            page_size=page_size,
            search=search,
            role=role,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except ValidationError as exc:
        _raise_query_validation_error(exc)


def build_file_list_query(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[schemas.FileCategory] = None,
    sort_order: schemas.SortOrder = "desc",
) -> schemas.FileAttachmentListQuery:
    try:
        return schemas.FileAttachmentListQuery(
            page=page,
            page_size=page_size,
            category=category,
            sort_order=sort_order,
        )
    except ValidationError as exc:
        _raise_query_validation_error(exc)


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


@router.get("/users/me/files", response_model=schemas.FileAttachmentListPage)
async def get_my_user_files(
    query: schemas.FileAttachmentListQuery = Depends(build_file_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
    db: Session = Depends(get_db),
):
    return FileService.list_user_files(db, current_user.id, query)


@router.post("/users/me/files", response_model=schemas.FileAttachmentResponse)
async def upload_my_user_file(
    file_data: schemas.FileUploadRequest,
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
    db: Session = Depends(get_db),
):
    return FileService.upload_user_file(db, current_user.id, file_data)


@router.delete("/users/me/files/{file_id}")
async def delete_my_user_file(
    file_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
    db: Session = Depends(get_db),
):
    FileService.delete_user_file(db, current_user.id, file_id)
    return {"message": "Файл удалён"}


@router.get("/files/{file_id}/download-url", response_model=schemas.FileAccessUrlResponse)
async def get_file_download_url(
    file_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
    db: Session = Depends(get_db),
):
    return FileService.get_file_download_url(db, current_user, file_id)


@router.get("/files/{file_id}/download")
async def download_file_by_signature(
    file_id: int,
    expires: int = Query(..., ge=1),
    signature: str = Query(..., min_length=16),
    db: Session = Depends(get_db),
):
    return FileService.stream_file_by_signature(db, file_id, expires, signature)


# =========================
# MENTORS CATALOG
# =========================
@router.get("/mentors", response_model=schemas.MentorListPage)
async def get_mentors(
    query: schemas.MentorListQuery = Depends(build_mentor_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db),
):
    return MentorService.get_mentors_catalog(db, query)


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
    mentor_update: schemas.MentorSelfUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return MentorService.update_mentor(db, current_user.id, mentor_update)


@router.get("/mentor/me/files", response_model=schemas.FileAttachmentListPage)
async def get_my_mentor_files(
    query: schemas.FileAttachmentListQuery = Depends(build_file_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return FileService.list_mentor_files(db, current_user.id, query)


@router.post("/mentor/me/files", response_model=schemas.FileAttachmentResponse)
async def upload_my_mentor_file(
    file_data: schemas.FileUploadRequest,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return FileService.upload_mentor_file(db, current_user.id, file_data)


@router.delete("/mentor/me/files/{file_id}")
async def delete_my_mentor_file(
    file_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    FileService.delete_mentor_file(db, current_user.id, file_id)
    return {"message": "Файл удалён"}


@router.get("/mentor/bookings", response_model=schemas.BookingListPage)
async def get_my_mentor_bookings(
    query: schemas.BookingListQuery = Depends(build_booking_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return MentorService.get_mentor_bookings(db, current_user.id, query)


# =========================
# NOTES
# =========================
@router.get("/notes", response_model=schemas.NoteListPage)
async def get_notes(
    query: schemas.NoteListQuery = Depends(build_note_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return NoteService.get_user_notes(db, current_user.id, query)


@router.get("/notes/{note_id}", response_model=schemas.NoteResponse)
async def get_note(
    note_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return NoteService.get_note(db, note_id, current_user.id)


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
@router.get("/bookings", response_model=schemas.BookingListPage)
async def get_bookings(
    query: schemas.BookingListQuery = Depends(build_booking_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.get_user_bookings(db, current_user.id, query)


@router.get("/bookings/{booking_id}", response_model=schemas.BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.get_booking(db, booking_id, current_user.id)


@router.post("/bookings", response_model=schemas.BookingResponse)
async def create_booking(
    booking_data: schemas.BookingCreate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.create_booking(db, current_user.id, booking_data)


@router.put("/bookings/{booking_id}", response_model=schemas.BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: schemas.BookingUpdate,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.update_booking(db, booking_id, current_user.id, booking_data)


@router.put("/bookings/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    return BookingService.cancel_booking(db, booking_id, current_user.id)


@router.delete("/bookings/{booking_id}")
async def delete_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    BookingService.delete_booking(db, booking_id, current_user.id)
    return {"message": "Бронирование удалено"}


@router.put("/mentor/bookings/{booking_id}/complete", response_model=schemas.BookingResponse)
async def complete_booking_by_mentor(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("mentor")),
    db: Session = Depends(get_db),
):
    return BookingService.complete_booking_by_mentor(db, booking_id, current_user.id)


# =========================
# ADMIN
# =========================
@router.get("/admin/dashboard", response_model=schemas.AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.get_dashboard_stats(db)


@router.get("/admin/users", response_model=schemas.UserListPage)
async def get_all_users(
    query: schemas.UserListQuery = Depends(build_user_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return UserService.list_users(db, query)


@router.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
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


@router.get("/admin/mentors", response_model=schemas.MentorListPage)
async def get_all_mentors_for_admin(
    query: schemas.MentorListQuery = Depends(build_mentor_list_query),
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return MentorService.get_admin_mentors(db, query)


@router.post("/admin/mentors", response_model=schemas.MentorResponse)
async def create_mentor(
    mentor_data: schemas.MentorCreate,
    current_user: schemas.UserResponse = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return MentorService.create_mentor(db, mentor_data)


@router.put("/admin/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def update_mentor(
    mentor_id: int,
    mentor_update: schemas.MentorAdminUpdate,
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


# =========================
# WEATHER
# =========================

@router.get("/weather/forecast", response_model=schemas.WeatherForecast)
async def get_weather_forecast(
    city: str = Query(..., min_length=1, max_length=100, description="Название города"),
    date: Optional[datetime] = Query(
        None,
        description="Дата и время сессии в формате ISO 8601 (по умолчанию — текущий момент)",
    ),
    current_user: schemas.UserResponse = Depends(require_roles("user", "mentor", "admin")),
):
    """
    Прогноз погоды для любого города на указанную дату.

    - Дата сегодня или не указана → текущая погода.
    - Дата в пределах 5 дней → ближайший слот 5-дневного прогноза.
    - Прошедшие даты или > 5 дней → возвращается текущая погода.
    """
    return await WeatherService.get_forecast(city, date)


@router.get("/bookings/{booking_id}/weather", response_model=schemas.WeatherForecast)
async def get_booking_weather(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(require_roles("user")),
    db: Session = Depends(get_db),
):
    """
    Прогноз погоды для конкретного бронирования.
    Город определяется по профилю ментора, дата — из поля session_date.
    """
    booking = BookingService.get_booking(db, booking_id, current_user.id)

    mentor = crud.mentor_crud.get_mentor(db, booking.mentor_id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор бронирования не найден.",
        )

    return await WeatherService.get_forecast(mentor.city, booking.session_date)