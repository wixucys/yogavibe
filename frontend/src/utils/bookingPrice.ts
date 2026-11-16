import type { SessionType } from '../types/booking';

export function calculateBookingPrice(hourlyRate: number, durationMinutes: number, sessionType: SessionType): number {
  const percent = sessionType === 'group' ? 70 : 100;
  return Math.floor((hourlyRate * durationMinutes * percent + 3000) / 6000);
}
