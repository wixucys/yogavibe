import math
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select, delete
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import models_db as models
import schemas
from utils import get_password_hash, verify_password


# CRUD операции для пользователей
class UserCRUD:
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[models.User]:
        # Получить пользователя по ID
        return db.get(models.User, user_id)
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
        # Получить пользователя по email
        stmt = select(models.User).where(models.User.email == email)
        return db.scalar(stmt)
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
        # Получить пользователя по имени пользователя
        stmt = select(models.User).where(models.User.username == username)
        return db.scalar(stmt)
    
    @staticmethod
    def authenticate_user(db: Session, login: str, password: str) -> Optional[models.User]:
        # Аутентификация пользователя по email или username
        stmt = select(models.User).where(
            or_(
                models.User.email == login,
                models.User.username == login
            )
        )
        user = db.scalar(stmt)
        
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
        # Создать нового пользователя
        hashed_password = get_password_hash(user_data.password)
        
        user = models.User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def update_user(db: Session, user_id: int, updates: dict) -> Optional[models.User]:
        # Обновить данные пользователя
        user = UserCRUD.get_user(db, user_id)
        if not user:
            return None
        
        for key, value in updates.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        return user


# CRUD операции для менторов
class MentorCRUD:
    @staticmethod
    def get_mentor(db: Session, mentor_id: int) -> Optional[models.Mentor]:
        # Получить ментора по ID
        return db.get(models.Mentor, mentor_id)
    
    @staticmethod
    def get_mentors(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        city: Optional[str] = None,
        yoga_style: Optional[str] = None
    ) -> List[models.Mentor]:
        # Получить список менторов с фильтрацией
        stmt = select(models.Mentor).where(models.Mentor.is_available == True)
        
        if city:
            stmt = stmt.where(models.Mentor.city == city)
        if yoga_style:
            stmt = stmt.where(models.Mentor.yoga_style == yoga_style)
        
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt))
    
    @staticmethod
    def create_mentor(db: Session, mentor_data: schemas.MentorCreate) -> models.Mentor:
        # Создать нового ментора
        mentor = models.Mentor(**mentor_data.model_dump())
        db.add(mentor)
        db.commit()
        db.refresh(mentor)
        return mentor


# CRUD операции для заметок
class NoteCRUD:
    @staticmethod
    def get_note(db: Session, note_id: int) -> Optional[models.Note]:
        # Получить заметку по ID
        return db.get(models.Note, note_id)
    
    @staticmethod
    def get_user_notes(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[models.Note]:
        # Получить заметки пользователя
        stmt = select(models.Note).where(
            models.Note.user_id == user_id
        ).order_by(models.Note.created_at.desc()).offset(skip).limit(limit)
        
        return list(db.scalars(stmt))
    
    @staticmethod
    def create_note(db: Session, note_data: schemas.NoteCreate, user_id: int) -> models.Note:
        # Создать новую заметку
        note = models.Note(
            text=note_data.text,
            user_id=user_id
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note
    
    @staticmethod
    def update_note(db: Session, note_id: int, updates: schemas.NoteCreate) -> Optional[models.Note]:
        # Обновить заметку
        note = NoteCRUD.get_note(db, note_id)
        if not note:
            return None
        
        note.text = updates.text
        note.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(note)
        return note
    
    @staticmethod
    def delete_note(db: Session, note_id: int) -> bool:
        # Удалить заметку
        note = NoteCRUD.get_note(db, note_id)
        if not note:
            return False
        
        db.delete(note)
        db.commit()
        return True


# CRUD операции для бронирований
class BookingCRUD:
    @staticmethod
    def get_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
        # Получить бронирование по ID
        return db.get(models.Booking, booking_id)
    
    @staticmethod
    def get_user_bookings(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[models.Booking]:
        # Получить бронирования пользователя
        stmt = select(models.Booking).where(
            models.Booking.user_id == user_id
        ).order_by(models.Booking.session_date.desc()).offset(skip).limit(limit)
        
        return list(db.scalars(stmt))
    
    @staticmethod
    def create_booking(db: Session, booking_data: schemas.BookingCreate, user_id: int) -> models.Booking:
        # Создать новое бронирование
        mentor = MentorCRUD.get_mentor(db, booking_data.mentor_id)
        if not mentor:
            raise ValueError("Ментор не найден")
        
        # Проверяем доступность ментора
        if not mentor.is_available:
            raise ValueError("Ментор временно недоступен")
        
        conflicting_booking = db.scalar(
            select(models.Booking).where(
                and_(
                    models.Booking.mentor_id == booking_data.mentor_id,
                    models.Booking.session_date == booking_data.session_date,
                    models.Booking.status.in_(["pending", "confirmed"])
                )
            )
        )
        
        if conflicting_booking:
            raise ValueError("На это время уже есть бронирование")
        
        # Расчет цены
        hours = math.ceil(booking_data.duration_minutes / 60)
        price = mentor.price * hours
        
        booking = models.Booking(
            user_id=user_id,
            mentor_id=booking_data.mentor_id,
            session_date=booking_data.session_date,
            duration_minutes=booking_data.duration_minutes,
            price=price,
            notes=booking_data.notes,
            status="pending"
        )
        
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking
    
    @staticmethod
    def update_booking_status(db: Session, booking_id: int, status: str) -> Optional[models.Booking]:
        # Обновить статус бронирования
        booking = BookingCRUD.get_booking(db, booking_id)
        if not booking:
            return None
        
        booking.status = status
        booking.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(booking)
        return booking


# CRUD операции для refresh токенов
class RefreshTokenCRUD:
    @staticmethod
    def create_token(db: Session, token: str, user_id: int, expires_delta: timedelta) -> models.RefreshToken:
        # Создать новый refresh токен
        expires_at = datetime.now(timezone.utc) + expires_delta
        
        # Сначала проверяем, нет ли такого токена
        existing_token = db.query(models.RefreshToken).filter(
            models.RefreshToken.token == token
        ).first()
        
        if existing_token:
            # Если токен уже существует, обновляем его
            existing_token.expires_at = expires_at
            existing_token.is_active = True
            db.commit()
            db.refresh(existing_token)
            return existing_token
        
        # Если токена нет, создаем новый
        refresh_token = models.RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at
        )
        
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        return refresh_token
    
    @staticmethod
    def get_token(db: Session, token: str) -> Optional[models.RefreshToken]:
        # Получить refresh токен
        stmt = select(models.RefreshToken).where(
            models.RefreshToken.token == token,
            models.RefreshToken.is_active == True,
            models.RefreshToken.expires_at > datetime.now(timezone.utc)
        )
        return db.scalar(stmt)
    
    @staticmethod
    def deactivate_token(db: Session, token: str) -> bool:
        # Деактивировать refresh токен
        refresh_token = RefreshTokenCRUD.get_token(db, token)
        if not refresh_token:
            return False
        
        refresh_token.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def clear_expired_tokens(db: Session, user_id: int) -> None:
        # Очистить просроченные токены пользователя
        stmt = delete(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.expires_at <= datetime.now(timezone.utc)
        )
        db.execute(stmt)
        db.commit()


# Создание экземпляров CRUD классов
user_crud = UserCRUD()
mentor_crud = MentorCRUD()
note_crud = NoteCRUD()
booking_crud = BookingCRUD()
refresh_token_crud = RefreshTokenCRUD()