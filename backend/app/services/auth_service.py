from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import crud
import schemas
from utils import create_access_token, create_refresh_token, verify_token
from config import settings


class AuthService:
    """Business logic for authentication operations"""

    @staticmethod
    def register(db: Session, user_data: schemas.UserCreate) -> schemas.AuthResponse:
        """Register new user and return auth tokens"""
        # Check if email already exists
        existing_user = crud.user_crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already exists
        existing_username = crud.user_crud.get_user_by_username(db, user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        # Create new user with default "user" role
        user = crud.user_crud.create_user(db, user_data, role="user")

        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Store refresh token in database
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
        # Authenticate user
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

        # Revoke all previous tokens
        crud.refresh_token_crud.clear_all_user_tokens(db, user.id)

        # Generate new tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Store refresh token in database
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
        # Verify refresh token
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

        # Validate refresh token in database
        stored_token = crud.refresh_token_crud.get_token(db, refresh_token_str)
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is revoked or expired",
            )

        # Get user
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

        # Deactivate old refresh token
        crud.refresh_token_crud.deactivate_token(db, refresh_token_str)

        # Create new token pair
        new_access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Store new refresh token
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
    def bootstrap_admin(db: Session, user_data: schemas.UserCreate) -> schemas.AuthResponse:
        """Create first admin user (only if no admins exist)"""
        admin_count = crud.user_crud.count_users_by_role(db, "admin")
        if admin_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin already exists",
            )

        # Check if email already exists
        existing_user = crud.user_crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create admin user
        user = crud.user_crud.create_user(db, user_data, role="admin")

        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Store refresh token
        crud.refresh_token_crud.create_token(
            db, refresh_token, user.id, timedelta(days=7)
        )

        return schemas.AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=schemas.UserResponse.model_validate(user),
        )
