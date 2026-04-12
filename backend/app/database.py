from pathlib import Path
from typing import Generator
import logging
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from .config import settings

logger = logging.getLogger(__name__)

os.makedirs("data", exist_ok=True)

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True  # Логирование SQL запросов
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_initialized() -> bool:
    inspector = inspect(engine)
    required_tables = ["users", "mentors", "notes", "bookings", "refresh_tokens"]
    existing_tables = inspector.get_table_names()
    
    for table in required_tables:
        if table not in existing_tables:
            return False
    return True


def initialize_database():
    if not check_database_initialized():
        logger.info("Инициализация базы данных...")
        Base.metadata.create_all(bind=engine)
        logger.info("База данных инициализирована")
        return True
    return False
