from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router as api_router
from init_data import init_db


app = FastAPI(
    title="YogaVibe API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": "YogaVibe API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}