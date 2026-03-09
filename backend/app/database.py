from pathlib import Path
from typing import Generator
from fastapi import logger
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from config import settings


os.makedirs("data", exist_ok=True)

# Подключение к SQLite базе данных
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Создание движка базы данных
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True  # Логирование SQL запросов
)


# Создание фабрики сессий
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


# Базовый класс для моделей
class Base(DeclarativeBase):
    pass


# Зависимость для получения сессии базы данных
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Проверить, инициализирована ли база данных
def check_database_initialized() -> bool:
    inspector = inspect(engine)
    required_tables = ["users", "mentors", "notes", "bookings", "refresh_tokens"]
    existing_tables = inspector.get_table_names()
    
    # Проверяем наличие всех требуемых таблиц
    for table in required_tables:
        if table not in existing_tables:
            return False
    return True


# Безопасно инициализировать базу данных
def initialize_database():
    if not check_database_initialized():
        logger.info("Инициализация базы данных...")
        Base.metadata.create_all(bind=engine)
        logger.info("База данных инициализирована")
        return True
    return False