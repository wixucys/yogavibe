import base64
import binascii
import mimetypes
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import crud
import schemas
from config import settings
from services.object_storage_service import ObjectStorageService


class FileService:
    """Business logic for managing user and mentor file attachments."""

    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
    IMAGE_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    }
    DOCUMENT_MIME_TYPES = IMAGE_MIME_TYPES | {"application/pdf"}
    CATEGORY_ALLOWED_MIME_TYPES = {
        "avatar": IMAGE_MIME_TYPES,
        "certificate": DOCUMENT_MIME_TYPES,
        "medical_document": DOCUMENT_MIME_TYPES,
        "booking_document": DOCUMENT_MIME_TYPES,
        "note_attachment": DOCUMENT_MIME_TYPES,
        "other": DOCUMENT_MIME_TYPES,
    }
    OWNER_ALLOWED_CATEGORIES = {
        "user": {"avatar", "medical_document", "other", "note_attachment"},
        "mentor": {"avatar", "certificate", "other"},
        "booking": {"booking_document", "other"},
        "note": {"note_attachment", "other"},
    }

    @classmethod
    def list_user_files(
        cls,
        db: Session,
        user_id: int,
        query: schemas.FileAttachmentListQuery,
    ) -> schemas.FileAttachmentListPage:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        scoped_query = schemas.FileAttachmentListQuery(
            page=query.page,
            page_size=query.page_size,
            owner_type="user",
            owner_id=user_id,
            category=query.category,
            sort_order=query.sort_order,
        )
        return cls._build_list_response(db, scoped_query)

    @classmethod
    def upload_user_file(
        cls,
        db: Session,
        user_id: int,
        upload: schemas.FileUploadRequest,
    ) -> schemas.FileAttachmentResponse:
        user = crud.user_crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        return cls._store_file(
            db=db,
            uploaded_by_user_id=user_id,
            owner_type="user",
            owner_id=user_id,
            upload=upload,
        )

    @classmethod
    def delete_user_file(
        cls,
        db: Session,
        user_id: int,
        file_id: int,
    ) -> None:
        file_attachment = crud.file_attachment_crud.get_file(db, file_id)
        if not file_attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )

        if file_attachment.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя удалить чужой файл",
            )

        cls._delete_file_record(db, file_attachment)

    @classmethod
    def list_mentor_files(
        cls,
        db: Session,
        user_id: int,
        query: schemas.FileAttachmentListQuery,
    ) -> schemas.FileAttachmentListPage:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        scoped_query = schemas.FileAttachmentListQuery(
            page=query.page,
            page_size=query.page_size,
            owner_type="mentor",
            owner_id=mentor.id,
            category=query.category,
            sort_order=query.sort_order,
        )
        return cls._build_list_response(db, scoped_query)

    @classmethod
    def upload_mentor_file(
        cls,
        db: Session,
        user_id: int,
        upload: schemas.FileUploadRequest,
    ) -> schemas.FileAttachmentResponse:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        return cls._store_file(
            db=db,
            uploaded_by_user_id=user_id,
            owner_type="mentor",
            owner_id=mentor.id,
            upload=upload,
        )

    @classmethod
    def delete_mentor_file(
        cls,
        db: Session,
        user_id: int,
        file_id: int,
    ) -> None:
        mentor = crud.mentor_crud.get_mentor_by_user_id(db, user_id)
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль ментора не найден",
            )

        file_attachment = crud.file_attachment_crud.get_file(db, file_id)
        if not file_attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )

        if file_attachment.mentor_id != mentor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя удалить чужой файл",
            )

        cls._delete_file_record(db, file_attachment)

    @classmethod
    def get_file_download_url(
        cls,
        db: Session,
        current_user: schemas.UserResponse,
        file_id: int,
    ) -> schemas.FileAccessUrlResponse:
        file_attachment = crud.file_attachment_crud.get_file(db, file_id)
        if not file_attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )

        cls._ensure_user_can_access_file(db, current_user, file_attachment)
        return schemas.FileAccessUrlResponse(
            url=ObjectStorageService.generate_download_url(
                file_id=file_attachment.id,
                object_key=file_attachment.stored_filename,
                original_filename=file_attachment.original_filename,
                content_type=file_attachment.mime_type,
            ),
            expires_in=ObjectStorageService.get_presigned_expires_in(),
        )

    @classmethod
    def stream_file_by_signature(
        cls,
        db: Session,
        file_id: int,
        expires: int,
        signature: str,
    ) -> FileResponse:
        file_attachment = crud.file_attachment_crud.get_file(db, file_id)
        if not file_attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )

        return ObjectStorageService.get_local_file_response(
            file_id=file_attachment.id,
            object_key=file_attachment.stored_filename,
            original_filename=file_attachment.original_filename,
            content_type=file_attachment.mime_type,
            expires=expires,
            signature=signature,
        )

    @classmethod
    def _build_list_response(
        cls,
        db: Session,
        query: schemas.FileAttachmentListQuery,
    ) -> schemas.FileAttachmentListPage:
        items, total = crud.file_attachment_crud.get_files_page(db, query)
        return schemas.FileAttachmentListPage(
            items=[cls._to_response(item) for item in items],
            meta=crud.build_page_meta(
                page=query.page,
                page_size=query.page_size,
                total=total,
            ),
        )

    @classmethod
    def _store_file(
        cls,
        db: Session,
        uploaded_by_user_id: int,
        owner_type: schemas.FileOwnerType,
        owner_id: int,
        upload: schemas.FileUploadRequest,
    ) -> schemas.FileAttachmentResponse:
        cls._validate_owner_category(owner_type, upload.category)

        normalized_mime_type = cls._normalize_mime_type(upload.mime_type, upload.filename)
        content = cls._decode_base64_content(upload.content_base64)
        cls._validate_file_content(content, normalized_mime_type, upload.category)

        original_filename = Path(upload.filename).name.strip() or "upload"
        stored_filename = cls._build_stored_filename(original_filename, normalized_mime_type)
        storage_reference = ObjectStorageService.upload_bytes(
            object_key=stored_filename,
            content=content,
            content_type=normalized_mime_type,
        )

        file_record = schemas.FileAttachmentCreate(
            owner_type=owner_type,
            owner_id=owner_id,
            category=upload.category,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_url=storage_reference,
            mime_type=normalized_mime_type,
            size_bytes=len(content),
        )
        created_file = crud.file_attachment_crud.create_file(
            db,
            file_record,
            uploaded_by_user_id=uploaded_by_user_id,
        )
        return cls._to_response(created_file)

    @classmethod
    def _decode_base64_content(cls, content_base64: str) -> bytes:
        payload = content_base64.strip()
        if payload.startswith("data:") and "," in payload:
            payload = payload.split(",", 1)[1]

        try:
            return base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректное содержимое файла",
            ) from exc

    @classmethod
    def _validate_file_content(
        cls,
        content: bytes,
        mime_type: Optional[str],
        category: schemas.FileCategory,
    ) -> None:
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Файл пуст",
            )

        if len(content) > cls.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Файл слишком большой. Максимальный размер — 10 МБ.",
            )

        if not mime_type:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Не удалось определить тип файла. Разрешены только PDF, JPG, PNG, GIF и WebP файлы",
            )

        allowed_types = cls.CATEGORY_ALLOWED_MIME_TYPES.get(category, cls.DOCUMENT_MIME_TYPES)
        if mime_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Разрешены только PDF, JPG, PNG, GIF и WebP файлы",
            )

        if not cls._matches_mime_signature(content, mime_type):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Содержимое файла не соответствует заявленному типу",
            )

    @staticmethod
    def _matches_mime_signature(content: bytes, mime_type: str) -> bool:
        signature_map = {
            "application/pdf": [b"%PDF"],
            "image/jpeg": [b"\xff\xd8\xff"],
            "image/png": [b"\x89PNG\r\n\x1a\n"],
            "image/gif": [b"GIF87a", b"GIF89a"],
            "image/webp": [b"RIFF"],
        }

        expected_signatures = signature_map.get(mime_type)
        if not expected_signatures:
            return False

        if mime_type == "image/webp":
            return content.startswith(b"RIFF") and content[8:12] == b"WEBP"

        return any(content.startswith(signature) for signature in expected_signatures)

    @staticmethod
    def _normalize_mime_type(mime_type: Optional[str], filename: str) -> Optional[str]:
        if mime_type:
            normalized = mime_type.strip().lower()
            if normalized:
                return normalized

        guessed_type, _ = mimetypes.guess_type(filename)
        return guessed_type.lower() if guessed_type else None

    @staticmethod
    def _build_stored_filename(filename: str, mime_type: Optional[str]) -> str:
        suffix = Path(filename).suffix.lower()
        if not suffix and mime_type:
            suffix = mimetypes.guess_extension(mime_type) or ""

        if suffix == ".jpe":
            suffix = ".jpg"

        return f"{uuid4().hex}{suffix}"

    @classmethod
    def _to_response(cls, file_attachment) -> schemas.FileAttachmentResponse:
        response = schemas.FileAttachmentResponse.model_validate(file_attachment)
        secured_url = ObjectStorageService.generate_download_url(
            file_id=file_attachment.id,
            object_key=file_attachment.stored_filename,
            original_filename=file_attachment.original_filename,
            content_type=file_attachment.mime_type,
        )
        return response.model_copy(update={"file_url": secured_url})

    @classmethod
    def _validate_owner_category(
        cls,
        owner_type: schemas.FileOwnerType,
        category: schemas.FileCategory,
    ) -> None:
        allowed_categories = cls.OWNER_ALLOWED_CATEGORIES.get(owner_type, {"other"})
        if category not in allowed_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот тип файла нельзя привязать к выбранной сущности",
            )

    @classmethod
    def _ensure_user_can_access_file(
        cls,
        db: Session,
        current_user: schemas.UserResponse,
        file_attachment,
    ) -> None:
        if current_user.role == "admin":
            return

        if file_attachment.user_id is not None and file_attachment.user_id == current_user.id:
            return

        mentor_profile = None
        if current_user.role == "mentor":
            mentor_profile = crud.mentor_crud.get_mentor_by_user_id(db, current_user.id)
            if (
                mentor_profile
                and file_attachment.mentor_id is not None
                and file_attachment.mentor_id == mentor_profile.id
            ):
                return

        if file_attachment.note_id is not None:
            note = crud.note_crud.get_note(db, file_attachment.note_id)
            if note and note.user_id == current_user.id:
                return

        if file_attachment.booking_id is not None:
            booking = crud.booking_crud.get_booking(db, file_attachment.booking_id)
            if booking:
                if booking.user_id == current_user.id:
                    return
                if (
                    mentor_profile
                    and current_user.role == "mentor"
                    and booking.mentor_id == mentor_profile.id
                ):
                    return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для доступа к файлу",
        )

    @staticmethod
    def _delete_file_record(db: Session, file_attachment) -> None:
        ObjectStorageService.delete_object(file_attachment.stored_filename)

        deleted = crud.file_attachment_crud.delete_file(db, file_attachment.id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден",
            )
