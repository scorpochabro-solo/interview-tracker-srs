export const DATA_VERSION = 1;

export const STATUSES = [
  { id: 'applied', title: 'Отклик отправлен' },
  { id: 'test', title: 'Тестовое задание' },
  { id: 'interview', title: 'Собеседование' },
  { id: 'offer', title: 'Оффер' },
  { id: 'rejected', title: 'Отказ' },
];

export const SOURCES = [
  { id: 'hh', title: 'hh.ru' },
  { id: 'habr', title: 'Хабр Карьера' },
  { id: 'superjob', title: 'SuperJob' },
  { id: 'telegram', title: 'Telegram' },
  { id: 'referral', title: 'Рекомендация' },
  { id: 'site', title: 'Сайт компании' },
  { id: 'other', title: 'Другое' },
];

export const STAGES = [
  { id: 'hr', title: 'HR-скрининг' },
  { id: 'tech', title: 'Техническое' },
  { id: 'review', title: 'Разбор тестового' },
  { id: 'final', title: 'Финальное' },
];

export const FORMATS = [
  { id: 'online', title: 'Онлайн' },
  { id: 'office', title: 'В офисе' },
  { id: 'phone', title: 'По телефону' },
];

export const RESULTS = [
  { id: 'pending', title: 'Ожидается' },
  { id: 'passed', title: 'Пройдено' },
  { id: 'failed', title: 'Не пройдено' },
];

export const REMINDER_HOURS = 24;
export const STALE_CONTACT_DAYS = 14;

export const MAX_SHORT = 120;
export const MAX_PLACE = 300;
export const MAX_NOTES = 2000;

export function titleOf(list, id) {
  return list.find((item) => item.id === id)?.title ?? '';
}

export function hasId(list, id) {
  return list.some((item) => item.id === id);
}
