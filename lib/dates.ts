const ruDate = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});
const ruWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
const ruDateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatDay(value: string): string {
  return ruDate.format(new Date(`${value}T12:00:00`));
}

export function formatWeekday(value: string): string {
  const result = ruWeekday.format(new Date(`${value}T12:00:00`));
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function formatDateTime(value: string): string {
  return ruDateTime.format(new Date(value));
}

export function shortTime(value: string | null): string {
  return value ? value.slice(0, 5) : '—';
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
