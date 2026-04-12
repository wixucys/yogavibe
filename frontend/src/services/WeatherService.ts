import ApiService from './ApiService';
import type { WeatherForecast } from '../types/weather';

class WeatherService {
  
  static async getForecast(city: string, date?: string): Promise<WeatherForecast> {
    const params = new URLSearchParams({ city });
    if (date) params.set('date', date);
    return ApiService.request<WeatherForecast>(`/weather/forecast?${params.toString()}`);
  }

  
  static async getBookingWeather(bookingId: string | number): Promise<WeatherForecast> {
    return ApiService.request<WeatherForecast>(`/bookings/${bookingId}/weather`);
  }
}

export default WeatherService;
