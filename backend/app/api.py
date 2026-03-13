from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import schemas
import crud
from utils import create_access_token, create_refresh_token, verify_token
from database import get_db
from config import settings

router = APIRouter(prefix="/api/v1")
security = HTTPBearer()


# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> schemas.UserResponse:
    # Получить текущего аутентифицированного пользователя
    token = credentials.credentials
    payload = verify_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
        )

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат токена",
        )

    user = crud.user_crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь деактивирован",
        )

    return schemas.UserResponse.model_validate(user)


def require_admin(
    current_user: schemas.UserResponse = Depends(get_current_user)
) -> schemas.UserResponse:
    # Проверка, что текущий пользователь — администратор
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора"
        )
    return current_user


def require_mentor(
    current_user: schemas.UserResponse = Depends(get_current_user)
) -> schemas.UserResponse:
    # Проверка, что текущий пользователь — ментор
    if current_user.role != "mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права ментора"
        )
    return current_user


# ЭНДПОИНТЫ АУТЕНТИФИКАЦИИ
@router.post("/auth/login", response_model=schemas.AuthResponse)
async def login(
    request: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    # Вход пользователя в систему
    user = crud.user_crud.authenticate_user(db, request.login, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    # Очистка просроченных токенов
    crud.refresh_token_crud.clear_expired_tokens(db, user.id)

    # Создание токенов
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Сохранение refresh токена в базу данных
    crud.refresh_token_crud.create_token(
        db,
        refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    # Подготовка ответа с пользователем
    user_response = schemas.UserResponse.model_validate(user)

    return schemas.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/auth/register", response_model=schemas.AuthResponse)
async def register(
    request: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    # Регистрация нового пользователя
    existing_email = crud.user_crud.get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    existing_username = crud.user_crud.get_user_by_username(db, request.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )

    # Создание пользователя
    user = crud.user_crud.create_user(db, request)

    # Создание токенов
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Сохранение refresh токена
    crud.refresh_token_crud.create_token(
        db,
        refresh_token,
        user.id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    # Подготовка ответа
    user_response = schemas.UserResponse.model_validate(user)

    return schemas.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/auth/refresh", response_model=schemas.Token)
async def refresh_token(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    # Обновление access токена с помощью refresh токена
    payload = verify_token(request.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный refresh токен"
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный refresh токен"
        )

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат токена"
        )

    # Проверка существования refresh токена в базе данных
    refresh_token_obj = crud.refresh_token_crud.get_token(db, request.refresh_token)
    if not refresh_token_obj or refresh_token_obj.user_id != user_id or not refresh_token_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh токен недействителен"
        )

    # Проверка пользователя
    user = crud.user_crud.get_user(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь недоступен"
        )

    # Проверка срока действия
    if refresh_token_obj.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh токен истек"
        )

    # Деактивация старого refresh токена
    crud.refresh_token_crud.deactivate_token(db, request.refresh_token)

    # Создание новых токенов
    new_access_token = create_access_token(data={"sub": str(user_id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user_id)})

    # Сохранение нового refresh токена
    crud.refresh_token_crud.create_token(
        db,
        new_refresh_token,
        user_id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    return schemas.Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )


@router.post("/auth/logout")
async def logout(
    request: schemas.TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    # Выход из системы - деактивация refresh токена
    if crud.refresh_token_crud.deactivate_token(db, request.refresh_token):
        return {"message": "Успешный выход"}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Неверный refresh токен"
    )


# ЭНДПОИНТЫ ПОЛЬЗОВАТЕЛЯ
@router.get("/users/me", response_model=schemas.UserResponse)
async def get_current_user_endpoint(
    user: schemas.UserResponse = Depends(get_current_user)
):
    # Получить информацию о текущем пользователе
    return user


@router.put("/users/me", response_model=schemas.UserResponse)
async def update_current_user(
    user_update: schemas.UserUpdate,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Обновить информацию о текущем пользователе
    updated_user = crud.user_crud.update_user(
        db,
        current_user.id,
        user_update.model_dump(exclude_unset=True)
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    return schemas.UserResponse.model_validate(updated_user)


# ЭНДПОИНТЫ МЕНТОРОВ
@router.get("/mentors", response_model=List[schemas.MentorResponse])
async def get_mentors(
    city: Optional[str] = None,
    yoga_style: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Получить список менторов с возможностью фильтрации
    # Доступно только авторизованным пользователям
    mentors = crud.mentor_crud.get_mentors(
        db,
        skip=skip,
        limit=limit,
        city=city,
        yoga_style=yoga_style
    )
    return [schemas.MentorResponse.model_validate(mentor) for mentor in mentors]


@router.get("/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def get_mentor(
    mentor_id: int,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Получить информацию о конкретном менторе
    # Доступно только авторизованным пользователям
    mentor = crud.mentor_crud.get_mentor(db, mentor_id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор не найден"
        )

    return schemas.MentorResponse.model_validate(mentor)


@router.get("/mentor/me", response_model=schemas.MentorResponse)
async def get_my_mentor_profile(
    current_user: schemas.UserResponse = Depends(require_mentor),
    db: Session = Depends(get_db)
):
    # Получить профиль текущего ментора
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден"
        )

    return schemas.MentorResponse.model_validate(mentor)


@router.put("/mentor/me", response_model=schemas.MentorResponse)
async def update_my_mentor_profile(
    mentor_update: schemas.MentorSelfUpdate,
    current_user: schemas.UserResponse = Depends(require_mentor),
    db: Session = Depends(get_db)
):
    # Обновить профиль текущего ментора
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден"
        )

    updated_mentor = crud.mentor_crud.update_mentor(
        db,
        mentor.id,
        mentor_update.model_dump(exclude_unset=True)
    )

    return schemas.MentorResponse.model_validate(updated_mentor)


# ЭНДПОИНТЫ ЗАМЕТОК
@router.get("/notes", response_model=List[schemas.NoteResponse])
async def get_notes(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Получить заметки текущего пользователя
    notes = crud.note_crud.get_user_notes(
        db,
        current_user.id,
        skip=skip,
        limit=limit
    )
    return [schemas.NoteResponse.model_validate(note) for note in notes]


@router.post("/notes", response_model=schemas.NoteResponse)
async def create_note(
    note_data: schemas.NoteCreate,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Создать новую заметку
    note = crud.note_crud.create_note(db, note_data, current_user.id)
    return schemas.NoteResponse.model_validate(note)


@router.put("/notes/{note_id}", response_model=schemas.NoteResponse)
async def update_note(
    note_id: int,
    note_data: schemas.NoteCreate,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Обновить заметку
    note = crud.note_crud.get_note(db, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заметка не найдена"
        )

    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой заметке"
        )

    updated_note = crud.note_crud.update_note(db, note_id, note_data)
    return schemas.NoteResponse.model_validate(updated_note)


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Удалить заметку
    note = crud.note_crud.get_note(db, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заметка не найдена"
        )

    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой заметке"
        )

    if crud.note_crud.delete_note(db, note_id):
        return {"message": "Заметка удалена"}

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Ошибка при удалении заметки"
    )


# ЭНДПОИНТЫ БРОНИРОВАНИЙ ПОЛЬЗОВАТЕЛЯ
@router.get("/bookings", response_model=List[schemas.BookingResponse])
async def get_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Получить бронирования текущего пользователя
    bookings = crud.booking_crud.get_user_bookings(
        db,
        current_user.id,
        skip=skip,
        limit=limit
    )
    return [schemas.BookingResponse.model_validate(booking) for booking in bookings]


@router.post("/bookings", response_model=schemas.BookingResponse)
async def create_booking(
    booking_data: schemas.BookingCreate,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Создать новое бронирование
    try:
        booking = crud.booking_crud.create_booking(db, booking_data, current_user.id)
        return schemas.BookingResponse.model_validate(booking)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании бронирования: {str(e)}"
        )


@router.put("/bookings/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Отменить бронирование
    booking = crud.booking_crud.get_booking(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено"
        )

    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию"
        )

    if booking.status in ["cancelled", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Бронирование уже {booking.status}"
        )

    booking_date = booking.session_date
    if booking_date.tzinfo is None:
        booking_date = booking_date.replace(tzinfo=timezone.utc)

    if booking_date <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отменить уже прошедшее бронирование"
        )

    updated_booking = crud.booking_crud.update_booking_status(db, booking_id, "cancelled")
    return schemas.BookingResponse.model_validate(updated_booking)


# ЭНДПОИНТЫ МЕНТОРА
@router.get("/mentor/bookings", response_model=List[schemas.BookingResponse])
async def get_mentor_bookings(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.UserResponse = Depends(require_mentor),
    db: Session = Depends(get_db)
):
    # Получить бронирования текущего ментора
    mentor = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль ментора не найден"
        )

    bookings = crud.booking_crud.get_mentor_bookings(
        db,
        mentor.id,
        skip=skip,
        limit=limit
    )
    return [schemas.BookingResponse.model_validate(booking) for booking in bookings]


# ЭНДПОИНТЫ АДМИНИСТРАТОРА
@router.get("/admin/users", response_model=List[schemas.UserListResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: schemas.UserResponse = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Получить список всех пользователей
    users = crud.user_crud.get_users(db, skip=skip, limit=limit)
    return [schemas.UserListResponse.model_validate(user) for user in users]


@router.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    admin_user: schemas.UserResponse = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Обновить пользователя от имени администратора
    updated_user = crud.user_crud.admin_update_user(
        db,
        user_id,
        user_update.model_dump(exclude_unset=True)
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    return schemas.UserResponse.model_validate(updated_user)


@router.post("/admin/mentors", response_model=schemas.MentorResponse)
async def create_mentor(
    mentor_data: schemas.MentorCreate,
    admin_user: schemas.UserResponse = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Создать ментора от имени администратора
    try:
        mentor = crud.mentor_crud.create_mentor(db, mentor_data)
        return schemas.MentorResponse.model_validate(mentor)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/admin/mentors/{mentor_id}", response_model=schemas.MentorResponse)
async def update_mentor(
    mentor_id: int,
    mentor_update: schemas.MentorAdminUpdate,
    admin_user: schemas.UserResponse = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Обновить ментора от имени администратора
    mentor = crud.mentor_crud.update_mentor(
        db,
        mentor_id,
        mentor_update.model_dump(exclude_unset=True)
    )

    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ментор не найден"
        )

    return schemas.MentorResponse.model_validate(mentor)


@router.delete("/admin/mentors/{mentor_id}")
async def delete_mentor(
    mentor_id: int,
    admin_user: schemas.UserResponse = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Удалить ментора от имени администратора
    if crud.mentor_crud.delete_mentor(db, mentor_id):
        return {"message": "Ментор удален"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Ментор не найден"
    )