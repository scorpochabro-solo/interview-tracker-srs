// Даты храним строками 'ГГГГ-ММ-ДД' и время 'ЧЧ:ММ' в локальном часовом поясе,
// так их отдаёт <input type="date"> и <input type="time">.

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidTimestamp(value) {
  return typeof value === 'string' && value !== '' && !Number.isNaN(Date.parse(value));
}

export function toLocalDate(isoDate, time = '00:00') {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function formatDate(isoDate) {
  if (!isValidISODate(isoDate)) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(toISODate(date))} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Разница в календарных днях. Math.round спасает от перехода на летнее время,
// когда в сутках 23 или 25 часов.
export function daysBetween(fromISO, toISO) {
  return Math.round((toLocalDate(toISO) - toLocalDate(fromISO)) / MS_PER_DAY);
}

export function minutesUntil(target, now = new Date()) {
  return Math.floor((target - now) / MS_PER_MINUTE);
}

export function dayLabel(isoDate, now = new Date()) {
  const diff = daysBetween(todayISO(now), isoDate);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  return formatDate(isoDate);
}

export function formatCountdown(minutes) {
  if (minutes < 1) return 'меньше минуты';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}
