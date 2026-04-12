from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

import math
from . import models_db as models
from . import schemas
from .utils import get_password_hash, verify_password


def build_page_meta(page: int, page_size: int, total: int) -> schemas.PageMeta:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return schemas.PageMeta(
        page=page,
        page_size=page_size,
        total=total,
        pages=pages,
    )


def normalize_search_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized = " ".join(value.strip().replace("ё", "е").replace("Ё", "Е").split())
    return normalized or None


def build_search_variants(value: str) -> list[str]:
    variants = {
        value,
        value.lower(),
        value.upper(),
        value.capitalize(),
        value.title(),
    }
    return [variant for variant in variants if variant]


def normalize_search_column(column):
    return func.replace(func.replace(func.coalesce(column, ""), "ё", "е"), "Ё", "Е")


class UserCRUD:
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[models.User]:
        stmt = (
            select(models.User)
            .options(
                selectinload(models.User.mentor_profile),
                selectinload(models.User.avatar_file),
            )
            .where(models.User.id == user_id)
        )
        return db.scalar(stmt)

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
            or_(
                models.User.email == login.lower(),
                models.User.username == login,
            )
        )
        return db.scalar(stmt)

    @staticmethod
    def authenticate_user(db: Session, login: str, password: str) -> Optional[models.User]:
        user = UserCRUD.get_user_by_login(db, login)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def get_users_page(
        db: Session,
        query: schemas.UserListQuery,
    ) -> tuple[list[models.User], int]:
        stmt = select(models.User)

        if query.search:
            pattern = f"%{query.search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(models.User.username).like(pattern),
                    func.lower(models.User.email).like(pattern),
                )
            )

        if query.role:
            stmt = stmt.where(models.User.role == query.role)

        if query.is_active is not None:
            stmt = stmt.where(models.User.is_active.is_(query.is_active))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        sort_field_map = {
            "created_at": models.User.created_at,
            "username": models.User.username,
            "email": models.User.email,
            "role": models.User.role,
        }
        sort_column = sort_field_map[query.sort_by]
        stmt = stmt.order_by(
            sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        users = list(db.scalars(stmt))
        return users, total

    @staticmethod
    def count_users_by_role(db: Session, role: str) -> int:
        stmt = select(func.count(models.User.id)).where(models.User.role == role)
        return int(db.scalar(stmt) or 0)

    @staticmethod
    def count_all_users(db: Session) -> int:
        stmt = select(func.count(models.User.id))
        return int(db.scalar(stmt) or 0)

    @staticmethod
    def count_active_users(db: Session) -> int:
        stmt = select(func.count(models.User.id)).where(models.User.is_active.is_(True))
        return int(db.scalar(stmt) or 0)

    @staticmethod
    def create_user(
        db: Session,
        user_data: schemas.UserCreate,
        role: str = "user",
        is_active: bool = True,
    ) -> models.User:
        hashed_password = get_password_hash(user_data.password)

        user = models.User(
            username=user_data.username.strip(),
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            role=role,
            is_active=is_active,
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

        allowed_fields = {"city", "yoga_style", "experience", "goals", "avatar_file_id"}

        for key, value in updates.items():
            if key in allowed_fields:
                setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def admin_update_user(
        db: Session,
        user_id: int,
        updates: dict,
    ) -> Optional[models.User]:
        user = UserCRUD.get_user(db, user_id)
        if not user:
            return None

        allowed_fields = {
            "role",
            "is_active",
            "city",
            "yoga_style",
            "experience",
            "goals",
            "avatar_file_id",
        }

        new_role = updates.get("role")
        if new_role and user.role == "mentor" and new_role != "mentor":
            mentor_profile = MentorCRUD.get_mentor_by_user_id(db, user.id)
            if mentor_profile:
                raise ValueError(
                    "Нельзя снять роль mentor, пока у пользователя существует профиль ментора"
                )

        if "is_active" in updates and user.role == "admin" and updates["is_active"] is False:
            admins_count = UserCRUD.count_users_by_role(db, "admin")
            if admins_count <= 1:
                raise ValueError("Нельзя деактивировать последнего администратора")

        if new_role and user.role == "admin" and new_role != "admin":
            admins_count = UserCRUD.count_users_by_role(db, "admin")
            if admins_count <= 1:
                raise ValueError("Нельзя изменить роль последнего администратора")

        for key, value in updates.items():
            if key in allowed_fields:
                setattr(user, key, value)

        if "is_active" in updates and updates["is_active"] is False:
            stmt = select(models.RefreshToken).where(
                models.RefreshToken.user_id == user_id,
                models.RefreshToken.is_active.is_(True),
            )
            tokens = db.scalars(stmt).all()
            for token in tokens:
                token.is_active = False

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        user = UserCRUD.get_user(db, user_id)
        if not user:
            return False

        if user.role == "admin":
            admins_count = UserCRUD.count_users_by_role(db, "admin")
            if admins_count <= 1:
                raise ValueError("Нельзя удалить последнего администратора")

        mentor_profile = MentorCRUD.get_mentor_by_user_id(db, user.id)
        if mentor_profile:
            db.delete(mentor_profile)

        db.execute(
            delete(models.FileAttachment).where(
                models.FileAttachment.uploaded_by_user_id == user.id,
            )
        )

        db.delete(user)
        db.commit()
        return True


class MentorCRUD:
    @staticmethod
    def get_mentor(db: Session, mentor_id: int) -> Optional[models.Mentor]:
        stmt = (
            select(models.Mentor)
            .options(
                selectinload(models.Mentor.user),
                selectinload(models.Mentor.photo_file),
            )
            .where(models.Mentor.id == mentor_id)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_mentor_by_user_id(db: Session, user_id: int) -> Optional[models.Mentor]:
        stmt = (
            select(models.Mentor)
            .options(
                selectinload(models.Mentor.user),
                selectinload(models.Mentor.photo_file),
            )
            .where(models.Mentor.user_id == user_id)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_mentors_page(
        db: Session,
        query: schemas.MentorListQuery,
        admin_mode: bool = False,
    ) -> tuple[list[models.Mentor], int]:
        stmt = select(models.Mentor)

        if not admin_mode:
            stmt = stmt.where(models.Mentor.is_available.is_(True))

        if query.search:
            normalized_search = normalize_search_value(query.search)
            if normalized_search:
                searchable_columns = (
                    normalize_search_column(models.Mentor.name),
                    normalize_search_column(models.Mentor.description),
                    normalize_search_column(models.Mentor.city),
                    normalize_search_column(models.Mentor.yoga_style),
                )
                search_tokens = [token for token in normalized_search.split(" ") if token]
                token_conditions = []

                for token in search_tokens:
                    patterns = [f"%{variant}%" for variant in build_search_variants(token)]
                    token_conditions.append(
                        or_(
                            *[
                                column.like(pattern)
                                for column in searchable_columns
                                for pattern in patterns
                            ]
                        )
                    )

                if token_conditions:
                    stmt = stmt.where(and_(*token_conditions))

        if query.gender:
            normalized_gender = normalize_search_value(query.gender)
            if normalized_gender:
                stmt = stmt.where(
                    or_(
                        *[
                            normalize_search_column(models.Mentor.gender) == variant
                            for variant in build_search_variants(normalized_gender)
                        ]
                    )
                )

        if query.city:
            normalized_city = normalize_search_value(query.city)
            if normalized_city:
                city_patterns = [
                    f"%{variant}%" for variant in build_search_variants(normalized_city)
                ]
                stmt = stmt.where(
                    or_(
                        *[
                            normalize_search_column(models.Mentor.city).like(pattern)
                            for pattern in city_patterns
                        ]
                    )
                )

        if query.yoga_style:
            normalized_style = normalize_search_value(query.yoga_style)
            if normalized_style:
                style_patterns = [
                    f"%{variant}%" for variant in build_search_variants(normalized_style)
                ]
                stmt = stmt.where(
                    or_(
                        *[
                            normalize_search_column(models.Mentor.yoga_style).like(pattern)
                            for pattern in style_patterns
                        ]
                    )
                )

        if query.min_price is not None:
            stmt = stmt.where(models.Mentor.price >= query.min_price)

        if query.max_price is not None:
            stmt = stmt.where(models.Mentor.price <= query.max_price)

        if query.is_available is not None:
            stmt = stmt.where(models.Mentor.is_available.is_(query.is_available))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        sort_field_map = {
            "created_at": models.Mentor.created_at,
            "price": models.Mentor.price,
            "rating": models.Mentor.rating,
            "experience_years": models.Mentor.experience_years,
            "name": models.Mentor.name,
        }
        sort_column = sort_field_map[query.sort_by]
        stmt = stmt.order_by(
            sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        mentors = list(db.scalars(stmt))
        return mentors, total

    @staticmethod
    def count_mentor_profiles(db: Session) -> int:
        stmt = select(func.count(models.Mentor.id))
        return int(db.scalar(stmt) or 0)

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

        allowed_fields = {
            "name",
            "description",
            "gender",
            "city",
            "price",
            "yoga_style",
            "rating",
            "experience_years",
            "photo_url",
            "photo_file_id",
            "is_available",
        }

        for key, value in updates.items():
            if key in allowed_fields:
                setattr(mentor, key, value)

        db.commit()
        db.refresh(mentor)
        return mentor

    @staticmethod
    def update_mentor_self(db: Session, mentor_id: int, updates: dict) -> Optional[models.Mentor]:
        mentor = MentorCRUD.get_mentor(db, mentor_id)
        if not mentor:
            return None

        allowed_fields = {
            "name",
            "description",
            "gender",
            "city",
            "yoga_style",
            "experience_years",
            "photo_url",
            "photo_file_id",
            "is_available",
        }

        for key, value in updates.items():
            if key in allowed_fields:
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
        stmt = (
            select(models.Note)
            .options(selectinload(models.Note.attachments))
            .where(models.Note.id == note_id)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_user_notes_page(
        db: Session,
        user_id: int,
        query: schemas.NoteListQuery,
    ) -> tuple[list[models.Note], int]:
        stmt = select(models.Note).where(models.Note.user_id == user_id)

        if query.search:
            pattern = f"%{query.search.lower()}%"
            stmt = stmt.where(func.lower(models.Note.text).like(pattern))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        sort_field_map = {
            "created_at": models.Note.created_at,
            "updated_at": models.Note.updated_at,
        }
        sort_column = sort_field_map[query.sort_by]
        stmt = stmt.order_by(
            sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        notes = list(db.scalars(stmt))
        return notes, total

    @staticmethod
    def count_notes(db: Session) -> int:
        stmt = select(func.count(models.Note.id))
        return int(db.scalar(stmt) or 0)

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
            .options(
                selectinload(models.Booking.mentor),
                selectinload(models.Booking.attachments),
            )
            .where(models.Booking.id == booking_id)
        )
        return db.scalar(stmt)

    @staticmethod
    def get_user_bookings_page(
        db: Session,
        user_id: int,
        query: schemas.BookingListQuery,
    ) -> tuple[list[models.Booking], int]:
        stmt = (
            select(models.Booking)
            .options(selectinload(models.Booking.mentor))
            .where(models.Booking.user_id == user_id)
        )

        if query.status:
            stmt = stmt.where(models.Booking.status == query.status)

        if query.mentor_id is not None:
            stmt = stmt.where(models.Booking.mentor_id == query.mentor_id)

        if query.session_type:
            stmt = stmt.where(models.Booking.session_type == query.session_type)

        if query.date_from is not None:
            stmt = stmt.where(models.Booking.session_date >= query.date_from)

        if query.date_to is not None:
            stmt = stmt.where(models.Booking.session_date <= query.date_to)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        sort_field_map = {
            "created_at": models.Booking.created_at,
            "session_date": models.Booking.session_date,
            "price": models.Booking.price,
            "status": models.Booking.status,
        }
        sort_column = sort_field_map[query.sort_by]
        stmt = stmt.order_by(
            sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        bookings = list(db.scalars(stmt))
        return bookings, total

    @staticmethod
    def get_mentor_bookings_page(
        db: Session,
        mentor_id: int,
        query: schemas.BookingListQuery,
    ) -> tuple[list[models.Booking], int]:
        stmt = (
            select(models.Booking)
            .options(selectinload(models.Booking.mentor))
            .where(models.Booking.mentor_id == mentor_id)
        )

        if query.status:
            stmt = stmt.where(models.Booking.status == query.status)

        if query.session_type:
            stmt = stmt.where(models.Booking.session_type == query.session_type)

        if query.date_from is not None:
            stmt = stmt.where(models.Booking.session_date >= query.date_from)

        if query.date_to is not None:
            stmt = stmt.where(models.Booking.session_date <= query.date_to)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        sort_field_map = {
            "created_at": models.Booking.created_at,
            "session_date": models.Booking.session_date,
            "price": models.Booking.price,
            "status": models.Booking.status,
        }
        sort_column = sort_field_map[query.sort_by]
        stmt = stmt.order_by(
            sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        bookings = list(db.scalars(stmt))
        return bookings, total

    @staticmethod
    def count_bookings(db: Session) -> int:
        stmt = select(func.count(models.Booking.id))
        return int(db.scalar(stmt) or 0)

    @staticmethod
    def count_bookings_by_status(db: Session, status: str) -> int:
        stmt = select(func.count(models.Booking.id)).where(models.Booking.status == status)
        return int(db.scalar(stmt) or 0)

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
    def update_booking(
        db: Session,
        booking_id: int,
        updates: schemas.BookingUpdate,
    ) -> Optional[models.Booking]:
        booking = BookingCRUD.get_booking(db, booking_id)
        if not booking:
            return None

        if updates.session_date is not None:
            booking.session_date = updates.session_date

        if updates.duration_minutes is not None:
            booking.duration_minutes = updates.duration_minutes

        if updates.notes is not None:
            booking.notes = updates.notes

        if updates.session_type is not None:
            booking.session_type = updates.session_type

        if updates.session_date is not None or updates.duration_minutes is not None:
            mentor = MentorCRUD.get_mentor(db, booking.mentor_id)
            if mentor:
                hours = math.ceil(booking.duration_minutes / 60)
                booking.price = mentor.price * hours

        booking.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(booking)
        return BookingCRUD.get_booking(db, booking.id)

    @staticmethod
    def delete_booking(db: Session, booking_id: int) -> bool:
        booking = BookingCRUD.get_booking(db, booking_id)
        if not booking:
            return False

        db.delete(booking)
        db.commit()
        return True


class FileAttachmentCRUD:
    @staticmethod
    def get_file(db: Session, file_id: int) -> Optional[models.FileAttachment]:
        return db.get(models.FileAttachment, file_id)

    @staticmethod
    def create_file(
        db: Session,
        file_data: schemas.FileAttachmentCreate,
        uploaded_by_user_id: int,
    ) -> models.FileAttachment:
        payload = file_data.model_dump()
        owner_type = payload.pop("owner_type")
        owner_id = payload.pop("owner_id")

        relation_fields = {
            "user_id": None,
            "mentor_id": None,
            "booking_id": None,
            "note_id": None,
        }

        owner_field_map = {
            "user": "user_id",
            "mentor": "mentor_id",
            "booking": "booking_id",
            "note": "note_id",
        }
        relation_fields[owner_field_map[owner_type]] = owner_id

        file_attachment = models.FileAttachment(
            uploaded_by_user_id=uploaded_by_user_id,
            **payload,
            **relation_fields,
        )

        db.add(file_attachment)
        db.commit()
        db.refresh(file_attachment)
        return file_attachment

    @staticmethod
    def get_files_page(
        db: Session,
        query: schemas.FileAttachmentListQuery,
    ) -> tuple[list[models.FileAttachment], int]:
        stmt = select(models.FileAttachment)

        if query.owner_type:
            owner_field_map = {
                "user": models.FileAttachment.user_id,
                "mentor": models.FileAttachment.mentor_id,
                "booking": models.FileAttachment.booking_id,
                "note": models.FileAttachment.note_id,
            }
            stmt = stmt.where(owner_field_map[query.owner_type].is_not(None))

        if query.owner_id is not None:
            stmt = stmt.where(
                or_(
                    models.FileAttachment.user_id == query.owner_id,
                    models.FileAttachment.mentor_id == query.owner_id,
                    models.FileAttachment.booking_id == query.owner_id,
                    models.FileAttachment.note_id == query.owner_id,
                )
            )

        if query.category:
            stmt = stmt.where(models.FileAttachment.category == query.category)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(db.scalar(count_stmt) or 0)

        stmt = stmt.order_by(
            models.FileAttachment.created_at.asc()
            if query.sort_order == "asc"
            else models.FileAttachment.created_at.desc()
        )

        stmt = stmt.offset(query.skip).limit(query.page_size)
        items = list(db.scalars(stmt))
        return items, total

    @staticmethod
    def delete_file(db: Session, file_id: int) -> bool:
        file_attachment = FileAttachmentCRUD.get_file(db, file_id)
        if not file_attachment:
            return False

        users_with_avatar = db.query(models.User).filter(models.User.avatar_file_id == file_id)
        for user in users_with_avatar:
            user.avatar_file_id = None

        mentors_with_photo = db.query(models.Mentor).filter(models.Mentor.photo_file_id == file_id)
        for mentor in mentors_with_photo:
            mentor.photo_file_id = None

        db.delete(file_attachment)
        db.commit()
        return True


class RefreshTokenCRUD:
    @staticmethod
    def create_token(db: Session, token: str, user_id: int, expires_delta: timedelta) -> models.RefreshToken:
        expires_at = datetime.now(timezone.utc) + expires_delta

        existing_token = (
            db.query(models.RefreshToken)
            .filter(models.RefreshToken.token == token)
            .first()
        )

        if existing_token:
            existing_token.expires_at = expires_at
            existing_token.is_active = True
            db.commit()
            db.refresh(existing_token)
            return existing_token

        refresh_token = models.RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
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
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
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
    def clear_all_user_tokens(db: Session, user_id: int) -> int:
        stmt = select(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.is_active.is_(True),
        )
        tokens = db.scalars(stmt).all()

        deactivated_count = 0
        for token in tokens:
            token.is_active = False
            deactivated_count += 1

        if deactivated_count > 0:
            db.commit()

        return deactivated_count

    @staticmethod
    def clear_expired_tokens(db: Session, user_id: int) -> None:
        stmt = delete(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.expires_at <= datetime.now(timezone.utc),
        )
        db.execute(stmt)
        db.commit()


user_crud = UserCRUD()
mentor_crud = MentorCRUD()
note_crud = NoteCRUD()
booking_crud = BookingCRUD()
file_attachment_crud = FileAttachmentCRUD()
refresh_token_crud = RefreshTokenCRUD()
