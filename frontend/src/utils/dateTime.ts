const MOSCOW_TIMEZONE = 'Europe/Moscow';

export const formatMoscowDate = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  return date.toLocaleDateString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    ...options,
  });
};

export const formatMoscowTime = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  return date.toLocaleTimeString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};

export const formatMoscowDateTime = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  return date.toLocaleString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    ...options,
  });
};
