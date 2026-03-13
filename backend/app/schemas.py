from typing import Optional, Literal
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr, field_serializer, validator, ConfigDict


# БАЗОВЫЕ ТИПЫ
UserRole = Literal["user", "mentor", "admin"]


# БАЗОВАЯ СХЕМА ПОЛЬЗОВАТЕЛЯ
class UserBase(BaseModel):
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


# СХЕМА ДЛЯ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @validator("email")
    def email_to_lower(cls, v: str) -> str:
        # Приводит email к нижнему регистру
        return v.lower()

    model_config = ConfigDict(from_attributes=True)


# СХЕМА ДЛЯ ОБНОВЛЕНИЯ ПОЛЬЗОВАТЕЛЯ
class UserUpdate(BaseModel):
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# СХЕМА ДЛЯ АДМИНСКОГО ОБНОВЛЕНИЯ ПОЛЬЗОВАТЕЛЯ
class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


# СХЕМА ОТВЕТА С ПОЛЬЗОВАТЕЛЕМ
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# КОРОТКАЯ СХЕМА ПОЛЬЗОВАТЕЛЯ ДЛЯ СПИСКОВ АДМИНА
class UserListResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# СХЕМЫ ДЛЯ АУТЕНТИФИКАЦИИ

class LoginRequest(BaseModel):
    login: str
    password: str

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(from_attributes=True)


class TokenRefreshRequest(BaseModel):
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(Token):
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


# СХЕМЫ ДЛЯ МЕНТОРОВ

class MentorBase(BaseModel):
    name: str
    description: str
    gender: str
    city: str
    price: int
    yoga_style: str

    model_config = ConfigDict(from_attributes=True)


# СОЗДАНИЕ МЕНТОРА АДМИНОМ
class MentorCreate(MentorBase):
    user_id: int
    rating: Optional[float] = 0.0
    experience_years: Optional[int] = 0
    photo_url: Optional[str] = None
    is_available: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)


# ОБНОВЛЕНИЕ МЕНТОРА АДМИНОМ
class MentorAdminUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    price: Optional[int] = None
    yoga_style: Optional[str] = None
    rating: Optional[float] = None
    experience_years: Optional[int] = None
    photo_url: Optional[str] = None
    is_available: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


# ОБНОВЛЕНИЕ ПРОФИЛЯ САМИМ МЕНТОРОМ
# ВАЖНО: здесь нет price и rating — их меняет только админ
class MentorSelfUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience_years: Optional[int] = None
    photo_url: Optional[str] = None
    is_available: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class MentorResponse(MentorBase):
    id: int
    user_id: int
    rating: float
    experience_years: int
    photo_url: Optional[str] = None
    is_available: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# СХЕМЫ ДЛЯ ЗАМЕТОК

class NoteBase(BaseModel):
    text: str

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(NoteBase):
    @validator("text")
    def validate_text_length(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("Текст заметки не может быть пустым")
        if len(v) > 1000:
            raise ValueError("Текст заметки слишком длинный")
        return v


class NoteResponse(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: Optional[datetime], _info) -> Optional[str]:
        # Преобразование datetime в строку с временем Москвы
        if dt is None:
            return None

        # Если datetime без таймзоны, считаем что это UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        # Преобразуем в московское время (UTC+3)
        moscow_tz = timezone(timedelta(hours=3))
        moscow_time = dt.astimezone(moscow_tz)

        # Возвращаем в ISO формате
        return moscow_time.isoformat()

    model_config = ConfigDict(from_attributes=True)


# СХЕМЫ ДЛЯ БРОНИРОВАНИЙ

class BookingBase(BaseModel):
    mentor_id: int
    session_date: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BookingCreate(BookingBase):
    pass


class BookingResponse(BookingBase):
    id: int
    user_id: int
    price: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)