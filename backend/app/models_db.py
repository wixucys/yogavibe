from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False, index=True)

    city: Mapped[Optional[str]] = mapped_column(String(120), index=True, nullable=True)
    yoga_style: Mapped[Optional[str]] = mapped_column(String(120), index=True, nullable=True)
    experience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    goals: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    avatar_file_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("file_attachments.id", ondelete="SET NULL"),
        nullable=True,
    )

    notes: Mapped[List["Note"]] = relationship(
        "Note",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Note.user_id",
    )
    bookings: Mapped[List["Booking"]] = relationship(
        "Booking",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Booking.user_id",
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="RefreshToken.user_id",
    )

    mentor_profile: Mapped[Optional["Mentor"]] = relationship(
        "Mentor",
        back_populates="user",
        uselist=False,
        foreign_keys="Mentor.user_id",
    )

    uploaded_files: Mapped[List["FileAttachment"]] = relationship(
        "FileAttachment",
        back_populates="uploaded_by_user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="FileAttachment.uploaded_by_user_id",
    )

    avatar_file: Mapped[Optional["FileAttachment"]] = relationship(
        "FileAttachment",
        foreign_keys=[avatar_file_id],
        post_update=True,
    )


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    price: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    yoga_style: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    photo_file_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("file_attachments.id", ondelete="SET NULL"),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="mentor_profile",
        foreign_keys=[user_id],
    )
    bookings: Mapped[List["Booking"]] = relationship(
        "Booking",
        back_populates="mentor",
        cascade="all, delete-orphan",
        foreign_keys="Booking.mentor_id",
    )

    photo_file: Mapped[Optional["FileAttachment"]] = relationship(
        "FileAttachment",
        foreign_keys=[photo_file_id],
        post_update=True,
    )


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="notes",
        foreign_keys=[user_id],
    )
    attachments: Mapped[List["FileAttachment"]] = relationship(
        "FileAttachment",
        back_populates="note",
        cascade="all, delete-orphan",
        foreign_keys="FileAttachment.note_id",
    )


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mentor_id: Mapped[int] = mapped_column(
        ForeignKey("mentors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    session_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    session_type: Mapped[str] = mapped_column(String(20), default="individual", nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="bookings",
        foreign_keys=[user_id],
    )
    mentor: Mapped["Mentor"] = relationship(
        "Mentor",
        back_populates="bookings",
        foreign_keys=[mentor_id],
    )
    attachments: Mapped[List["FileAttachment"]] = relationship(
        "FileAttachment",
        back_populates="booking",
        cascade="all, delete-orphan",
        foreign_keys="FileAttachment.booking_id",
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(1024), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="refresh_tokens",
        foreign_keys=[user_id],
    )


class FileAttachment(Base):
    __tablename__ = "file_attachments"

    @property
    def owner_type(self) -> str:
        if self.user_id is not None:
            return "user"
        if self.mentor_id is not None:
            return "mentor"
        if self.booking_id is not None:
            return "booking"
        return "note"

    @property
    def owner_id(self) -> int:
        if self.user_id is not None:
            return self.user_id
        if self.mentor_id is not None:
            return self.mentor_id
        if self.booking_id is not None:
            return self.booking_id
        return self.note_id or 0

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, index=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    category: Mapped[str] = mapped_column(String(50), default="other", nullable=False, index=True)

    uploaded_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    mentor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("mentors.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    booking_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    note_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    uploaded_by_user: Mapped["User"] = relationship(
        "User",
        back_populates="uploaded_files",
        foreign_keys=[uploaded_by_user_id],
    )

    note: Mapped[Optional["Note"]] = relationship(
        "Note",
        back_populates="attachments",
        foreign_keys=[note_id],
    )
    booking: Mapped[Optional["Booking"]] = relationship(
        "Booking",
        back_populates="attachments",
        foreign_keys=[booking_id],
    )