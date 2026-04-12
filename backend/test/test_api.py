import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from fastapi.testclient import TestClient
    from app import main
    
    client = TestClient(main.app)
    
    def test_root_endpoint():
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "YogaVibe API is running"}
        print("✅ test_root_endpoint: OK")
    
    def test_health_check():
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        print("✅ test_health_check: OK")
    
    def test_docs_endpoints():
        response = client.get("/api/docs")
        assert response.status_code == 200
        print("✅ test_docs_endpoints: OK")
    
    if __name__ == "__main__":
        print("Запуск тестов API...")
        try:
            test_root_endpoint()
            test_health_check()
            test_docs_endpoints()
            print("✅ Все тесты API пройдены успешно!")
        except AssertionError as e:
            print(f"❌ Ошибка в тесте: {e}")
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {type(e).__name__}: {e}")
            
except ImportError as e:
    print(f"⚠️  Не удалось импортировать зависимости для API тестов: {e}")
    print("Установите httpx: pip install httpx")
