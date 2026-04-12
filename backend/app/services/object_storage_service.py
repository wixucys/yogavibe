import hashlib
import hmac
import mimetypes
import time
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import FileResponse

from config import settings

try:
    import boto3
    from botocore.client import Config as BotoConfig
except ImportError: 
    boto3 = None
    BotoConfig = None


LOCAL_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"
LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class ObjectStorageService:
    """Stores files either in local storage or in an S3-compatible bucket."""

    @classmethod
    def uses_s3(cls) -> bool:
        return settings.FILE_STORAGE_PROVIDER.strip().lower() == "s3"

    @classmethod
    def get_presigned_expires_in(cls) -> int:
        return max(60, int(settings.PRESIGNED_URL_EXPIRE_SECONDS))

    @classmethod
    def upload_bytes(
        cls,
        object_key: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> str:
        if cls.uses_s3():
            client = cls._get_s3_client()
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type

            try:
                client.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=object_key,
                    Body=content,
                    **extra_args,
                )
            except Exception as exc:  # pragma: no cover - depends on external S3
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Не удалось загрузить файл в объектное хранилище",
                ) from exc

            return f"s3://{settings.S3_BUCKET_NAME}/{object_key}"

        file_path = LOCAL_UPLOADS_DIR / object_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        return f"local://{object_key}"

    @classmethod
    def delete_object(cls, object_key: str) -> None:
        if cls.uses_s3():
            client = cls._get_s3_client()
            try:
                client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=object_key)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Не удалось удалить файл из объектного хранилища",
                ) from exc
            return

        file_path = LOCAL_UPLOADS_DIR / object_key
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Не удалось удалить файл из локального хранилища",
                ) from exc

    @classmethod
    def generate_download_url(
        cls,
        file_id: int,
        object_key: str,
        original_filename: str,
        content_type: Optional[str] = None,
    ) -> str:
        if cls.uses_s3():
            return cls._generate_s3_download_url(object_key, original_filename, content_type)

        expires = int(time.time()) + cls.get_presigned_expires_in()
        signature = cls._build_signature(file_id, object_key, expires)
        base_url = settings.STORAGE_PUBLIC_BASE_URL.rstrip("/")
        return (
            f"{base_url}/api/v1/files/{file_id}/download"
            f"?expires={expires}&signature={signature}"
        )

    @classmethod
    def get_local_file_response(
        cls,
        file_id: int,
        object_key: str,
        original_filename: str,
        content_type: Optional[str],
        expires: int,
        signature: str,
    ) -> FileResponse:
        cls._validate_local_signature(file_id, object_key, expires, signature)

        file_path = LOCAL_UPLOADS_DIR / object_key
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден в локальном хранилище",
            )

        resolved_content_type = (
            content_type
            or mimetypes.guess_type(original_filename)[0]
            or "application/octet-stream"
        )
        return FileResponse(
            path=file_path,
            filename=original_filename,
            media_type=resolved_content_type,
        )

    @classmethod
    def _generate_s3_download_url(
        cls,
        object_key: str,
        original_filename: str,
        content_type: Optional[str],
    ) -> str:
        client = cls._get_s3_client(public=True)
        params = {
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": object_key,
            "ResponseContentDisposition": f'inline; filename="{original_filename}"',
        }
        if content_type:
            params["ResponseContentType"] = content_type

        try:
            return client.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=cls.get_presigned_expires_in(),
            )
        except Exception as exc:  # pragma: no cover - depends on external S3
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Не удалось сформировать защищённую ссылку на файл",
            ) from exc

    @classmethod
    def _get_s3_client(cls, public: bool = False):
        if boto3 is None or BotoConfig is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="boto3 не установлен. Добавьте зависимость и перезапустите backend.",
            )

        if not settings.S3_BUCKET_NAME:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не настроено имя S3 bucket",
            )

        if not settings.S3_ACCESS_KEY_ID or not settings.S3_SECRET_ACCESS_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не настроены учётные данные объектного хранилища",
            )

        endpoint_url = settings.S3_PUBLIC_ENDPOINT_URL if public else settings.S3_ENDPOINT_URL

        return boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            use_ssl=settings.S3_USE_SSL,
            config=BotoConfig(
                signature_version="s3v4",
                s3={"addressing_style": settings.S3_ADDRESSING_STYLE},
            ),
        )

    @classmethod
    def _build_signature(cls, file_id: int, object_key: str, expires: int) -> str:
        payload = f"{file_id}:{object_key}:{expires}".encode("utf-8")
        secret = settings.SECRET_KEY.encode("utf-8")
        return hmac.new(secret, payload, hashlib.sha256).hexdigest()

    @classmethod
    def _validate_local_signature(
        cls,
        file_id: int,
        object_key: str,
        expires: int,
        signature: str,
    ) -> None:
        if expires < int(time.time()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Срок действия ссылки на файл истёк",
            )

        expected_signature = cls._build_signature(file_id, object_key, expires)
        if not hmac.compare_digest(signature, expected_signature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Некорректная подпись ссылки на файл",
            )
