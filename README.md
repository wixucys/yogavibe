# YogaVibe

<div align="center">
  <img src="public/assets/images/background_img.jpg" alt="YogaVibe Banner" width="800" />
  
  <p><strong>Платформа для поиска менторов по йоге</strong></p>
  <p>Соединяем искателей с опытными наставниками для персонального роста</p>
  
  [![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
  [![React Router](https://img.shields.io/badge/React_Router-7.9.5-orange)](https://reactrouter.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
</div>

## 🧘‍♀️ О проекте

YogaVibe — это современная веб-платформа, которая помогает людям найти идеального наставника по йоге. Мы верим, что каждый заслуживает индивидуального подхода в своем духовном и физическом развитии.

### 🌟 Основные возможности

- **📱 Полностью адаптивный дизайн** — работает на всех устройствах
- **🔐 Система аутентификации** — регистрация и вход с сохранением в localStorage
- **👥 Каталог менторов** — фильтрация по полу, городу, стилю йоги и цене
- **📝 Персональные заметки** — сохраняйте свои мысли и наблюдения о практике
- **🔔 Система уведомлений** — не пропускайте важные события

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 16.0.0 или выше
- npm 8.0.0 или выше

## Тестовая инфраструктура и метрики

### 6.1 Минимально контролируемое покрытие

- Backend: минимальный порог покрытия 65% (настроено в pytest через --cov-fail-under=65).
- Frontend: минимальный глобальный порог покрытия Jest:
  - Statements: 15%
  - Branches: 10%
  - Functions: 10%
  - Lines: 15%

Команды проверки покрытия:

- Backend: /Users/sleepy13/Desktop/projects/yogavibe-ts/venv/bin/python -m pytest
- Frontend: cd frontend && npm run test:ci

### 6.2 Разделение быстрых и длительных тестов

Backend (pytest markers):

- Быстрые: /Users/sleepy13/Desktop/projects/yogavibe-ts/venv/bin/python -m pytest -m "unit or integration"
- Длительные: /Users/sleepy13/Desktop/projects/yogavibe-ts/venv/bin/python -m pytest -m e2e

Frontend (по шаблону имени файла):

- Быстрые unit: cd frontend && npm run test:unit
- Средние integration: cd frontend && npm run test:integration
- Длительные e2e: cd frontend && npm run test:e2e

### 6.3 Единые правила именования и структуры тестов

Правила именования:

- Backend: test_<feature>.py
- Frontend unit: <Feature>.unit.test.ts или <Feature>.unit.test.tsx
- Frontend integration: <Feature>.integration.test.ts или <Feature>.integration.test.tsx
- Frontend e2e: <Feature>.e2e.test.ts или <Feature>.e2e.test.tsx

Структура:

- Backend: backend/test/
  - test_service_layer.py (unit)
  - test_api_integration.py (integration)
  - test_e2e_business_scenarios.py (e2e)
- Frontend: frontend/src/
  - components/*.unit.test.tsx
  - hooks/*.unit.test.tsx
  - utils/*.unit.test.ts
  - services/*.integration.test.ts
  - screens/**/*.integration.test.tsx

Каждый новый тест должен быть классифицирован по типу (unit/integration/e2e) через marker (backend) или суффикс имени файла (frontend).

## Безопасные настройки backend

Для production/dev-стендов задавайте переменные окружения:

- DEBUG=false
- CORS_ORIGINS=http://localhost:3000 (или список через запятую)
- ENABLE_BOOTSTRAP_ADMIN=false
- BOOTSTRAP_ADMIN_TOKEN=<сложный одноразовый токен>

Если включаете bootstrap admin, endpoint /api/v1/setup/bootstrap-admin принимает заголовок X-Setup-Token.