from datetime import datetime, timedelta, timezone
from typing import Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


UserRole = Literal["user", "mentor", "admin"]
BookingStatus = Literal["active", "completed", "cancelled"]
SessionType = Literal["individual", "group"]

MentorSortField = Literal["created_at", "price", "rating", "experience_years", "name"]
BookingSortField = Literal["created_at", "session_date", "price", "status"]
NoteSortField = Literal["created_at", "updated_at"]
UserSortField = Literal["created_at", "username", "email", "role"]
SortOrder = Literal["asc", "desc"]

FileOwnerType = Literal["user", "mentor", "booking", "note"]
FileCategory = Literal[
    "avatar",
    "certificate",
    "medical_document",
    "booking_document",
    "note_attachment",
    "other",
]

T = TypeVar("T")


def _serialize_datetime_to_moscow(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    moscow_tz = timezone(timedelta(hours=3))
    return value.astimezone(moscow_tz).isoformat()


class DateTimeSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: _serialize_datetime_to_moscow},
    )


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Номер страницы, начиная с 1")
    page_size: int = Field(default=10, ge=1, le=100, description="Размер страницы")

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size

    model_config = ConfigDict(from_attributes=True)


class SortParams(BaseModel):
    sort_order: SortOrder = "desc"

    model_config = ConfigDict(from_attributes=True)


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    meta: PageMeta

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

    @field_validator("city", "yoga_style", "experience", "goals")
    @classmethod
    def strip_optional_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None

    @field_validator("city", "yoga_style", "experience", "goals")
    @classmethod
    def strip_optional_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

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


class UserListItem(DateTimeSchema):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListQuery(PaginationParams, SortParams):
    search: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    sort_by: UserSortField = "created_at"

    @field_validator("search")
    @classmethod
    def normalize_search(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class UserListPage(PaginatedResponse[UserListItem]):
    pass


class LoginRequest(BaseModel):
    login: str
    password: str

    @field_validator("login")
    @classmethod
    def validate_login(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Логин не может быть пустым")
        return stripped

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


class MentorFilters(BaseModel):
    search: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    min_price: Optional[int] = Field(default=None, ge=0)
    max_price: Optional[int] = Field(default=None, ge=0)
    is_available: Optional[bool] = None

    @field_validator("search", "gender", "city", "yoga_style")
    @classmethod
    def normalize_text_filters(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("max_price")
    @classmethod
    def validate_price_range(cls, value: Optional[int], info) -> Optional[int]:
        min_price = info.data.get("min_price")
        if value is not None and min_price is not None and value < min_price:
            raise ValueError("max_price не может быть меньше min_price")
        return value

    model_config = ConfigDict(from_attributes=True)


class MentorListQuery(PaginationParams, SortParams):
    search: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    min_price: Optional[int] = Field(default=None, ge=0)
    max_price: Optional[int] = Field(default=None, ge=0)
    is_available: Optional[bool] = None
    sort_by: MentorSortField = "created_at"

    @field_validator("search", "gender", "city", "yoga_style")
    @classmethod
    def normalize_text_filters(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("max_price")
    @classmethod
    def validate_price_range(cls, value: Optional[int], info) -> Optional[int]:
        min_price = info.data.get("min_price")
        if value is not None and min_price is not None and value < min_price:
            raise ValueError("max_price не может быть меньше min_price")
        return value

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

    @field_validator("name", "description", "gender", "city", "yoga_style", "photo_url")
    @classmethod
    def strip_optional_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        if value < 0:
            raise ValueError("Цена не может быть отрицательной")
        return value

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


class MentorSelfUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience_years: Optional[int] = None
    photo_url: Optional[str] = None
    is_available: Optional[bool] = None

    @field_validator("name", "description", "gender", "city", "yoga_style", "photo_url")
    @classmethod
    def strip_optional_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("experience_years")
    @classmethod
    def validate_experience_years(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        if value < 0:
            raise ValueError("Опыт не может быть отрицательным")
        return value

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


class MentorListPage(PaginatedResponse[MentorResponse]):
    pass


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


class NoteUpdate(NoteCreate):
    expected_updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NoteListQuery(PaginationParams, SortParams):
    search: Optional[str] = None
    sort_by: NoteSortField = "created_at"

    @field_validator("search")
    @classmethod
    def normalize_search(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class NoteResponse(DateTimeSchema):
    id: int
    user_id: int
    text: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NoteListPage(PaginatedResponse[NoteResponse]):
    pass


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


class BookingUpdate(BaseModel):
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, gt=0)
    notes: Optional[str] = None
    session_type: Optional[SessionType] = None
    expected_updated_at: Optional[datetime] = None

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


class BookingListQuery(PaginationParams, SortParams):
    status: Optional[BookingStatus] = None
    mentor_id: Optional[int] = None
    session_type: Optional[SessionType] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: BookingSortField = "session_date"

    @field_validator("date_to")
    @classmethod
    def validate_date_range(cls, value: Optional[datetime], info) -> Optional[datetime]:
        date_from = info.data.get("date_from")
        if value is not None and date_from is not None and value < date_from:
            raise ValueError("date_to не может быть раньше date_from")
        return value

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


class BookingListPage(PaginatedResponse[BookingResponse]):
    pass


class FileAttachmentBase(BaseModel):
    owner_type: FileOwnerType
    owner_id: int
    category: FileCategory = "other"

    model_config = ConfigDict(from_attributes=True)


class FileUploadRequest(BaseModel):
    filename: str
    content_base64: str
    mime_type: Optional[str] = None
    category: FileCategory = "other"

    @field_validator("filename", "content_base64")
    @classmethod
    def validate_required_strings(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Поле не может быть пустым")
        return stripped

    @field_validator("mime_type")
    @classmethod
    def normalize_mime_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip().lower()
        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class FileAttachmentCreate(FileAttachmentBase):
    original_filename: str
    stored_filename: str
    file_url: str
    mime_type: Optional[str] = None
    size_bytes: int = Field(ge=0)

    @field_validator("original_filename", "stored_filename", "file_url")
    @classmethod
    def validate_required_strings(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Поле не может быть пустым")
        return stripped

    @field_validator("mime_type")
    @classmethod
    def normalize_mime_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    model_config = ConfigDict(from_attributes=True)


class FileAttachmentResponse(DateTimeSchema):
    id: int
    owner_type: FileOwnerType
    owner_id: int
    category: FileCategory
    original_filename: str
    stored_filename: str
    file_url: str
    mime_type: Optional[str] = None
    size_bytes: int
    uploaded_by_user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileAttachmentListQuery(PaginationParams, SortParams):
    owner_type: Optional[FileOwnerType] = None
    owner_id: Optional[int] = None
    category: Optional[FileCategory] = None

    model_config = ConfigDict(from_attributes=True)


class FileAttachmentListPage(PaginatedResponse[FileAttachmentResponse]):
    pass


class FileAccessUrlResponse(BaseModel):
    url: str
    expires_in: int

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# WEATHER
# =============================================================================

class WeatherForecast(DateTimeSchema):
    """Нормализованный прогноз погоды для города на конкретный момент времени."""

    city: str
    country: str
    datetime_utc: datetime
    temperature_celsius: float
    feels_like_celsius: float
    humidity_percent: int
    wind_speed_ms: float
    # "Clear", "Clouds", "Rain", "Snow", "Thunderstorm", …
    condition: str
    # Локализованное описание на русском языке
    description: str
    # Код иконки OpenWeatherMap, например "01d"
    icon_code: str
    # True, если погода подходит для занятий йогой на улице
    is_outdoor_suitable: bool


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