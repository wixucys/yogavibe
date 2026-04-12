export interface WeatherForecast {
  city: string;
  country: string;
  datetime_utc: string;
  temperature_celsius: number;
  feels_like_celsius: number;
  humidity_percent: number;
  wind_speed_ms: number;
  
  condition: string;
  description: string;
  
  icon_code: string;
  is_outdoor_suitable: boolean;
}
