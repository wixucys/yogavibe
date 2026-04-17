# YogaVibe

Платформа для поиска менторов по йоге: frontend на React, backend на FastAPI, reverse proxy на Nginx и файловое хранилище на MinIO.

## Стек

- Frontend: React + TypeScript
- Backend: FastAPI + SQLAlchemy
- Infra: Docker Compose, Nginx, MinIO

## Быстрый старт

### Требования

- Docker
- Docker Compose

### Запуск

```bash
docker-compose up -d --build
```

### Проверка

```bash
docker-compose ps
curl -f http://localhost/health
curl -f http://localhost/api/health
```

### Доступ

- Frontend: http://localhost
- Backend API: http://localhost/api
- Swagger: http://localhost/api/docs
- MinIO Console: http://localhost:9001

## Тесты

### Backend

```bash
docker-compose exec backend pytest test -v
```

### Frontend

```bash
docker-compose exec frontend npm run test:ci
```

## Полезные команды

```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose down
```

## Документация

- [QUICKSTART.md](QUICKSTART.md)

## Примечание

Проект использует единый подход: один compose-файл и один набор контейнеров для локального и серверного запуска.