import { calculateBookingPrice } from './bookingPrice';
import type { SessionType } from '../types/booking';

test.each<[number, number, SessionType, number]>([
  [1500, 30, 'individual', 750],
  [1500, 60, 'individual', 1500],
  [1500, 90, 'individual', 2250],
  [1500, 90, 'group', 1575],
  [1501, 30, 'individual', 751],
  [1010, 30, 'group', 354],
  [1500, 45, 'individual', 1125],
])('rate %i, minutes %i, format %s → %i rubles', (rate, minutes, kind, expected) => {
  expect(calculateBookingPrice(rate, minutes, kind)).toBe(expected);
});
