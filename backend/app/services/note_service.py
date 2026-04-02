from typing import List

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import crud
import schemas


class NoteService:
    """Business logic for note operations"""

    @staticmethod
    def get_user_notes(
        db: Session, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[schemas.NoteResponse]:
        """Get all notes for current user"""
        notes = crud.note_crud.get_notes(db, user_id, skip=skip, limit=limit)
        return [schemas.NoteResponse.model_validate(n) for n in notes]

    @staticmethod
    def create_note(
        db: Session, user_id: int, note_data: schemas.NoteCreate
    ) -> schemas.NoteResponse:
        """Create a new note"""
        note = crud.note_crud.create_note(db, user_id, note_data)
        return schemas.NoteResponse.model_validate(note)

    @staticmethod
    def update_note(
        db: Session, note_id: int, user_id: int, updates: schemas.NoteUpdate
    ) -> schemas.NoteResponse:
        """Update note (only owner can update)"""
        note = crud.note_crud.get_note(db, note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found",
            )

        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update another user's note",
            )

        note = crud.note_crud.update_note(
            db, note_id, updates.model_dump(exclude_unset=True)
        )
        return schemas.NoteResponse.model_validate(note)

    @staticmethod
    def delete_note(db: Session, note_id: int, user_id: int) -> None:
        """Delete note (only owner can delete)"""
        note = crud.note_crud.get_note(db, note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found",
            )

        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete another user's note",
            )

        crud.note_crud.delete_note(db, note_id)
