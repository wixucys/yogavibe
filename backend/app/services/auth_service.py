from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from .. import crud
from .. import schemas
from ..utils import create_access_token, create_refresh_token, verify_token
from ..config import settings


class AuthService:
    """Business logic for authentication operations"""

    @staticmethod
    def register(db: Session, user_data: schemas.UserCreate) -> schemas.AuthResponse:
        """Register new user and return auth tokens"""
        existing_user = crud.user_crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        existing_username = crud.user_crud.get_user_by_username(db, user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        user = crud.user_crud.create_user(db, user_data, role="user")

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        crud.refresh_token_crud.create_token(
            db, refresh_token, user.id, timedelta(days=7)
        )

        return schemas.AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=schemas.UserResponse.model_validate(user),
        )

    @staticmethod
    def login(db: Session, credentials: schemas.LoginRequest) -> schemas.AuthResponse:
        """Authenticate user and return auth tokens"""
        user = crud.user_crud.authenticate_user(db, credentials.login, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not active",
            )

        crud.refresh_token_crud.clear_all_user_tokens(db, user.id)

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        crud.refresh_token_crud.create_token(
            db, refresh_token, user.id, timedelta(days=7)
        )

        return schemas.AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=schemas.UserResponse.model_validate(user),
        )

    @staticmethod
    def refresh_token(db: Session, refresh_token_str: str) -> schemas.Token:
        """Refresh access token using refresh token"""
        payload = verify_token(refresh_token_str)

        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        stored_token = crud.refresh_token_crud.get_token(db, refresh_token_str)
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is revoked or expired",
            )

        try:
            user_id_int = int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID in token",
            )

        user = crud.user_crud.get_user(db, user_id_int)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found or is inactive",
            )

        crud.refresh_token_crud.deactivate_token(db, refresh_token_str)

        new_access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        crud.refresh_token_crud.create_token(
            db, new_refresh_token, user.id, timedelta(days=7)
        )

        return schemas.Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

    @staticmethod
    def logout(db: Session, refresh_token_str: str) -> None:
        """Logout user by revoking refresh token"""
        crud.refresh_token_crud.deactivate_token(db, refresh_token_str)

    @staticmethod
    def bootstrap_admin(
        db: Session,
        user_data: schemas.UserCreate,
        setup_token: Optional[str],
    ) -> schemas.AuthResponse:
        """Create first admin user (only if no admins exist)"""
        if not settings.ENABLE_BOOTSTRAP_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bootstrap admin is disabled",
            )

        if not settings.BOOTSTRAP_ADMIN_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bootstrap admin token is not configured",
            )

        if setup_token != settings.BOOTSTRAP_ADMIN_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid setup token",
            )

        admin_count = crud.user_crud.count_users_by_role(db, "admin")
        if admin_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin already exists",
            )

        existing_user = crud.user_crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        user = crud.user_crud.create_user(db, user_data, role="admin")

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        crud.refresh_token_crud.create_token(
            db, refresh_token, user.id, timedelta(days=7)
        )

        return schemas.AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=schemas.UserResponse.model_validate(user),
        )
