from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_serializer, field_validator


UserRole = Literal["user", "mentor", "admin"]
BookingStatus = Literal["active", "completed", "cancelled"]
SessionType = Literal["individual", "group"]


class DateTimeSchema(BaseModel):
    @field_serializer("*", when_used="json", check_fields=False)
    def serialize_datetimes(self, value, _info):
        if not isinstance(value, datetime):
            return value

        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)

        moscow_tz = timezone(timedelta(hours=3))
        return value.astimezone(moscow_tz).isoformat()

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Имя пользователя должно быть не короче 3 символов")
        return value

    @field_validator("email")
    @classmethod
    def email_to_lower(cls, value: str) -> str:
        return value.lower()

    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("Пароль должен быть не короче 6 символов")
        return value


class BootstrapAdminCreate(UserCreate):
    pass


class UserUpdate(BaseModel):
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class UserResponse(DateTimeSchema):
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


class UserListResponse(DateTimeSchema):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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


class MentorBase(BaseModel):
    name: str
    description: str
    gender: str
    city: str
    price: int
    yoga_style: str

    @field_validator("name", "description", "gender", "city", "yoga_style")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Поле не может быть пустым")
        return stripped

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Цена не может быть отрицательной")
        return value

    model_config = ConfigDict(from_attributes=True)


class MentorCreate(MentorBase):
    user_id: int
    rating: Optional[float] = 0.0
    experience_years: Optional[int] = 0
    photo_url: Optional[str] = None
    is_available: Optional[bool] = True

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value < 0 or value > 5:
            raise ValueError("Рейтинг должен быть в диапазоне от 0 до 5")
        return value

    @field_validator("experience_years")
    @classmethod
    def validate_experience_years(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        if value < 0:
            raise ValueError("Опыт не может быть отрицательным")
        return value

    model_config = ConfigDict(from_attributes=True)


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


class MentorShortResponse(BaseModel):
    id: int
    name: str
    city: Optional[str] = None
    yoga_style: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MentorResponse(DateTimeSchema):
    id: int
    user_id: int
    name: str
    description: str
    gender: str
    city: str
    price: int
    yoga_style: str
    rating: float
    experience_years: int
    photo_url: Optional[str] = None
    is_available: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteBase(BaseModel):
    text: str

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(NoteBase):
    @field_validator("text")
    @classmethod
    def validate_text_length(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 1:
            raise ValueError("Текст заметки не может быть пустым")
        if len(stripped) > 1000:
            raise ValueError("Текст заметки слишком длинный")
        return stripped

    model_config = ConfigDict(from_attributes=True)


class NoteResponse(DateTimeSchema):
    id: int
    user_id: int
    text: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BookingBase(BaseModel):
    mentor_id: int
    session_date: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None
    session_type: SessionType = "individual"

    model_config = ConfigDict(from_attributes=True)


class BookingCreate(BookingBase):
    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Длительность должна быть больше 0 минут")
        return value

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

        stripped = value.strip()
        if len(stripped) > 1000:
            raise ValueError("Комментарий к бронированию слишком длинный")

        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class BookingResponse(DateTimeSchema):
    id: int
    user_id: int
    mentor_id: int
    mentor: Optional[MentorShortResponse] = None
    session_date: datetime
    duration_minutes: int
    price: int
    status: BookingStatus
    notes: Optional[str] = None
    session_type: SessionType = "individual"
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    admins_count: int
    mentors_count: int
    mentor_profiles_count: int
    regular_users_count: int
    bookings_count: int
    active_bookings_count: int
    notes_count: int

    model_config = ConfigDict(from_attributes=True)