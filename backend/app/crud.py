from datetime import datetime, timedelta, timezone
from typing import Optional, List
import math

from sqlalchemy import select, delete, and_
from sqlalchemy.orm import Session, selectinload

import models_db as models
import schemas
from utils import verify_password, get_password_hash


class UserCRUD:
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[models.User]:
        return db.get(models.User, user_id)

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
        stmt = select(models.User).where(models.User.email == email.lower())
        return db.scalar(stmt)

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
        stmt = select(models.User).where(models.User.username == username)
        return db.scalar(stmt)

    @staticmethod
    def get_user_by_login(db: Session, login: str) -> Optional[models.User]:
        login = login.strip()
        stmt = select(models.User).where(
            (models.User.email == login.lower()) | (models.User.username == login)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
        stmt = (
            select(models.User)
            .order_by(models.User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(db.scalars(stmt))

    @staticmethod
    def authenticate_user(db: Session, login: str, password: str) -> Optional[models.User]:
        user = UserCRUD.get_user_by_login(db, login)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
        hashed_password = get_password_hash(user_data.password)

        user = models.User(
            username=user_data.username,
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            role="user",
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, updates: dict) -> Optional[models.User]:
        user = UserCRUD.get_user(db, user_id)
        if not user:
            return None

        allowed_fields = {"city", "yoga_style", "experience", "goals"}

        for key, value in updates.items():
            if key in allowed_fields and value is not None:
                setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def admin_update_user(db: Session, user_id: int, updates: dict) -> Optional[models.User]:
        user = UserCRUD.get_user(db, user_id)
        if not user:
            return None

        allowed_fields = {"role", "is_active", "city", "yoga_style", "experience", "goals"}

        for key, value in updates.items():
            if key in allowed_fields and value is not None:
                setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user


class MentorCRUD:
    @staticmethod
    def get_mentor(db: Session, mentor_id: int) -> Optional[models.Mentor]:
        return db.get(models.Mentor, mentor_id)

    @staticmethod
    def get_mentor_by_user_id(db: Session, user_id: int) -> Optional[models.Mentor]:
        stmt = select(models.Mentor).where(models.Mentor.user_id == user_id)
        return db.scalar(stmt)

    @staticmethod
    def get_mentors(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        city: Optional[str] = None,
        yoga_style: Optional[str] = None
    ) -> List[models.Mentor]:
        stmt = select(models.Mentor).where(models.Mentor.is_available.is_(True))

        if city:
            stmt = stmt.where(models.Mentor.city == city)
        if yoga_style:
            stmt = stmt.where(models.Mentor.yoga_style == yoga_style)

        stmt = stmt.order_by(models.Mentor.created_at.desc()).offset(skip).limit(limit)
        return list(db.scalars(stmt))

    @staticmethod
    def create_mentor(db: Session, mentor_data: schemas.MentorCreate) -> models.Mentor:
        user = UserCRUD.get_user(db, mentor_data.user_id)
        if not user:
            raise ValueError("Пользователь для ментора не найден")

        if user.role != "mentor":
            raise ValueError("Профиль ментора можно создать только пользователю с ролью mentor")

        existing_mentor = MentorCRUD.get_mentor_by_user_id(db, mentor_data.user_id)
        if existing_mentor:
            raise ValueError("Для этого пользователя профиль ментора уже существует")

        mentor = models.Mentor(**mentor_data.model_dump())
        db.add(mentor)
        db.commit()
        db.refresh(mentor)
        return mentor

    @staticmethod
    def update_mentor(db: Session, mentor_id: int, updates: dict) -> Optional[models.Mentor]:
        mentor = MentorCRUD.get_mentor(db, mentor_id)
        if not mentor:
            return None

        for key, value in updates.items():
            if hasattr(mentor, key) and value is not None:
                setattr(mentor, key, value)

        db.commit()
        db.refresh(mentor)
        return mentor

    @staticmethod
    def delete_mentor(db: Session, mentor_id: int) -> bool:
        mentor = MentorCRUD.get_mentor(db, mentor_id)
        if not mentor:
            return False

        db.delete(mentor)
        db.commit()
        return True


class NoteCRUD:
    @staticmethod
    def get_note(db: Session, note_id: int) -> Optional[models.Note]:
        return db.get(models.Note, note_id)

    @staticmethod
    def get_user_notes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Note]:
        stmt = (
            select(models.Note)
            .where(models.Note.user_id == user_id)
            .order_by(models.Note.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(db.scalars(stmt))

    @staticmethod
    def create_note(db: Session, note_data: schemas.NoteCreate, user_id: int) -> models.Note:
        note = models.Note(text=note_data.text, user_id=user_id)
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def update_note(db: Session, note_id: int, updates: schemas.NoteCreate) -> Optional[models.Note]:
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
        note = NoteCRUD.get_note(db, note_id)
        if not note:
            return False

        db.delete(note)
        db.commit()
        return True


class BookingCRUD:
    @staticmethod
    def get_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
        stmt = (
            select(models.Booking)
            .options(selectinload(models.Booking.mentor))
            .where(models.Booking.id == booking_id)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_user_bookings(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Booking]:
        stmt = (
            select(models.Booking)
            .options(selectinload(models.Booking.mentor))
            .where(models.Booking.user_id == user_id)
            .order_by(models.Booking.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(db.scalars(stmt))

    @staticmethod
    def get_mentor_bookings(db: Session, mentor_id: int, skip: int = 0, limit: int = 100) -> List[models.Booking]:
        stmt = (
            select(models.Booking)
            .options(selectinload(models.Booking.mentor))
            .where(models.Booking.mentor_id == mentor_id)
            .order_by(models.Booking.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(db.scalars(stmt))

    @staticmethod
    def create_booking(db: Session, booking_data: schemas.BookingCreate, user_id: int) -> models.Booking:
        mentor = MentorCRUD.get_mentor(db, booking_data.mentor_id)
        if not mentor:
            raise ValueError("Ментор не найден")

        if not mentor.is_available:
            raise ValueError("Ментор временно недоступен")

        now = datetime.now(timezone.utc)
        session_date = booking_data.session_date
        if session_date.tzinfo is None:
            session_date = session_date.replace(tzinfo=timezone.utc)

        if session_date <= now:
            raise ValueError("Нельзя создать бронирование на прошедшее время")

        conflicting_booking = db.scalar(
            select(models.Booking).where(
                and_(
                    models.Booking.mentor_id == booking_data.mentor_id,
                    models.Booking.session_date == session_date,
                    models.Booking.status == "active",
                )
            )
        )

        if conflicting_booking:
            raise ValueError("На это время уже есть бронирование")

        hours = math.ceil(booking_data.duration_minutes / 60)
        price = mentor.price * hours

        booking = models.Booking(
            user_id=user_id,
            mentor_id=booking_data.mentor_id,
            session_date=session_date,
            duration_minutes=booking_data.duration_minutes,
            price=price,
            notes=booking_data.notes,
            session_type=booking_data.session_type,
            status="active",
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

        return BookingCRUD.get_booking(db, booking.id)

    @staticmethod
    def update_booking_status(db: Session, booking_id: int, status: str) -> Optional[models.Booking]:
        booking = BookingCRUD.get_booking(db, booking_id)
        if not booking:
            return None

        booking.status = status
        booking.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(booking)

        return BookingCRUD.get_booking(db, booking.id)

    @staticmethod
    def complete_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
        booking = BookingCRUD.get_booking(db, booking_id)
        if not booking:
            return None

        booking.status = "completed"
        booking.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(booking)

        return BookingCRUD.get_booking(db, booking.id)


class RefreshTokenCRUD:
    @staticmethod
    def create_token(db: Session, token: str, user_id: int, expires_delta: timedelta) -> models.RefreshToken:
        expires_at = datetime.now(timezone.utc) + expires_delta

        existing_token = db.query(models.RefreshToken).filter(
            models.RefreshToken.token == token
        ).first()

        if existing_token:
            existing_token.expires_at = expires_at
            existing_token.is_active = True
            db.commit()
            db.refresh(existing_token)
            return existing_token

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
        stmt = select(models.RefreshToken).where(
            models.RefreshToken.token == token,
            models.RefreshToken.is_active.is_(True),
            models.RefreshToken.expires_at > datetime.now(timezone.utc)
        )
        return db.scalar(stmt)

    @staticmethod
    def deactivate_token(db: Session, token: str) -> bool:
        refresh_token = RefreshTokenCRUD.get_token(db, token)
        if not refresh_token:
            return False

        refresh_token.is_active = False
        db.commit()
        return True

    @staticmethod
    def clear_expired_tokens(db: Session, user_id: int) -> None:
        stmt = delete(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.expires_at <= datetime.now(timezone.utc)
        )
        db.execute(stmt)
        db.commit()


user_crud = UserCRUD()
mentor_crud = MentorCRUD()
note_crud = NoteCRUD()
booking_crud = BookingCRUD()
refresh_token_crud = RefreshTokenCRUD()