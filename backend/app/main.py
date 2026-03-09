from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router as api_router


app = FastAPI(
    title="YogaVibe API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


# CORS для React приложения
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключение API роутера
app.include_router(api_router)


@app.get("/")
def read_root():
    # Корневой эндпоинт
    return {"message": "YogaVibe API is running"}


@app.get("/api/health")
def health_check():
    # Проверка здоровья приложения
    return {"status": "ok"}