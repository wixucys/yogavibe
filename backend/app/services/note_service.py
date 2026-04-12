from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .. import crud
from .. import schemas


class NoteService:
    """Business logic for note operations"""

    @staticmethod
    def get_user_notes(
        db: Session,
        user_id: int,
        query: schemas.NoteListQuery,
    ) -> schemas.NoteListPage:
        notes, total = crud.note_crud.get_user_notes_page(
            db=db,
            user_id=user_id,
            query=query,
        )

        return schemas.NoteListPage(
            items=[schemas.NoteResponse.model_validate(note) for note in notes],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @staticmethod
    def get_note(
        db: Session,
        note_id: int,
        user_id: int,
    ) -> schemas.NoteResponse:
        note = crud.note_crud.get_note(db, note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Заметка не найдена",
            )

        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя просматривать чужую заметку",
            )

        return schemas.NoteResponse.model_validate(note)

    @staticmethod
    def create_note(
        db: Session,
        user_id: int,
        note_data: schemas.NoteCreate,
    ) -> schemas.NoteResponse:
        note = crud.note_crud.create_note(db, note_data, user_id)
        return schemas.NoteResponse.model_validate(note)

    @staticmethod
    def update_note(
        db: Session,
        note_id: int,
        user_id: int,
        updates: schemas.NoteUpdate,
    ) -> schemas.NoteResponse:
        note = crud.note_crud.get_note(db, note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Заметка не найдена",
            )

        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя редактировать чужую заметку",
            )

        if updates.expected_updated_at is not None:
            current_version = note.updated_at or note.created_at
            expected_version = updates.expected_updated_at

            if current_version is not None and current_version != expected_version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Заметка была изменена другим действием. Обновите данные и повторите.",
                )

        updated_note = crud.note_crud.update_note(db, note_id, updates)
        if not updated_note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Заметка не найдена",
            )

        return schemas.NoteResponse.model_validate(updated_note)

    @staticmethod
    def delete_note(
        db: Session,
        note_id: int,
        user_id: int,
    ) -> None:
        note = crud.note_crud.get_note(db, note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Заметка не найдена",
            )

        if note.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя удалить чужую заметку",
            )

        deleted = crud.note_crud.delete_note(db, note_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Заметка не найдена",
            )