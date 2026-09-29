// Чтение и запись данных в localStorage, проверка файла резервной копии.

import { DATA_VERSION, STATUSES, hasId } from './constants.js';
import { isValidTimestamp, todayISO } from './dates.js';
import {
  applicationFields, contactFields, emptyState, interviewFields, taskFields,
} from './model.js';
import {
  validateApplication, validateContact, validateInterview, validateTask,
} from './validate.js';

export const STORAGE_KEY = 'interview-tracker';

export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function listOf(raw, key, label) {
  if (!Array.isArray(raw[key])) throw new DataError(`В данных нет списка «${label}»`);
  return raw[key];
}

function recordName(item, label, index) {
  const where = `${label} №${index + 1}`;
  if (!isObject(item)) throw new DataError(`${where}: неверный формат записи`);
  if (typeof item.id !== 'string' || item.id === '') throw new DataError(`${where}: нет идентификатора`);
  return where;
}

function assertFields(errors, where) {
  const [field] = Object.keys(errors);
  if (field) throw new DataError(`${where}: ${errors[field]} (поле ${field})`);
}

function assertTimestamp(value, where) {
  if (!isValidTimestamp(value)) throw new DataError(`${where}: неверная дата создания или изменения`);
  return value;
}

function normalizeHistory(history, where) {
  if (!Array.isArray(history) || history.length === 0) {
    throw new DataError(`${where}: нет истории статусов`);
  }
  return history.map((entry) => {
    if (!isObject(entry) || !hasId(STATUSES, entry.status) || !isValidTimestamp(entry.at)) {
      throw new DataError(`${where}: ошибка в истории статусов`);
    }
    return { status: entry.status, at: entry.at };
  });
}

function normalizeApplication(item, index) {
  const where = recordName(item, 'Отклик', index);
  const data = applicationFields(item);
  assertFields(validateApplication(data), where);
  if (!hasId(STATUSES, item.status)) throw new DataError(`${where}: неизвестный статус`);
  return {
    id: item.id,
    ...data,
    status: item.status,
    history: normalizeHistory(item.history, where),
    createdAt: assertTimestamp(item.createdAt, where),
    updatedAt: assertTimestamp(item.updatedAt, where),
  };
}

function normalizeInterview(item, index) {
  const where = recordName(item, 'Собеседование', index);
  const data = interviewFields(item);
  assertFields(validateInterview(data), where);
  return { id: item.id, ...data, createdAt: assertTimestamp(item.createdAt, where) };
}

function normalizeTask(item, index) {
  const where = recordName(item, 'Задача', index);
  const data = taskFields(item);
  assertFields(validateTask(data), where);
  if (typeof item.done !== 'boolean') throw new DataError(`${where}: неверная отметка о выполнении`);
  return { id: item.id, ...data, done: item.done, createdAt: assertTimestamp(item.createdAt, where) };
}

function normalizeContact(item, index) {
  const where = recordName(item, 'Контакт', index);
  const data = contactFields(item);
  assertFields(validateContact(data), where);
  return { id: item.id, ...data, createdAt: assertTimestamp(item.createdAt, where) };
}

function assertUniqueIds(list, label) {
  if (new Set(list.map((item) => item.id)).size !== list.length) {
    throw new DataError(`${label}: повторяются идентификаторы`);
  }
}

function assertReferences({ applications, interviews, tasks, contacts }) {
  const appIds = new Set(applications.map((app) => app.id));
  const contactIds = new Set(contacts.map((contact) => contact.id));

  if (applications.some((app) => app.contactId && !contactIds.has(app.contactId))) {
    throw new DataError('Отклик ссылается на несуществующий контакт');
  }
  if (interviews.some((item) => !appIds.has(item.applicationId))) {
    throw new DataError('Собеседование ссылается на несуществующий отклик');
  }
  if (tasks.some((task) => task.applicationId && !appIds.has(task.applicationId))) {
    throw new DataError('Задача ссылается на несуществующий отклик');
  }
}

// Проверяет «сырые» данные (из localStorage или файла) и возвращает чистое состояние.
// При любой ошибке бросает DataError с понятным сообщением.
export function normalizeState(raw) {
  if (!isObject(raw)) throw new DataError('Это не данные трекера собеседований');
  if (raw.version !== DATA_VERSION) {
    throw new DataError(`Неподдерживаемая версия данных: ${String(raw.version)}`);
  }

  const state = {
    version: DATA_VERSION,
    applications: listOf(raw, 'applications', 'отклики').map(normalizeApplication),
    interviews: listOf(raw, 'interviews', 'собеседования').map(normalizeInterview),
    tasks: listOf(raw, 'tasks', 'задачи').map(normalizeTask),
    contacts: listOf(raw, 'contacts', 'контакты').map(normalizeContact),
  };

  assertUniqueIds(state.applications, 'Отклики');
  assertUniqueIds(state.interviews, 'Собеседования');
  assertUniqueIds(state.tasks, 'Задачи');
  assertUniqueIds(state.contacts, 'Контакты');
  assertReferences(state);
  return state;
}

export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Файл повреждён или это не JSON' };
  }
  try {
    return { ok: true, state: normalizeState(raw) };
  } catch (error) {
    if (error instanceof DataError) return { ok: false, message: error.message };
    throw error;
  }
}

export function serializeBackup(state) {
  return JSON.stringify(state, null, 2);
}

export function backupFileName(now = new Date()) {
  return `interview-tracker-${todayISO(now)}.json`;
}

// problem:
//   null          — всё хорошо;
//   'unavailable' — localStorage недоступен (запрещён в настройках браузера);
//   'corrupted'   — данные были повреждены, копия лежит под ключом backupKey;
//   'locked'      — данные повреждены и скопировать их не удалось. Чтобы их
//                   не затереть, сохранять ничего нельзя.
export function loadState(storage, now = new Date()) {
  let saved;
  try {
    saved = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: emptyState(), problem: 'unavailable' };
  }
  if (saved === null) return { state: emptyState(), problem: null };

  const result = parseBackup(saved);
  if (result.ok) return { state: result.state, problem: null };

  const backupKey = `${STORAGE_KEY}:broken:${now.getTime()}`;
  try {
    storage.setItem(backupKey, saved);
    storage.removeItem(STORAGE_KEY);
    return { state: emptyState(), problem: 'corrupted', backupKey, message: result.message };
  } catch {
    return { state: emptyState(), problem: 'locked', message: result.message };
  }
}

function isQuotaError(error) {
  return error instanceof Error && (error.name === 'QuotaExceededError' || error.code === 22);
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: isQuotaError(error)
        ? 'Не хватает места в хранилище браузера. Скачайте копию данных и удалите старые записи.'
        : 'Не удалось сохранить данные в браузере.',
    };
  }
}
