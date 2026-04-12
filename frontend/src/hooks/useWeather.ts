import { useEffect, useRef, useState } from 'react';
import WeatherService from '../services/WeatherService';
import type { WeatherForecast } from '../types/weather';

export type WeatherErrorKind =
  | 'not_found'    // 404 — city unknown to OWM
  | 'rate_limited' // 429 — too many requests
  | 'unavailable'  // 503 / 504 / network — service not reachable
  | 'unknown';

export interface WeatherError {
  kind: WeatherErrorKind;
  message: string;
}

interface WeatherState {
  data: WeatherForecast | null;
  loading: boolean;
  /** Non-fatal: service not configured (503) — widget should be hidden silently. */
  silent: boolean;
  error: WeatherError | null;
}

type WeatherParams =
  | { city: string; date?: string; bookingId?: never }
  | { bookingId: string | number; city?: never; date?: never };

function classifyError(err: unknown): WeatherError {
  if (
    err !== null &&
    typeof err === 'object' &&
    'status' in err
  ) {
    const status = (err as { status?: number }).status;
    const message =
      err instanceof Error ? err.message : 'Прогноз погоды недоступен';

    if (status === 404) return { kind: 'not_found', message };
    if (status === 429) return { kind: 'rate_limited', message: 'Слишком много запросов. Попробуйте позже.' };
    if (status === 503 || status === 504) return { kind: 'unavailable', message };
  }

  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return { kind: 'unavailable', message: 'Нет связи с сервером.' };
  }

  return { kind: 'unknown', message: 'Прогноз временно недоступен.' };
}

/**
 * Fetches a weather forecast and tracks loading / error state.
 *
 * Pass `city` (+ optional `date`) **or** `bookingId` — not both.
 *
 * Graceful degradation rules:
 * - `silent=true`  → service not configured (HTTP 503) — hide widget, no error shown.
 * - `error.kind === 'unavailable'` → network / gateway error — show soft banner.
 * - `error.kind === 'not_found'`   → city not in OWM — show user-friendly message.
 * - `error.kind === 'rate_limited'` → throttled — show "try later" message.
 */
export function useWeather(params: WeatherParams): WeatherState {
  const [state, setState] = useState<WeatherState>({
    data: null,
    loading: false,
    silent: false,
    error: null,
  });

  // Use a ref to cancel stale updates when params change
  const cancelRef = useRef(false);

  // Determine what to fetch
  const city = 'city' in params ? params.city : undefined;
  const date = 'date' in params ? params.date : undefined;
  const bookingId = 'bookingId' in params ? params.bookingId : undefined;

  // Skip the fetch if required data is missing
  const shouldFetch = Boolean(bookingId !== undefined ? bookingId : city);

  useEffect(() => {
    if (!shouldFetch) {
      setState({ data: null, loading: false, silent: false, error: null });
      return;
    }

    cancelRef.current = false;
    setState({ data: null, loading: true, silent: false, error: null });

    const fetch = async () => {
      try {
        const data =
          bookingId !== undefined
            ? await WeatherService.getBookingWeather(bookingId)
            : await WeatherService.getForecast(city!, date);

        if (!cancelRef.current) {
          setState({ data, loading: false, silent: false, error: null });
        }
      } catch (err: unknown) {
        if (cancelRef.current) return;

        const classified = classifyError(err);
        // HTTP 503 = service not configured → hide widget silently
        const isSilent =
          classified.kind === 'unavailable' &&
          err !== null &&
          typeof err === 'object' &&
          'status' in err &&
          (err as { status?: number }).status === 503;

        setState({
          data: null,
          loading: false,
          silent: isSilent,
          error: isSilent ? null : classified,
        });
      }
    };

    void fetch();

    return () => {
      cancelRef.current = true;
    };
  }, [city, date, bookingId, shouldFetch]);

  return state;
}
