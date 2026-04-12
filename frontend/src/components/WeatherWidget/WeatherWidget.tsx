import React from 'react';
import { useWeather } from '../../hooks/useWeather';
import './WeatherWidget.css';

// Maps OWM condition group to a simple emoji fallback
const CONDITION_EMOJI: Record<string, string> = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
  Smoke: '🌫️',
  Dust: '🌫️',
  Sand: '🌫️',
  Ash: '🌋',
  Squall: '💨',
  Tornado: '🌪️',
};

function getEmoji(condition: string): string {
  return CONDITION_EMOJI[condition] ?? '🌤️';
}

function isOwmIconCode(iconCode: string): boolean {
  return /^\d{2}[dn]$/.test(iconCode);
}

/** Full-size widget: used in BookingScreen */
function WeatherWidgetFull({
  city,
  date,
}: {
  city: string;
  date?: string;
}) {
  const { data, loading, silent, error } = useWeather({ city, date });

  if (silent) return null;

  if (loading) {
    return (
      <div className="weather-widget weather-widget--loading" aria-busy="true">
        <div className="weather-widget__skeleton" />
        <div className="weather-widget__skeleton weather-widget__skeleton--short" />
      </div>
    );
  }

  if (error) {
    if (error.kind === 'unavailable' || error.kind === 'unknown') {
      return (
        <div className="weather-widget weather-widget--banner" role="status">
          <span className="weather-widget__banner-icon">🌐</span>
          <span className="weather-widget__banner-text">
            Прогноз погоды временно недоступен
          </span>
        </div>
      );
    }
    if (error.kind === 'rate_limited') {
      return (
        <div className="weather-widget weather-widget--banner" role="status">
          <span className="weather-widget__banner-icon">⏳</span>
          <span className="weather-widget__banner-text">{error.message}</span>
        </div>
      );
    }
    if (error.kind === 'not_found') {
      return (
        <div className="weather-widget weather-widget--banner weather-widget--warn" role="alert">
          <span className="weather-widget__banner-icon">❓</span>
          <span className="weather-widget__banner-text">
            Город «{city}» не найден в сервисе погоды
          </span>
        </div>
      );
    }
    return null;
  }

  if (!data) return null;

  const canUseOwmIcon = isOwmIconCode(data.icon_code);
  const iconUrl = `https://openweathermap.org/img/wn/${data.icon_code}@2x.png`;
  const emoji = getEmoji(data.condition);

  return (
    <div className="weather-widget" role="region" aria-label="Прогноз погоды">
      <div className="weather-widget__header">
        <span className="weather-widget__title">Погода в {data.city}</span>
        {data.is_outdoor_suitable ? (
          <span className="weather-widget__badge weather-widget__badge--ok">
            Подходит для улицы
          </span>
        ) : (
          <span className="weather-widget__badge weather-widget__badge--warn">
            Лучше в помещении
          </span>
        )}
      </div>

      <div className="weather-widget__body">
        <div className="weather-widget__icon-temp">
          {canUseOwmIcon ? (
            <img
              src={iconUrl}
              alt={data.condition}
              className="weather-widget__icon"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'inline';
              }}
            />
          ) : null}
          <span
            className="weather-widget__icon-emoji"
            aria-hidden="true"
            style={{ display: canUseOwmIcon ? 'none' : 'inline' }}
          >
            {emoji}
          </span>
          <span className="weather-widget__temperature">
            {data.temperature_celsius > 0 ? '+' : ''}{data.temperature_celsius}°C
          </span>
        </div>

        <div className="weather-widget__details">
          <div className="weather-widget__description">{data.description}</div>
          <div className="weather-widget__stats">
            <span title="Ощущается как">
              🌡️ {data.feels_like_celsius > 0 ? '+' : ''}{data.feels_like_celsius}°C
            </span>
            <span title="Влажность">💧 {data.humidity_percent}%</span>
            <span title="Скорость ветра">💨 {data.wind_speed_ms} м/с</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact widget: used inside booking cards */
function WeatherWidgetCompact({ bookingId }: { bookingId: string | number }) {
  const { data, loading, silent, error } = useWeather({ bookingId });

  if (silent) return null;

  if (loading) {
    return (
      <div
        className="weather-compact weather-compact--loading"
        aria-busy="true"
        aria-label="Загрузка прогноза погоды"
      >
        <div className="weather-compact__skeleton" />
      </div>
    );
  }

  if (error) {
    if (error.kind === 'unavailable' || error.kind === 'unknown') {
      return (
        <div className="weather-compact weather-compact--unavailable" role="status">
          🌐 Прогноз недоступен
        </div>
      );
    }
    // Silently skip other errors in compact mode
    return null;
  }

  if (!data) return null;

  const emoji = getEmoji(data.condition);
  const sign = (n: number) => (n > 0 ? '+' : '');

  return (
    <div
      className={`weather-compact ${data.is_outdoor_suitable ? 'weather-compact--ok' : 'weather-compact--warn'}`}
      role="region"
      aria-label="Погода на день сессии"
      title={`${data.city}: ${data.description}`}
    >
      <span className="weather-compact__emoji">{emoji}</span>
      <span className="weather-compact__temp">
        {sign(data.temperature_celsius)}{data.temperature_celsius}°C
      </span>
      <span className="weather-compact__desc">{data.description}</span>
      {data.is_outdoor_suitable ? (
        <span className="weather-compact__badge weather-compact__badge--ok">улица ✓</span>
      ) : (
        <span className="weather-compact__badge weather-compact__badge--warn">помещение</span>
      )}
    </div>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface WeatherWidgetProps {
  /** City name — use with the `date` prop for BookingScreen */
  city?: string;
  /** ISO 8601 date-time string (optional) */
  date?: string;
  /** Booking ID — use in MyBookingsScreen card; takes priority over city/date */
  bookingId?: string | number;
  /** Render compact inline variant (for booking cards) */
  compact?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  city,
  date,
  bookingId,
  compact = false,
}) => {
  if (compact && bookingId !== undefined) {
    return <WeatherWidgetCompact bookingId={bookingId} />;
  }

  if (city) {
    return <WeatherWidgetFull city={city} date={date} />;
  }

  return null;
};

export default WeatherWidget;
