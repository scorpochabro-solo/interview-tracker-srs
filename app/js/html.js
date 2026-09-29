// Шаблонная строка html`...` экранирует все подставленные значения,
// поэтому текст из форм не может превратиться в разметку или скрипт.

import { isValidUrl } from './validate.js';

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function toHtml(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  return new SafeHtml(
    strings.reduce((result, part, i) => result + toHtml(values[i - 1]) + part),
  );
}

export function setHtml(element, content) {
  if (!(content instanceof SafeHtml)) throw new TypeError('Ожидалась разметка из html`...`');
  element.innerHTML = content.value;
}

// Для href: всё, что не http(s), превращаем в безопасную заглушку.
export function safeUrl(url) {
  return isValidUrl(url) ? url : '#';
}
