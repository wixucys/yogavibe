from typing import List

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import crud
import schemas


class MentorService:
    """Business logic for mentor operations"""

    @staticmethod
    def get_all_mentors(
        db: Session, filters: schemas.MentorFilters, skip: int = 0, limit: int = 100
    ) -> List[schemas.MentorResponse]:
        """Get all mentors with filters"""
        mentors = crud.mentor_crud.get_mentors(
            db, filters=filters, skip=skip, limit=limit
        )
        return [schemas.MentorResponse.model_validate(m) for m in mentors]

    @staticmethod
    def get_mentor_by_id(db: Session, mentor_id: int) -> schemas.MentorResponse:
        """Get mentor by ID"""
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found",
            )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def get_current_mentor(db: Session, user_id: int) -> schemas.MentorResponse:
        """Get current mentor profile"""
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor profile not found",
            )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def update_mentor(
        db: Session, user_id: int, updates: schemas.MentorUpdate
    ) -> schemas.MentorResponse:
        """Update mentor profile"""
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor profile not found",
            )

        mentor = crud.mentor_crud.update_mentor(
            db, mentor.id, updates.model_dump(exclude_unset=True)
        )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def get_mentor_bookings(
        db: Session, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[schemas.BookingResponse]:
        """Get mentor's bookings"""
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor profile not found",
            )

        bookings = crud.booking_crud.get_bookings_by_mentor(
            db, mentor.id, skip=skip, limit=limit
        )
        return [schemas.BookingResponse.model_validate(b) for b in bookings]

    @staticmethod
    def create_mentor(
        db: Session, mentor_data: schemas.MentorCreatePayload
    ) -> schemas.MentorResponse:
        """Create mentor (admin only)"""
        user = crud.user_crud.get_user(db, mentor_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Check if mentor already exists for this user
        existing_mentor = crud.mentor_crud.get_mentor_by_user_id(
            db, mentor_data.user_id
        )
        if existing_mentor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mentor profile already exists for this user",
            )

        mentor = crud.mentor_crud.create_mentor(db, mentor_data)
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def update_mentor_by_admin(
        db: Session, mentor_id: int, updates: schemas.MentorAdminUpdatePayload
    ) -> schemas.MentorResponse:
        """Update mentor (admin only)"""
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found",
            )

        mentor = crud.mentor_crud.update_mentor(
            db, mentor_id, updates.model_dump(exclude_unset=True)
        )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def delete_mentor(db: Session, mentor_id: int) -> None:
        """Delete mentor (admin only)"""
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found",
            )

        crud.mentor_crud.delete_mentor(db, mentor_id)
