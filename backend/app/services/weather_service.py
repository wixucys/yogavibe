"""
weather_service.py
~~~~~~~~~~~~~~~~~~
Адаптер для Open-Meteo API (без API-ключа).

Возможности:
- Таймауты на соединение и чтение через httpx.Timeout
- Автоповтор запросов (до 3 попыток) при сетевых сбоях через tenacity
- Ограничение частоты запросов: токен-бакет (10 запросов / 60 сек)
- Нормализация ответа Open-Meteo в формат WeatherForecast приложения
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import HTTPException, status
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

import schemas

logger = logging.getLogger(__name__)


_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

_TIMEOUT = httpx.Timeout(timeout=10.0, connect=5.0)

_UNSUITABLE_CONDITIONS = {"Thunderstorm", "Tornado", "Squall"}
_RAINY_CONDITIONS = {"Rain", "Drizzle", "Snow"}
_OUTDOOR_TEMP_MIN_C = 17.0
_OUTDOOR_TEMP_MAX_C = 38.0
_OUTDOOR_WIND_MAX_MS = 12.0

_WEATHER_CODE_MAP: dict[int, tuple[str, str]] = {
    0: ("Clear", "ясно"),
    1: ("Clouds", "преимущественно ясно"),
    2: ("Clouds", "переменная облачность"),
    3: ("Clouds", "пасмурно"),
    45: ("Mist", "туман"),
    48: ("Mist", "изморозь и туман"),
    51: ("Drizzle", "морось"),
    53: ("Drizzle", "умеренная морось"),
    55: ("Drizzle", "сильная морось"),
    56: ("Drizzle", "ледяная морось"),
    57: ("Drizzle", "сильная ледяная морось"),
    61: ("Rain", "небольшой дождь"),
    63: ("Rain", "дождь"),
    65: ("Rain", "сильный дождь"),
    66: ("Rain", "ледяной дождь"),
    67: ("Rain", "сильный ледяной дождь"),
    71: ("Snow", "слабый снег"),
    73: ("Snow", "снег"),
    75: ("Snow", "сильный снег"),
    77: ("Snow", "снежные зерна"),
    80: ("Rain", "ливень"),
    81: ("Rain", "умеренный ливень"),
    82: ("Rain", "сильный ливень"),
    85: ("Snow", "снежный заряд"),
    86: ("Snow", "сильный снежный заряд"),
    95: ("Thunderstorm", "гроза"),
    96: ("Thunderstorm", "гроза с градом"),
    99: ("Thunderstorm", "сильная гроза с градом"),
}



class _TokenBucket:
    """
    Простой токен-бакет с асинхронной блокировкой.
    Разрешает `rate` запросов за `period` секунд.
    При превышении лимита возбуждает HTTP 429.
    """

    def __init__(self, rate: int = 10, period: float = 60.0) -> None:
        self._rate = rate
        self._period = period
        self._tokens = float(rate)
        self._last_check = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_check
            self._tokens = min(
                float(self._rate),
                self._tokens + elapsed * (self._rate / self._period),
            )
            self._last_check = now

            if self._tokens < 1.0:
                wait_for = (1.0 - self._tokens) * (self._period / self._rate)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Превышен лимит запросов к сервису погоды. "
                        f"Повторите через {wait_for:.1f} с."
                    ),
                )
            self._tokens -= 1.0


_rate_limiter = _TokenBucket(rate=10, period=60.0)



def _meteo_retry():
    """3 попытки с экспоненциальной задержкой при сетевых ошибках."""
    return retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )



@_meteo_retry()
async def _fetch_geocoding(city: str) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            _GEOCODING_URL,
            params={"name": city, "count": 1, "language": "ru", "format": "json"},
        )

    if not resp.is_success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка сервиса геокодинга (статус {resp.status_code}).",
        )

    return resp.json()


@_meteo_retry()
async def _fetch_forecast(latitude: float, longitude: float) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            _FORECAST_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "hourly": (
                    "temperature_2m,apparent_temperature,relative_humidity_2m,"
                    "wind_speed_10m,weather_code"
                ),
                "timezone": "UTC",
                "forecast_days": 16,
                "wind_speed_unit": "ms",
            },
        )

    if not resp.is_success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка сервиса прогноза (статус {resp.status_code}).",
        )

    return resp.json()



def _is_outdoor_suitable(temp_c: float, wind_ms: float, condition: str) -> bool:
    """Эвристика: подходит ли погода для занятий йогой на улице."""
    if condition in _UNSUITABLE_CONDITIONS:
        return False
    if condition in _RAINY_CONDITIONS:
        return False
    if not (_OUTDOOR_TEMP_MIN_C <= temp_c <= _OUTDOOR_TEMP_MAX_C):
        return False
    if wind_ms > _OUTDOOR_WIND_MAX_MS:
        return False
    return True


def _parse_hourly_dt(dt_text: str) -> datetime:
    return datetime.fromisoformat(dt_text).replace(tzinfo=timezone.utc)


def _pick_closest_hour_index(times: list[str], target_dt: datetime) -> int:
    if not times:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис погоды вернул пустой прогноз.",
        )

    target_ts = target_dt.timestamp()
    return min(
        range(len(times)),
        key=lambda i: abs(_parse_hourly_dt(times[i]).timestamp() - target_ts),
    )


def _normalize_open_meteo_response(
    *,
    city_name: str,
    country_code: str,
    target_dt: datetime,
    forecast_raw: dict,
) -> schemas.WeatherForecast:
    hourly = forecast_raw.get("hourly", {})
    times: list[str] = hourly.get("time", [])

    index = _pick_closest_hour_index(times, target_dt)

    try:
        dt_utc = _parse_hourly_dt(times[index])
        temp_c = float(hourly.get("temperature_2m", [])[index])
        feels_like = float(hourly.get("apparent_temperature", [])[index])
        humidity = int(hourly.get("relative_humidity_2m", [])[index])
        wind_ms = float(hourly.get("wind_speed_10m", [])[index])
        weather_code = int(hourly.get("weather_code", [])[index])
    except (IndexError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис погоды вернул неполные данные прогноза.",
        ) from exc

    condition, description = _WEATHER_CODE_MAP.get(weather_code, ("Clouds", "переменная облачность"))

    return schemas.WeatherForecast(
        city=city_name,
        country=country_code,
        datetime_utc=dt_utc,
        temperature_celsius=round(temp_c, 1),
        feels_like_celsius=round(feels_like, 1),
        humidity_percent=humidity,
        wind_speed_ms=round(wind_ms, 1),
        condition=condition,
        description=description,
        icon_code=str(weather_code),
        is_outdoor_suitable=_is_outdoor_suitable(temp_c, wind_ms, condition),
    )



class WeatherService:
    """Сервисный слой интеграции с Open-Meteo API."""

    @staticmethod
    async def get_forecast(city: str, date: Optional[datetime] = None) -> schemas.WeatherForecast:
        """
        Возвращает прогноз погоды для `city` на дату `date`.

        Raises:
            HTTPException 404 — город не найден.
            HTTPException 429 — превышен внутренний лимит частоты.
            HTTPException 504 — сеть недоступна.
            HTTPException 502 — неверный/неполный ответ внешнего API.
        """
        await _rate_limiter.acquire()

        now_utc = datetime.now(tz=timezone.utc)

        if date is None:
            target_dt = now_utc
        elif date.tzinfo is not None:
            target_dt = date.astimezone(timezone.utc)
        else:
            target_dt = date.replace(tzinfo=timezone.utc)

        try:
            geo = await _fetch_geocoding(city)
            results = geo.get("results", [])
            if not results:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Город «{city}» не найден в сервисе погоды.",
                )

            best = results[0]
            lat = best.get("latitude")
            lon = best.get("longitude")
            if lat is None or lon is None:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Сервис геокодинга вернул неполные координаты.",
                )

            city_name = best.get("name", city)
            country_code = best.get("country_code", "")

            forecast = await _fetch_forecast(float(lat), float(lon))
            return _normalize_open_meteo_response(
                city_name=city_name,
                country_code=country_code,
                target_dt=target_dt,
                forecast_raw=forecast,
            )

        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Сервис погоды недоступен: city=%s error=%s", city, exc)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Сервис погоды недоступен. Попробуйте позже.",
            ) from exc
