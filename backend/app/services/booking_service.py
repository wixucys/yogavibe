from datetime import datetime, timezone

from sqlalchemy import and_, select

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .. import crud
from .. import models_db as models
from .. import schemas


class BookingService:
    """Business logic for booking operations"""

    @staticmethod
    def get_user_bookings(
        db: Session,
        user_id: int,
        query: schemas.BookingListQuery,
    ) -> schemas.BookingListPage:
        bookings, total = crud.booking_crud.get_user_bookings_page(
            db=db,
            user_id=user_id,
            query=query,
        )

        return schemas.BookingListPage(
            items=[schemas.BookingResponse.model_validate(booking) for booking in bookings],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @staticmethod
    def get_booking(
        db: Session,
        booking_id: int,
        user_id: int,
    ) -> schemas.BookingResponse:
        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя просматривать чужое бронирование",
            )

        return schemas.BookingResponse.model_validate(booking)

    @staticmethod
    def create_booking(
        db: Session, user_id: int, booking_data: schemas.BookingCreate
    ) -> schemas.BookingResponse:
        mentor = crud.mentor_crud.get_mentor(db, booking_data.mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ментор не найден",
            )

        session_date = booking_data.session_date
        if session_date.tzinfo is None:
            session_date = session_date.replace(tzinfo=timezone.utc)

        if session_date <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата и время сессии должны быть в будущем",
            )

        try:
            booking = crud.booking_crud.create_booking(db, booking_data, user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        return schemas.BookingResponse.model_validate(booking)

    @staticmethod
    def cancel_booking(
        db: Session, booking_id: int, user_id: int
    ) -> schemas.BookingResponse:
        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя отменить чужое бронирование",
            )

        if booking.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Бронирование уже отменено",
            )

        updated_booking = crud.booking_crud.update_booking_status(db, booking_id, "cancelled")
        if not updated_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        return schemas.BookingResponse.model_validate(updated_booking)

    @staticmethod
    def update_booking(
        db: Session,
        booking_id: int,
        user_id: int,
        updates: schemas.BookingUpdate,
    ) -> schemas.BookingResponse:
        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя редактировать чужое бронирование",
            )

        if booking.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Можно редактировать только активные бронирования",
            )

        if updates.expected_updated_at is not None:
            current_version = booking.updated_at or booking.created_at
            if current_version is not None and current_version != updates.expected_updated_at:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Бронирование было изменено другим действием. Обновите данные и повторите.",
                )

        if updates.session_date is not None:
            session_date = updates.session_date
            if session_date.tzinfo is None:
                session_date = session_date.replace(tzinfo=timezone.utc)

            if session_date <= datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Дата и время сессии должны быть в будущем",
                )

            conflicting_booking = db.scalar(
                select(models.Booking).where(
                    and_(
                        models.Booking.id != booking_id,
                        models.Booking.mentor_id == booking.mentor_id,
                        models.Booking.session_date == session_date,
                        models.Booking.status == "active",
                    )
                )
            )

            if conflicting_booking:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="На это время уже есть бронирование",
                )

            updates.session_date = session_date

        updated_booking = crud.booking_crud.update_booking(db, booking_id, updates)
        if not updated_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        return schemas.BookingResponse.model_validate(updated_booking)

    @staticmethod
    def delete_booking(
        db: Session,
        booking_id: int,
        user_id: int,
    ) -> None:
        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя удалить чужое бронирование",
            )

        deleted = crud.booking_crud.delete_booking(db, booking_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

    @staticmethod
    def complete_booking_by_mentor(
        db: Session,
        booking_id: int,
        mentor_user_id: int,
    ) -> schemas.BookingResponse:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, mentor_user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        if booking.mentor_id != mentor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя изменять чужое бронирование",
            )

        if booking.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Завершить можно только активное бронирование",
            )

        updated_booking = crud.booking_crud.update_booking_status(db, booking_id, "completed")
        if not updated_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Бронирование не найдено",
            )

        return schemas.BookingResponse.model_validate(updated_booking)