import subprocess
import sys
import os


def setup_pythonpath():
    """Настраивает PYTHONPATH для правильного импорта модулей"""
    current_dir = os.path.dirname(os.path.abspath(__file__))  # test/
    backend_dir = os.path.dirname(current_dir)  # backend/
    project_root = os.path.dirname(backend_dir)  # yogavibe_app/
    
    # Собираем все пути
    paths = [
        project_root,      # yogavibe_app/
        backend_dir,       # backend/
        current_dir,       # test/
        os.path.join(backend_dir, 'app')  # backend/app/
    ]
    
    # Убираем дубликаты
    unique_paths = []
    for path in paths:
        if path not in unique_paths:
            unique_paths.append(path)
    
    # Формируем PYTHONPATH
    pythonpath = ':'.join(unique_paths)
    
    return pythonpath


def run_tests():
    # Запускает все тесты
    print("🧪 Запуск тестов YogaVibe...")
    print("=" * 50)
    
    # Список тестовых файлов
    test_files = [
        "test_models.py",
        "test_schemas.py", 
        "test_utils.py",
        "test_crud.py",
        "test_api.py"
    ]
    
    # Проверяем существование файлов
    existing_tests = []
    for test_file in test_files:
        if os.path.exists(test_file):
            existing_tests.append(test_file)
        else:
            print(f"⚠️  Файл {test_file} не найден")
    
    if not existing_tests:
        print("❌ Не найдено ни одного тестового файла")
        return False
    
    print(f"📁 Найдено тестовых файлов: {len(existing_tests)}")
    
    # Настраиваем PYTHONPATH
    pythonpath = setup_pythonpath()
    
    # Запускаем каждый тест напрямую через python
    results = []
    for test_file in existing_tests:
        print(f"\n📋 Запуск {test_file}...")
        print("-" * 40)
        
        try:
            # Устанавливаем PYTHONPATH для процесса
            env = os.environ.copy()
            env['PYTHONPATH'] = pythonpath + ':' + env.get('PYTHONPATH', '')
            
            result = subprocess.run(
                [sys.executable, test_file],
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
                cwd=os.path.dirname(os.path.abspath(__file__))  # Запускаем из папки test
            )
            
            print(result.stdout)
            if result.stderr and "Traceback" in result.stderr:
                # Показываем только первые 3 строки ошибки
                error_lines = result.stderr.strip().split('\n')
                print("STDERR (первые строки):")
                for line in error_lines[:5]:
                    print(f"  {line}")
            
            if result.returncode == 0:
                print(f"✅ {test_file} - УСПЕХ")
                results.append(True)
            else:
                print(f"❌ {test_file} - ОШИБКА (код: {result.returncode})")
                results.append(False)
                
        except subprocess.TimeoutExpired:
            print(f"⏰ {test_file} - ТАЙМАУТ")
            results.append(False)
        except Exception as e:
            print(f"💥 {test_file} - ОШИБКА: {e}")
            results.append(False)
    
    # Итог
    print("\n" + "=" * 50)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ:")
    print(f"   Всего тестов: {len(results)}")
    print(f"   Успешно: {sum(results)}")
    print(f"   Неудачно: {len(results) - sum(results)}")
    
    if all(results):
        print("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        return True
    else:
        print("⚠️  НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ")
        return False


def run_specific_test(test_name):
    # Запускает конкретный тест
    if not os.path.exists(test_name):
        print(f"❌ Файл {test_name} не найден")
        return False
    
    print(f"🧪 Запуск теста: {test_name}")
    print("=" * 50)
    
    # Настраиваем PYTHONPATH
    pythonpath = setup_pythonpath()
    env = os.environ.copy()
    env['PYTHONPATH'] = pythonpath + ':' + env.get('PYTHONPATH', '')
    
    try:
        result = subprocess.run(
            [sys.executable, test_name],
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print(result.stdout)
        if result.stderr and "Traceback" in result.stderr:
            error_lines = result.stderr.strip().split('\n')
            print("STDERR (первые строки):")
            for line in error_lines[:5]:
                print(f"  {line}")
        
        if result.returncode == 0:
            print(f"✅ {test_name} - УСПЕХ")
            return True
        else:
            print(f"❌ {test_name} - ОШИБКА")
            return False
            
    except Exception as e:
        print(f"💥 ОШИБКА: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Запуск тестов YogaVibe")
    parser.add_argument(
        "--test", 
        "-t", 
        help="Запустить конкретный тестовый файл"
    )
    parser.add_argument(
        "--all", 
        "-a", 
        action="store_true",
        help="Запустить все тесты (по умолчанию)"
    )
    
    args = parser.parse_args()
    
    if args.test:
        success = run_specific_test(args.test)
        sys.exit(0 if success else 1)
    else:
        success = run_tests()
        sys.exit(0 if success else 1)