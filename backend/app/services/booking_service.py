from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import crud
import schemas


class BookingService:
    """Business logic for booking operations"""

    @staticmethod
    def get_user_bookings(
        db: Session, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[schemas.BookingResponse]:
        bookings = crud.booking_crud.get_user_bookings(db, user_id, skip=skip, limit=limit)
        return [schemas.BookingResponse.model_validate(b) for b in bookings]

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