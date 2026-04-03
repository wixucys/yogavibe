from typing import List
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import crud
import schemas


class BookingService:
    """Business logic for booking operations"""

    @staticmethod
    def get_user_bookings(
        db: Session, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[schemas.BookingResponse]:
        """Get all bookings for current user"""
        bookings = crud.booking_crud.get_user_bookings(db, user_id, skip=skip, limit=limit)
        return [schemas.BookingResponse.model_validate(b) for b in bookings]

    @staticmethod
    def create_booking(
        db: Session, user_id: int, booking_data: schemas.BookingCreate
    ) -> schemas.BookingResponse:
        """Create a new booking"""
        # Validate mentor exists
        mentor = crud.mentor_crud.get_mentor(db, booking_data.mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found",
            )

        # Check if session date is in the future
        if booking_data.session_date <= datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session date must be in the future",
            )

        booking = crud.booking_crud.create_booking(db, user_id, booking_data)
        return schemas.BookingResponse.model_validate(booking)

    @staticmethod
    def cancel_booking(
        db: Session, booking_id: int, user_id: int
    ) -> schemas.BookingResponse:
        """Cancel booking (only owner can cancel)"""
        booking = crud.booking_crud.get_booking(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot cancel another user's booking",
            )

        if booking.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is already cancelled",
            )

        booking = crud.booking_crud.update_booking_status(db, booking_id, "cancelled")
        return schemas.BookingResponse.model_validate(booking)
