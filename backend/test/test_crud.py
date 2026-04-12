import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app import crud
from app import schemas
from app import models_db as models


def test_user_crud():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db_session = Session(engine)
    
    try:
        user_data = schemas.UserCreate(
            username="testuser",
            email="test@example.com",
            password="password123"
        )
        
        user = crud.user_crud.create_user(db_session, user_data)
        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        
        print("✅ test_user_crud.create_user: OK")
        
        found_user = crud.user_crud.get_user(db_session, user.id)
        assert found_user is not None
        assert found_user.username == "testuser"
        
        print("✅ test_user_crud.get_user: OK")
        
        user_by_email = crud.user_crud.get_user_by_email(db_session, "test@example.com")
        assert user_by_email.id == user.id
        
        print("✅ test_user_crud.get_user_by_email: OK")
        
        updates = {"city": "Москва", "yoga_style": "Хатха"}
        updated_user = crud.user_crud.update_user(db_session, user.id, updates)
        assert updated_user.city == "Москва"
        assert updated_user.yoga_style == "Хатха"
        
        print("✅ test_user_crud.update_user: OK")
        
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_mentor_crud():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db_session = Session(engine)
    
    try:
        mentor_data = schemas.MentorCreate(
            name="Анна Петрова",
            description="Опытный инструктор",
            gender="female",
            city="Москва",
            price=2000,
            yoga_style="Хатха",
            rating=4.8,
            experience_years=5
        )
        
        mentor = crud.mentor_crud.create_mentor(db_session, mentor_data)
        assert mentor.id is not None
        assert mentor.name == "Анна Петрова"
        assert mentor.price == 2000
        assert mentor.is_available is True
        
        print("✅ test_mentor_crud.create_mentor: OK")
        
        found_mentor = crud.mentor_crud.get_mentor(db_session, mentor.id)
        assert found_mentor.name == "Анна Петрова"
        
        print("✅ test_mentor_crud.get_mentor: OK")
        
        mentors = crud.mentor_crud.get_mentors(db_session)
        assert len(mentors) == 1
        assert mentors[0].name == "Анна Петрова"
        
        print("✅ test_mentor_crud.get_mentors: OK")
        
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_note_crud():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db_session = Session(engine)
    
    try:
        user_data = schemas.UserCreate(
            username="noteuser",
            email="note@example.com",
            password="password123"
        )
        user = crud.user_crud.create_user(db_session, user_data)
        
        note_data = schemas.NoteCreate(text="Моя первая заметка")
        note = crud.note_crud.create_note(db_session, note_data, user.id)
        
        assert note.id is not None
        assert note.text == "Моя первая заметка"
        assert note.user_id == user.id
        
        print("✅ test_note_crud.create_note: OK")
        
        found_note = crud.note_crud.get_note(db_session, note.id)
        assert found_note.text == "Моя первая заметка"
        
        print("✅ test_note_crud.get_note: OK")
        
        user_notes = crud.note_crud.get_user_notes(db_session, user.id)
        assert len(user_notes) == 1
        assert user_notes[0].text == "Моя первая заметка"
        
        print("✅ test_note_crud.get_user_notes: OK")
        
        updated_note_data = schemas.NoteCreate(text="Обновленная заметка")
        updated_note = crud.note_crud.update_note(db_session, note.id, updated_note_data)
        assert updated_note.text == "Обновленная заметка"
        
        print("✅ test_note_crud.update_note: OK")
        
        delete_result = crud.note_crud.delete_note(db_session, note.id)
        assert delete_result is True
        
        print("✅ test_note_crud.delete_note: OK")
        
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_delete_user_with_uploaded_files():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db_session = Session(engine)

    try:
        user_data = schemas.UserCreate(
            username="fileowner",
            email="fileowner@example.com",
            password="password123",
        )
        user = crud.user_crud.create_user(db_session, user_data)

        attachment = models.FileAttachment(
            original_filename="test.png",
            stored_filename="stored-test.png",
            file_url="/uploads/stored-test.png",
            mime_type="image/png",
            size_bytes=128,
            category="avatar",
            uploaded_by_user_id=user.id,
            user_id=user.id,
        )
        db_session.add(attachment)
        db_session.commit()

        delete_result = crud.user_crud.delete_user(db_session, user.id)
        assert delete_result is True
        assert crud.user_crud.get_user(db_session, user.id) is None
        assert db_session.query(models.FileAttachment).count() == 0

        print("✅ test_delete_user_with_uploaded_files: OK")
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    print("Запуск тестов CRUD...")
    try:
        test_user_crud()
        test_mentor_crud()
        test_note_crud()
        test_delete_user_with_uploaded_files()
        print("✅ Все тесты CRUD пройдены успешно!")
    except AssertionError as e:
        print(f"❌ Ошибка в тесте: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {type(e).__name__}: {e}")
