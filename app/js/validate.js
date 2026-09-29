import {
  FORMATS, MAX_NOTES, MAX_PLACE, MAX_SHORT, RESULTS, SOURCES, STAGES, hasId,
} from './constants.js';
import { isValidISODate, isValidTime } from './dates.js';

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 5 && digits.length <= 15;
}

export function isValidTelegram(value) {
  return /^@?[A-Za-z0-9_]{5,32}$/.test(value);
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Маленький помощник: собирает ошибки в объект { поле: сообщение }.
function checker(fields) {
  const errors = {};
  const api = {
    required(name, message) {
      if (!errors[name] && text(fields[name]) === '') errors[name] = message;
      return api;
    },
    maxLength(name, max) {
      if (!errors[name] && text(fields[name]).length > max) {
        errors[name] = `Не больше ${max} символов`;
      }
      return api;
    },
    check(name, isValid, message) {
      const value = text(fields[name]);
      if (!errors[name] && value !== '' && !isValid(value)) errors[name] = message;
      return api;
    },
    oneOf(name, list, message) {
      return api.check(name, (value) => hasId(list, value), message);
    },
    errors,
  };
  return api;
}

export function validateApplication(fields) {
  return checker(fields)
    .required('company', 'Укажите компанию')
    .maxLength('company', MAX_SHORT)
    .required('position', 'Укажите должность')
    .maxLength('position', MAX_SHORT)
    .required('appliedAt', 'Укажите дату отклика')
    .check('appliedAt', isValidISODate, 'Такой даты нет в календаре')
    .check('url', isValidUrl, 'Ссылка должна начинаться с http:// или https://')
    .maxLength('url', MAX_PLACE)
    .oneOf('source', SOURCES, 'Выберите источник из списка')
    .maxLength('salary', MAX_SHORT)
    .maxLength('notes', MAX_NOTES)
    .errors;
}

export function validateInterview(fields) {
  return checker(fields)
    .required('applicationId', 'Выберите отклик')
    .required('date', 'Укажите дату')
    .check('date', isValidISODate, 'Такой даты нет в календаре')
    .required('time', 'Укажите время')
    .check('time', isValidTime, 'Время в формате ЧЧ:ММ')
    .required('stage', 'Выберите этап')
    .oneOf('stage', STAGES, 'Выберите этап из списка')
    .required('format', 'Выберите формат')
    .oneOf('format', FORMATS, 'Выберите формат из списка')
    .maxLength('place', MAX_PLACE)
    .maxLength('interviewer', MAX_SHORT)
    .oneOf('result', RESULTS, 'Выберите результат из списка')
    .maxLength('notes', MAX_NOTES)
    .errors;
}

export function validateTask(fields) {
  return checker(fields)
    .required('title', 'Напишите, что нужно сделать')
    .maxLength('title', MAX_SHORT * 2)
    .check('dueDate', isValidISODate, 'Такой даты нет в календаре')
    .errors;
}

export function validateContact(fields) {
  return checker(fields)
    .required('name', 'Укажите имя')
    .maxLength('name', MAX_SHORT)
    .maxLength('company', MAX_SHORT)
    .maxLength('role', MAX_SHORT)
    .check('phone', isValidPhone, 'Телефон может содержать цифры, пробелы, +, -, скобки')
    .check('email', isValidEmail, 'Проверьте e-mail, например name@company.ru')
    .maxLength('email', MAX_SHORT)
    .check('telegram', isValidTelegram, 'Ник Telegram: 5–32 латинских буквы, цифры или _')
    .check('lastContactAt', isValidISODate, 'Такой даты нет в календаре')
    .maxLength('notes', MAX_NOTES)
    .errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
