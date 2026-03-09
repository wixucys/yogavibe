from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr, field_serializer, validator, ConfigDict


# Базовая схема пользователя
class UserBase(BaseModel):
    username: str
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)


# Схема для создания пользователя
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    
    @validator('email')
    def email_to_lower(cls, v: str) -> str:
        # Приводит email к нижнему регистру
        return v.lower()
    
    model_config = ConfigDict(from_attributes=True)


# Схема для обновления пользователя
class UserUpdate(BaseModel):
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# Схема ответа с пользователем
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    city: Optional[str] = None
    yoga_style: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[str] = None
    created_at: datetime
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)



# СХЕМЫ ДЛЯ АУТЕНТИФИКАЦИИ 

# Схема для входа в систему
class LoginRequest(BaseModel):
    login: str
    password: str
    
    model_config = ConfigDict(from_attributes=True)


# Схема токенов
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    
    model_config = ConfigDict(from_attributes=True)


# Схема для обновления токена
class TokenRefreshRequest(BaseModel):
    refresh_token: str
    
    model_config = ConfigDict(from_attributes=True)


# Схема ответа аутентификации
class AuthResponse(Token):
    user: UserResponse
    
    model_config = ConfigDict(from_attributes=True)



# СХЕМЫ ДЛЯ МЕНТОРОВ 

# Базовая схема ментора
class MentorBase(BaseModel):
    name: str
    description: str
    gender: str
    city: str
    price: int
    yoga_style: str
    
    model_config = ConfigDict(from_attributes=True)


# Схема для создания ментора
class MentorCreate(MentorBase):
    rating: Optional[float] = 0.0
    experience_years: Optional[int] = 0
    photo_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# Схема ответа с ментором
class MentorResponse(MentorBase):
    id: int
    rating: float
    experience_years: int
    photo_url: Optional[str] = None
    is_available: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)



# СХЕМЫ ДЛЯ ЗАМЕТОК 

# Базовая схема заметки
class NoteBase(BaseModel):
    text: str
    
    model_config = ConfigDict(from_attributes=True)


# Схема для создания заметки
class NoteCreate(NoteBase):
    @validator('text')
    def validate_text_length(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Текст заметки не может быть пустым')
        if len(v) > 1000:
            raise ValueError('Текст заметки слишком длинный')
        return v


# Схема ответа с заметкой
class NoteResponse(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @field_serializer('created_at', 'updated_at')
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

# Базовая схема бронирования
class BookingBase(BaseModel):
    mentor_id: int
    session_date: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# Схема для создания бронирования
class BookingCreate(BookingBase):
    pass


# Схема ответа с бронированием
class BookingResponse(BookingBase):
    id: int
    user_id: int
    price: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# Схема для обновления бронирования
class BookingUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)