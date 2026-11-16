# ЛР4 — автоматические проверки проекта

Автор: Шурман А. Р. Дата: 16.11.2026. Ветка: lab-4.

## Что проверяется

Работа продолжает [контракт ЛР3](interface-contract.md): POST /api/v1/notes, FR-5 / US-5.
[Тесты](../backend/test/test_interface_contract.py) вызывают реальный маршрут FastAPI через TestClient и используют временную SQLite для каждого теста.

| Проверка | Вход | Ожидаемый результат |
| --- | --- | --- |
| Успешное создание | Текст «  После занятия: 10 минут дыхательной практики.  », токен user | HTTP 200; пробелы удалены, владелец совпадает, запись читается и присутствует в списке ровно один раз |
| Пустой текст | Три пробела, токен user | HTTP 422, loc=[body,text], сообщение о пустом тексте, число заметок не меняется |
| Отсутствующее поле / неверный тип | {}, text=null, text=123 | HTTP 422; missing либо string_type; запись не создаётся |
| Границы длины | 1, 1000 и 1001 символ | HTTP 200, 200 и 422 соответственно |

Всего восемь случаев контракта. Авторизация проходит через настоящий маршрут входа с тестовой учётной записью. База и каталог вложений изолированы в tmp_path; существующие пользовательские файлы не удаляются. Для заметок не нужны MinIO, погода и ключи внешних сервисов. В общих тестах внешние интеграции подменяются заглушками.

## Локальный запуск

Из корня проекта, Python 3.11.9:

```bash
python3.11 -m venv .venv-lab4
.venv-lab4/bin/python -m pip install -r requirements.txt flake8==7.2.0
TESTING=1 SECRET_KEY=lab4-test-secret-not-for-production FILE_STORAGE_PROVIDER=local .venv-lab4/bin/python -m pytest backend/test/test_interface_contract.py -v -o addopts=-ra
.venv-lab4/bin/python -m flake8 backend/app backend/test/test_interface_contract.py --select=E9,F63,F7,F82 --show-source --statistics
```

Без локального Python, в отдельном контейнере без рабочих томов:

```bash
docker build -f backend/Dockerfile -t yogavibe-lab4-test .
docker run --rm -e SECRET_KEY=lab4-test-secret-not-for-production -e FILE_STORAGE_PROVIDER=local yogavibe-lab4-test pytest test/test_interface_contract.py -v -o addopts=-ra
```

Dockerfile устанавливает зависимости из requirements.txt. Для всего backend замените путь теста на test. Рабочий сайт и внешние сервисы запускать не требуется.

## GitHub Actions

[interface-contract.yml](../.github/workflows/interface-contract.yml) запускается при открытии PR в main, новых коммитах и повторном открытии, а также при push в main. Фильтра по путям нет: изменения только документации тоже получают проверку. Python 3.11.9 → установка закреплённых зависимостей → flake8 для ошибок Python → восемь проверок контракта. JUnit-отчёт сохраняется как artifact note-contract-results даже при падении теста. Ошибки не подавляются.

Существующий [Build and Test](../.github/workflows/build-and-test.yml) продолжает выполнять общий набор тестов, линтеры, frontend-сборку, Docker-сборки и проверку Compose. Его итоговый job теперь учитывает также lint-docker.

Для отдельного набора контракта параметр -o addopts=-ra отключает унаследованный порог покрытия всего приложения из pytest.ini. Проверка общего покрытия остаётся в Build and Test; восемь тестов одного маршрута не должны оцениваться как покрытие всего backend.

Описание события: [GitHub Docs — pull_request](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

## Демонстрация ошибки и исправления

В первом опубликованном коммите ЛР4 намеренно указано ожидание HTTP 201 вместо контрактного HTTP 200 в test_create_note_contract_success. Это учебная ошибка теста, а не изменение приложения. После фиксации неуспешного прогона ожидаемое значение восстановлено отдельным коммитом.

- [Неуспешный прогон Interface contract](https://github.com/wixucys/yogavibe/actions/runs/43942374040), коммит cd9e4fa8: 1 failed, 7 passed. В журнале test_create_note_contract_success: assert 200 == 201. Подготовка среды и линтер прошли.
- Исправление: вернуть ожидаемый статус 200 согласно контракту ЛР3. Итоговый локальный прогон с актуальным main: 37 passed, в том числе восемь случаев контракта.
- [PR №11](https://github.com/wixucys/yogavibe/pull/11) содержит ссылки на неуспешный и успешный прогоны и итоговый статус слияния. Отчёт JUnit доступен в artifacts каждого прогона.

Слияние и тег lab-4 выполняются только после успешного результата проверок. Внешнее ревью пропускается по решению автора для индивидуального проекта; фиктивное одобрение не оформляется.
