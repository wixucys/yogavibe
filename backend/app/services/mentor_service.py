from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import crud
import schemas


class MentorService:
    """Business logic for mentor operations"""

    @staticmethod
    def get_mentors_catalog(
        db: Session,
        query: schemas.MentorListQuery,
    ) -> schemas.MentorListPage:
        mentors, total = crud.mentor_crud.get_mentors_page(
            db=db,
            query=query,
            admin_mode=False,
        )

        return schemas.MentorListPage(
            items=[schemas.MentorResponse.model_validate(m) for m in mentors],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @staticmethod
    def get_admin_mentors(
        db: Session,
        query: schemas.MentorListQuery,
    ) -> schemas.MentorListPage:
        mentors, total = crud.mentor_crud.get_mentors_page(
            db=db,
            query=query,
            admin_mode=True,
        )

        return schemas.MentorListPage(
            items=[schemas.MentorResponse.model_validate(m) for m in mentors],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @staticmethod
    def get_mentor_by_id(
        db: Session,
        mentor_id: int,
    ) -> schemas.MentorResponse:
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ментор не найден",
            )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def get_current_mentor(
        db: Session,
        user_id: int,
    ) -> schemas.MentorResponse:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )
        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def update_mentor(
        db: Session,
        user_id: int,
        updates: schemas.MentorSelfUpdate,
    ) -> schemas.MentorResponse:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        updated_mentor = crud.mentor_crud.update_mentor_self(
            db,
            mentor.id,
            updates.model_dump(exclude_unset=True),
        )
        if not updated_mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        return schemas.MentorResponse.model_validate(updated_mentor)

    @staticmethod
    def get_mentor_bookings(
        db: Session,
        user_id: int,
        query: schemas.BookingListQuery,
    ) -> schemas.BookingListPage:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        bookings, total = crud.booking_crud.get_mentor_bookings_page(
            db=db,
            mentor_id=mentor.id,
            query=query,
        )

        return schemas.BookingListPage(
            items=[schemas.BookingResponse.model_validate(b) for b in bookings],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @staticmethod
    def create_mentor(
        db: Session,
        mentor_data: schemas.MentorCreate,
    ) -> schemas.MentorResponse:
        user = crud.user_crud.get_user(db, mentor_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        existing_mentor = crud.mentor_crud.get_mentor_by_user_id(db, mentor_data.user_id)
        if existing_mentor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для этого пользователя уже существует профиль ментора",
            )

        try:
            mentor = crud.mentor_crud.create_mentor(db, mentor_data)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        return schemas.MentorResponse.model_validate(mentor)

    @staticmethod
    def update_mentor_by_admin(
        db: Session,
        mentor_id: int,
        updates: schemas.MentorAdminUpdate,
    ) -> schemas.MentorResponse:
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ментор не найден",
            )

        updated_mentor = crud.mentor_crud.update_mentor(
            db,
            mentor_id,
            updates.model_dump(exclude_unset=True),
        )
        if not updated_mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ментор не найден",
            )

        return schemas.MentorResponse.model_validate(updated_mentor)

    @staticmethod
    def delete_mentor(
        db: Session,
        mentor_id: int,
    ) -> None:
        mentor = crud.mentor_crud.get_mentor(db, mentor_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ментор не найден",
            )

        crud.mentor_crud.delete_mentor(db, mentor_id)