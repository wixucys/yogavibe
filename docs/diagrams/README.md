# Модели YogaVibe

Версия спецификации 1.0, ЛР2, 03.11.2026. Все PNG получены из соседних Mermaid-исходников.

| Модель | Исходник | Изображение |
| --- | --- | --- |
| Контекст | [01-context.mmd](01-context.mmd) | [PNG](01-context.png) |
| Деятельность | [02-activity.mmd](02-activity.mmd) | [PNG](02-activity.png) |
| Варианты использования | [03-use-cases.mmd](03-use-cases.mmd) | [PNG](03-use-cases.png) |
| Запись с обработкой ошибки | [04-sequence-booking.mmd](04-sequence-booking.mmd) | [PNG](04-sequence-booking.png) |
| Создание заметки | [05-sequence-note.mmd](05-sequence-note.mmd) | [PNG](05-sequence-note.png) |
| Модель данных | [06-data-model.mmd](06-data-model.mmd) | [PNG](06-data-model.png) |
| Состояния бронирования | [07-booking-states.mmd](07-booking-states.mmd) | [PNG](07-booking-states.png) |

Контекст и данные восстановлены по проекту; деятельность, последовательность бронирования и состояния отражают целевое поведение с отмеченными доработками FR-4. Последовательность заметки — существующий успешный путь, а ошибки и доработка FR-5 описаны в спецификации. Обоснования и связи — [раздел 4](../01-requirements.md#4-модели-системы).

## Повторный экспорт

Инструменты документации устанавливаются отдельно от приложения; нужны Node.js, npm и интернет для первой установки. Проверено с Mermaid 11.4.1 и Playwright 1.62.1. Пример для macOS/Linux из корня проекта:

~~~bash
npm install --prefix /tmp/yogavibe-diagrams --no-audit --no-fund mermaid@11.4.1 playwright@1.62.1
/tmp/yogavibe-diagrams/node_modules/.bin/playwright install chromium
DIAGRAM_MODULE_ROOT=/tmp/yogavibe-diagrams node scripts/render-diagrams.mjs
~~~

Скрипт запускает временный сервер только на 127.0.0.1 и headless Chromium, читает локальные .mmd и перезаписывает одноимённые PNG в разрешении 2×. Исходники никуда не отправляются. Ошибка Mermaid останавливает экспорт с ненулевым кодом. После экспорта нужно просмотреть изображения: отсутствие синтаксической ошибки ещё не гарантирует читаемость и смысловую правильность диаграммы.
