import os
from pathlib import Path
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from database import Base, SessionLocal, engine 
import models_db as models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs("data", exist_ok=True)
logger.info(f"Текущая директория: {os.getcwd()}")
logger.info(f"Путь к БД: ./data/yogavibe.db")

# Проверяем, существуют ли основные таблицы
def check_tables_exist() -> bool:
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # Ключевые таблицы, которые должны быть
    required_tables = ["users", "mentors", "notes", "bookings", "refresh_tokens"]
    
    # Проверяем наличие всех ключевых таблиц
    return all(table in existing_tables for table in required_tables)


# Создать таблицы только если их нет
def create_tables_if_not_exist():
    if not check_tables_exist():
        logger.info("Создание таблиц базы данных...")
        Base.metadata.create_all(bind=engine)
        
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        logger.info(f"Создано таблиц: {len(created_tables)}")
        logger.info(f"Таблицы: {', '.join(created_tables)}")
        return True
    else:
        logger.info("Таблицы уже существуют")
        return False


# Получить статистику базы данных
def get_database_stats():
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        stats = {"tables": len(tables)}
        
        # Подсчитываем записи в каждой таблице
        for table in tables:
            try:
                count = db.execute(f"SELECT COUNT(*) FROM {table}").scalar()
                stats[table] = count
            except:
                stats[table] = "error"
        
        return stats
    finally:
        db.close()


# Создание моковых данных менторов
def create_mock_mentors(db: Session):
    mock_mentors = [
        {
            "name": "Анна Иванова",
            "description": "Опытный инструктор по хатха йоге с 5-летним стажем",
            "gender": "female",
            "city": "Москва",
            "price": 2500,
            "yoga_style": "Хатха",
            "rating": 4.8,
            "experience_years": 5,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Дмитрий Петров",
            "description": "Специалист по аштанга йоге и медитации",
            "gender": "male",
            "city": "Санкт-Петербург",
            "price": 3000,
            "yoga_style": "Аштанга",
            "rating": 4.9,
            "experience_years": 7,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Мария Сидорова",
            "description": "Йога для беременных и восстановительная йога",
            "gender": "female",
            "city": "Новосибирск",
            "price": 2000,
            "yoga_style": "Восстановительная",
            "rating": 4.7,
            "experience_years": 6,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Алексей Козлов",
            "description": "Инструктор по силовой йоге и йоге для мужчин",
            "gender": "male",
            "city": "Екатеринбург",
            "price": 2800,
            "yoga_style": "Силовая",
            "rating": 4.6,
            "experience_years": 4,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Елена Смирнова",
            "description": "Кундалини йога и работа с чакрами",
            "gender": "female",
            "city": "Москва",
            "price": 3200,
            "yoga_style": "Кундалини",
            "rating": 4.8,
            "experience_years": 8,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Сергей Николаев",
            "description": "Йогатерапия и работа с травмами",
            "gender": "male",
            "city": "Казань",
            "price": 2700,
            "yoga_style": "Йогатерапия",
            "rating": 4.5,
            "experience_years": 6,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Ольга Кузнецова",
            "description": "Йога для начинающих и стретчинг",
            "gender": "female",
            "city": "Нижний Новгород",
            "price": 1800,
            "yoga_style": "Для начинающих",
            "rating": 4.4,
            "experience_years": 3,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Иван Морозов",
            "description": "Бикрам йога и горячая йога",
            "gender": "male",
            "city": "Челябинск",
            "price": 2900,
            "yoga_style": "Бикрам",
            "rating": 4.7,
            "experience_years": 5,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Татьяна Павлова",
            "description": "Интегральная йога и философия",
            "gender": "female",
            "city": "Самара",
            "price": 2200,
            "yoga_style": "Интегральная",
            "rating": 4.6,
            "experience_years": 4,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Михаил Орлов",
            "description": "Виньяса флоу йога",
            "gender": "male",
            "city": "Омск",
            "price": 2600,
            "yoga_style": "Виньяса",
            "rating": 4.5,
            "experience_years": 5,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Светлана Федорова",
            "description": "Инь йога и глубокий стретчинг",
            "gender": "female",
            "city": "Ростов-на-Дону",
            "price": 2300,
            "yoga_style": "Инь-йога",
            "rating": 4.8,
            "experience_years": 7,
            "photo_url": None,
            "is_available": True
        },
        {
            "name": "Андрей Соколов",
            "description": "Айенгара йога и работа с пропсами",
            "gender": "male",
            "city": "Уфа",
            "price": 2700,
            "yoga_style": "Айенгара",
            "rating": 4.7,
            "experience_years": 6,
            "photo_url": None,
            "is_available": True
        }
    ]
    
    existing_count = db.query(models.Mentor).count()
    
    if existing_count == 0:
        logger.info("Создание моковых данных менторов...")
        
        for mentor_data in mock_mentors:
            mentor = models.Mentor(**mentor_data)
            db.add(mentor)
        
        db.commit()
        logger.info(f"Создано {len(mock_mentors)} моковых менторов")
        return len(mock_mentors)
    else:
        logger.info(f"В базе уже есть {existing_count} менторов, пропускаем создание моковых данных")
        return 0


def init_db():
    logger.info("Проверка базы данных...")
    
    # Создаем таблицы если их нет
    created = create_tables_if_not_exist()
    
    if created:
        logger.info("База данных инициализирована")
        # Создаем моковых менторов
        db = SessionLocal()
        try:
            create_mock_mentors(db)
        finally:
            db.close()
    else:
        # Показываем статистику существующей БД
        stats = get_database_stats()
        logger.info("Статистика базы данных:")
        logger.info(f"  - Таблиц: {stats['tables']}")
        for table, count in stats.items():
            if table != "tables":
                logger.info(f"  - {table}: {count} записей")
    
    return created


if __name__ == "__main__":
    init_db()