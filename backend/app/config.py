from datetime import timedelta
import os
from typing import Optional

from dotenv import load_dotenv
from pathlib import Path
from pydantic_settings import BaseSettings

BACKEND_ENV_PATH = Path(__file__).parent.parent / ".env"
APP_ENV_PATH = Path(__file__).parent / ".env"
TEST_ENV_PATH = Path(__file__).parent.parent / ".env.test"

IS_TESTING = os.getenv("TESTING", "").strip().lower() in {"1", "true", "yes", "on"}

load_dotenv(dotenv_path=BACKEND_ENV_PATH, override=False)
load_dotenv(dotenv_path=APP_ENV_PATH, override=False)
if IS_TESTING:
    load_dotenv(dotenv_path=TEST_ENV_PATH, override=True)

class Settings(BaseSettings):
    TESTING: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    TIMEZONE: str = "Europe/Moscow"

    DATABASE_URL: str = "sqlite:///./data/yogavibe.db"
    DEBUG: bool = False

    ENABLE_BOOTSTRAP_ADMIN: bool = False
    BOOTSTRAP_ADMIN_TOKEN: Optional[str] = None

    CORS_ORIGINS: str = "http://localhost:3000"

    FILE_STORAGE_PROVIDER: str = "local"
    STORAGE_PUBLIC_BASE_URL: str = "http://localhost:8000"
    PRESIGNED_URL_EXPIRE_SECONDS: int = 900

    S3_BUCKET_NAME: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    S3_PUBLIC_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False
    S3_ADDRESSING_STYLE: str = "path"

    OPENWEATHER_API_KEY: Optional[str] = None
    
    SITE_URL: str = "http://localhost:8000"

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return [origin for origin in origins if origin]

    @property
    def moscow_tz(self) -> timedelta:
        return timedelta(hours=3)
    
    class Config:
        env_file = ".env"


settings = Settings()
