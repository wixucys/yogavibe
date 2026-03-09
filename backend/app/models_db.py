from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional, List
from database import Base


# МОДЕЛИ БАЗЫ ДАННЫХ 

class User(Base):
    # Модель пользователя
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    
    # ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ 
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    yoga_style: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    goals: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # СИСТЕМНЫЕ ПОЛЯ 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # СВЯЗИ 
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class Mentor(Base):
    # Модель инструктора йоги
    __tablename__ = "mentors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    gender: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    yoga_style: Mapped[str] = mapped_column(String, nullable=False)
    
    # ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ 
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # СИСТЕМНЫЕ ПОЛЯ 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # СВЯЗИ 
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="mentor", cascade="all, delete-orphan")


class Note(Base):
    # Модель заметки пользователя
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # СИСТЕМНЫЕ ПОЛЯ 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # СВЯЗИ 
    user: Mapped["User"] = relationship("User", back_populates="notes")


class Booking(Base):
    # Модель бронирования сессии
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    mentor_id: Mapped[int] = mapped_column(ForeignKey("mentors.id"), nullable=False)
    
    # ИНФОРМАЦИЯ О СЕССИИ 
    session_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # СИСТЕМНЫЕ ПОЛЯ 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # СВЯЗИ 
    user: Mapped["User"] = relationship("User", back_populates="bookings")
    mentor: Mapped["Mentor"] = relationship("Mentor", back_populates="bookings")


class RefreshToken(Base):
    # Модель refresh токенов
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # СВЯЗИ 
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")