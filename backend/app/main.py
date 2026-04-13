from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import router as api_router
from .config import settings
from .seo import router as seo_router
from .init_data import init_db


app = FastAPI(
    title="YogaVibe API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": exc.status_code,
            "error": _status_label(exc.status_code),
            "detail": exc.detail,
            "path": str(request.url.path),
        },
    )


def _status_label(code: int) -> str:
    labels = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        409: "Conflict",
        410: "Gone",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return labels.get(code, "Error")


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(api_router)
app.include_router(seo_router)


@app.get("/")
def read_root():
    return {"message": "YogaVibe API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
