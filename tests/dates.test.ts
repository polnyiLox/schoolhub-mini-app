import { describe, expect, it } from 'vitest';

import { addDays, formatDateTime, formatDay, formatWeekday, greeting, shortTime, toIsoDate } from '@/lib/dates';

describe('date helpers', () => {
  it('formats a local date without UTC drift', () => expect(toIsoDate(new Date(2026, 8, 4))).toBe('2026-09-04'));
  it('pads month and day', () => expect(toIsoDate(new Date(2026, 0, 2))).toBe('2026-01-02'));
  it('adds days without mutating input', () => { const date = new Date(2026, 0, 1); expect(toIsoDate(addDays(date, 2))).toBe('2026-01-03'); expect(toIsoDate(date)).toBe('2026-01-01'); });
  it('crosses a month boundary', () => expect(toIsoDate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01'));
  it('formats day in Russian', () => expect(formatDay('2026-09-14')).toContain('14'));
  it('capitalizes Russian weekday', () => expect(formatWeekday('2026-09-14')).toMatch(/^[А-Я]/));
  it('formats aware datetime', () => expect(formatDateTime('2026-09-14T16:30:00+04:00')).toContain('14'));
  it('shortens API time', () => expect(shortTime('08:30:00')).toBe('08:30'));
  it('handles missing time', () => expect(shortTime(null)).toBe('—'));
  it.each([[2, 'Доброй ночи'], [8, 'Доброе утро'], [14, 'Добрый день'], [21, 'Добрый вечер']] as const)('returns greeting for hour %i', (hour, expected) => expect(greeting(hour)).toBe(expected));
});
