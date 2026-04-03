from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import crud
import schemas


class UserService:
    """Business logic for user operations"""

    @staticmethod
    def get_user(db: Session, user_id: int) -> schemas.UserResponse:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def update_user(
        db: Session, user_id: int, updates: schemas.UserUpdate
    ) -> schemas.UserResponse:
        user = crud.user_crud.update_user(
            db, user_id, updates.model_dump(exclude_unset=True)
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def list_users(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[schemas.UserListResponse]:
        users = crud.user_crud.get_users(db, skip, limit)
        return [schemas.UserListResponse.model_validate(user) for user in users]

    @staticmethod
    def update_user_by_admin(
        db: Session, user_id: int, updates: schemas.UserAdminUpdate
    ) -> schemas.UserResponse:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        update_data = updates.model_dump(exclude_unset=True)

        if "is_active" in update_data and not update_data["is_active"] and user.is_active:
            crud.refresh_token_crud.clear_all_user_tokens(db, user_id)

        try:
            updated_user = crud.user_crud.admin_update_user(db, user_id, update_data)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        return schemas.UserResponse.model_validate(updated_user)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        try:
            deleted = crud.user_crud.delete_user(db, user_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

    @staticmethod
    def change_user_role(
        db: Session, user_id: int, role_update: schemas.UserRoleUpdate
    ) -> schemas.UserResponse:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        try:
            updated_user = crud.user_crud.admin_update_user(
                db,
                user_id,
                {"role": role_update.role},
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        return schemas.UserResponse.model_validate(updated_user)

    @staticmethod
    def get_dashboard_stats(db: Session) -> schemas.AdminDashboardResponse:
        total_users = crud.user_crud.count_all_users(db)
        active_users = crud.user_crud.count_active_users(db)
        admin_count = crud.user_crud.count_users_by_role(db, "admin")
        mentor_count = crud.user_crud.count_users_by_role(db, "mentor")
        user_count = crud.user_crud.count_users_by_role(db, "user")

        mentor_profiles_count = crud.mentor_crud.count_mentor_profiles(db)
        bookings_count = crud.booking_crud.count_bookings(db)
        active_bookings_count = crud.booking_crud.count_bookings_by_status(db, "active")
        notes_count = crud.note_crud.count_notes(db)

        return schemas.AdminDashboardResponse(
            total_users=total_users,
            active_users=active_users,
            admins_count=admin_count,
            mentors_count=mentor_count,
            regular_users_count=user_count,
            mentor_profiles_count=mentor_profiles_count,
            bookings_count=bookings_count,
            active_bookings_count=active_bookings_count,
            notes_count=notes_count,
        )