import logging

from .database import Base, engine


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def create_tables_if_not_exist() -> bool:
    logger.info("Проверка и создание таблиц...")
    Base.metadata.create_all(bind=engine)
    return True


def init_db() -> bool:
    logger.info("Инициализация базы данных...")
    create_tables_if_not_exist()
    logger.info("Тестовые данные не создаются")
    logger.info("Инициализация завершена")
    return True


if __name__ == "__main__":
    init_db()