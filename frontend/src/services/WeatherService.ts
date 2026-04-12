import ApiService from './ApiService';
import type { WeatherForecast } from '../types/weather';

class WeatherService {
  /**
   * Fetch a weather forecast for any city and optional target date.
   * @param city   City name (as known to OpenWeatherMap)
   * @param date   ISO 8601 date-time string (optional; defaults to "now")
   */
  static async getForecast(city: string, date?: string): Promise<WeatherForecast> {
    const params = new URLSearchParams({ city });
    if (date) params.set('date', date);
    return ApiService.request<WeatherForecast>(`/weather/forecast?${params.toString()}`);
  }

  /**
   * Fetch weather for a specific booking (city and date resolved server-side).
   */
  static async getBookingWeather(bookingId: string | number): Promise<WeatherForecast> {
    return ApiService.request<WeatherForecast>(`/bookings/${bookingId}/weather`);
  }
}

export default WeatherService;
