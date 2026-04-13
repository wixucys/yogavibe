import {
  formatMoscowDate,
  formatMoscowDateTime,
  formatMoscowTime,
} from './dateTime';

describe('dateTime utils', () => {
  it('returns fallback for invalid date values', () => {
    expect(formatMoscowDate('not-a-date')).toBe('Не указано');
    expect(formatMoscowTime('not-a-date')).toBe('Не указано');
    expect(formatMoscowDateTime('not-a-date')).toBe('Не указано');
  });

  it('formats valid date values for Moscow timezone', () => {
    const value = '2026-04-13T09:30:00Z';

    expect(formatMoscowDate(value)).toContain('13.04.2026');
    expect(formatMoscowTime(value)).toMatch(/\d{2}:\d{2}/);
    expect(formatMoscowDateTime(value)).toContain('13.04.2026');
  });
});
