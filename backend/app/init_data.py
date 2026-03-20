import logging

import models_db as models
import schemas
from database import Base, SessionLocal, engine


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def create_tables_if_not_exist() -> bool:
    logger.info("Проверка и создание таблиц...")
    Base.metadata.create_all(bind=engine)
    return True


def create_default_admin(db):
    existing_admin = db.query(models.User).filter(models.User.role == "admin").first()
    if existing_admin:
        logger.info("Администратор уже существует, пропускаем создание")
        return existing_admin

    admin_data = schemas.UserCreate(
        username="admin",
        email="admin@yogavibe.com",
        password="admin123456",
    )

    from crud import user_crud

    admin = user_crud.create_user(db, admin_data, role="admin", is_active=True)
    logger.info("Создан администратор: admin@yogavibe.com / admin123456")
    return admin


def create_demo_mentor_profiles(db):
    demo_mentors = [
        {
            "user": {
                "username": "mentor_ivanova",
                "email": "mentor1@yogavibe.com",
                "password": "mentor123456",
            },
            "mentor": {
                "name": "Анна Иванова",
                "description": "Хатха-йога для начинающих и мягкая практика",
                "gender": "female",
                "city": "Москва",
                "price": 2500,
                "yoga_style": "Хатха",
                "rating": 4.9,
                "experience_years": 6,
                "photo_url": None,
                "is_available": True,
            },
        },
        {
            "user": {
                "username": "mentor_petrov",
                "email": "mentor2@yogavibe.com",
                "password": "mentor123456",
            },
            "mentor": {
                "name": "Игорь Петров",
                "description": "Аштанга и силовые практики",
                "gender": "male",
                "city": "Санкт-Петербург",
                "price": 3200,
                "yoga_style": "Аштанга",
                "rating": 4.7,
                "experience_years": 8,
                "photo_url": None,
                "is_available": True,
            },
        },
        {
            "user": {
                "username": "mentor_sidorova",
                "email": "mentor3@yogavibe.com",
                "password": "mentor123456",
            },
            "mentor": {
                "name": "Мария Сидорова",
                "description": "Восстановительная йога и дыхательные практики",
                "gender": "female",
                "city": "Казань",
                "price": 2800,
                "yoga_style": "Восстановительная",
                "rating": 4.8,
                "experience_years": 7,
                "photo_url": None,
                "is_available": True,
            },
        },
    ]

    from crud import mentor_crud, user_crud

    created_count = 0

    for item in demo_mentors:
        user_data = schemas.UserCreate(**item["user"])
        user = user_crud.get_user_by_email(db, user_data.email)

        if not user:
            user = user_crud.create_user(db, user_data, role="mentor", is_active=True)
            logger.info(f"Создан пользователь-ментор: {user.email}")
        elif user.role != "mentor":
            user.role = "mentor"
            db.commit()
            db.refresh(user)
            logger.info(f"Пользователю назначена роль mentor: {user.email}")

        existing_mentor = mentor_crud.get_mentor_by_user_id(db, user.id)
        if existing_mentor:
            continue

        mentor_data = schemas.MentorCreate(user_id=user.id, **item["mentor"])
        mentor_crud.create_mentor(db, mentor_data)
        created_count += 1

    logger.info(f"Создано профилей менторов: {created_count}")
    return created_count


def create_demo_regular_user(db):
    from crud import user_crud

    existing_user = user_crud.get_user_by_email(db, "user@yogavibe.com")
    if existing_user:
        logger.info("Демо-пользователь уже существует")
        return existing_user

    user_data = schemas.UserCreate(
        username="demo_user",
        email="user@yogavibe.com",
        password="user123456",
    )
    user = user_crud.create_user(db, user_data, role="user", is_active=True)
    logger.info("Создан демо-пользователь: user@yogavibe.com / user123456")
    return user


def init_db():
    logger.info("Инициализация базы данных...")
    create_tables_if_not_exist()

    db = SessionLocal()
    try:
        create_default_admin(db)
        create_demo_regular_user(db)
        create_demo_mentor_profiles(db)
    finally:
        db.close()

    logger.info("Инициализация завершена")
    return True


if __name__ == "__main__":
    init_db()