from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import crud
import schemas


class UserService:
    """Business logic for user operations"""

    @staticmethod
    def get_user(db: Session, user_id: int) -> schemas.UserResponse:
        """Get user by ID"""
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def update_user(
        db: Session, user_id: int, updates: schemas.UserUpdate
    ) -> schemas.UserResponse:
        """Update current user profile"""
        user = crud.user_crud.update_user(
            db, user_id, updates.model_dump(exclude_unset=True)
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def list_users(db: Session, skip: int = 0, limit: int = 100) -> List[schemas.UserListResponse]:
        """List all users (admin only)"""
        users = crud.user_crud.get_users(db, skip, limit)
        return [schemas.UserListResponse.model_validate(user) for user in users]

    @staticmethod
    def update_user_by_admin(
        db: Session, user_id: int, updates: schemas.UserAdminUpdate
    ) -> schemas.UserResponse:
        """Update user by admin"""
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # If deactivating, revoke all tokens
        if "is_active" in updates.model_dump(exclude_unset=True):
            if not updates.is_active and user.is_active:
                crud.refresh_token_crud.clear_all_user_tokens(db, user_id)

        user = crud.user_crud.admin_update_user(
            db, user_id, updates.model_dump(exclude_unset=True)
        )
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        """Delete user by admin"""
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Don't allow deleting last admin
        if user.role == "admin":
            admin_count = crud.user_crud.count_users_by_role(db, "admin")
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last admin user",
                )

        crud.user_crud.delete_user(db, user_id)

    @staticmethod
    def change_user_role(
        db: Session, user_id: int, role_update: schemas.UserRoleUpdate
    ) -> schemas.UserResponse:
        """Change user role (admin only)"""
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # If changing from admin, check if this is the last admin
        if user.role == "admin" and role_update.role != "admin":
            admin_count = crud.user_crud.count_users_by_role(db, "admin")
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change role of last admin user",
                )

        user = crud.user_crud.update_user(db, user_id, {"role": role_update.role})
        return schemas.UserResponse.model_validate(user)

    @staticmethod
    def get_dashboard_stats(db: Session):
        """Get admin dashboard statistics"""
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
