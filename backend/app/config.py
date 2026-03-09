from datetime import timedelta
from dotenv import load_dotenv
from pathlib import Path
from pydantic_settings import BaseSettings

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # Настройки JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    TIMEZONE: str = "Europe/Moscow"

    DATABASE_URL: str = "sqlite:///./data/yogavibe.db"
    DEBUG: bool = True

    @property
    def moscow_tz(self) -> timedelta:
        return timedelta(hours=3)
    
    class Config:
        env_file = ".env"


settings = Settings()