import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countLabel, formatPercent, normalizeSearch, plural } from '../app/js/format.js';
import {
  hasErrors, isValidEmail, isValidPhone, isValidTelegram, isValidUrl,
  validateApplication, validateContact, validateInterview, validateTask,
} from '../app/js/validate.js';

const goodApplication = {
  company: 'Яндекс',
  position: 'Frontend-разработчик',
  appliedAt: '2026-09-10',
  url: 'https://hh.ru/vacancy/1',
  source: 'hh',
};

test('plural склоняет по-русски', () => {
  const forms = ['отклик', 'отклика', 'откликов'];
  assert.equal(plural(1, forms), 'отклик');
  assert.equal(plural(3, forms), 'отклика');
  assert.equal(plural(5, forms), 'откликов');
  assert.equal(plural(11, forms), 'откликов');
  assert.equal(plural(12, forms), 'откликов');
  assert.equal(plural(21, forms), 'отклик');
  assert.equal(plural(22, forms), 'отклика');
  assert.equal(countLabel(0, forms), '0 откликов');
});

test('formatPercent показывает прочерк вместо null', () => {
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(40), '40%');
});

test('normalizeSearch не различает регистр и ё', () => {
  assert.equal(normalizeSearch('  Ёлка '), 'елка');
});

test('isValidUrl принимает только http и https', () => {
  assert.equal(isValidUrl('https://hh.ru/vacancy/123'), true);
  assert.equal(isValidUrl('http://example.com'), true);
  assert.equal(isValidUrl('javascript:alert(1)'), false);
  assert.equal(isValidUrl('ftp://example.com'), false);
  assert.equal(isValidUrl('hh.ru'), false);
});

test('isValidEmail', () => {
  assert.equal(isValidEmail('hr@company.ru'), true);
  assert.equal(isValidEmail('hr@company'), false);
  assert.equal(isValidEmail('hr company.ru'), false);
});

test('isValidPhone', () => {
  assert.equal(isValidPhone('+7 (999) 123-45-67'), true);
  assert.equal(isValidPhone('12-34'), false);
  assert.equal(isValidPhone('+7 999 abc'), false);
});

test('isValidTelegram', () => {
  assert.equal(isValidTelegram('@hr_anna'), true);
  assert.equal(isValidTelegram('hr_anna'), true);
  assert.equal(isValidTelegram('@ann'), false);
  assert.equal(isValidTelegram('анна_hr'), false);
});

test('корректный отклик проходит проверку', () => {
  assert.equal(hasErrors(validateApplication(goodApplication)), false);
});

test('у отклика обязательны компания, должность и дата', () => {
  const errors = validateApplication({ company: '  ', position: '', appliedAt: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['appliedAt', 'company', 'position']);
});

test('отклик с плохой ссылкой, датой или источником не проходит', () => {
  const errors = validateApplication({
    ...goodApplication, url: 'hh.ru/vacancy', appliedAt: '2026-02-30', source: 'avito',
  });
  assert.ok(errors.url);
  assert.ok(errors.appliedAt);
  assert.ok(errors.source);
});

test('слишком длинное поле не проходит', () => {
  const errors = validateApplication({ ...goodApplication, company: 'а'.repeat(121) });
  assert.equal(errors.company, 'Не больше 120 символов');
});

test('собеседование: обязательны дата, время, этап и формат', () => {
  const errors = validateInterview({ applicationId: 'a1' });
  assert.deepEqual(Object.keys(errors).sort(), ['date', 'format', 'stage', 'time']);

  const ok = validateInterview({
    applicationId: 'a1', date: '2026-10-01', time: '11:00', stage: 'hr', format: 'online', result: 'pending',
  });
  assert.equal(hasErrors(ok), false);
});

test('задача: обязателен только текст', () => {
  assert.ok(validateTask({}).title);
  assert.equal(hasErrors(validateTask({ title: 'Повторить SQL' })), false);
  assert.ok(validateTask({ title: 'x', dueDate: '2026-99-01' }).dueDate);
});

test('контакт: имя обязательно, e-mail и Telegram проверяются', () => {
  assert.ok(validateContact({}).name);
  const errors = validateContact({ name: 'Анна', email: 'anna@', telegram: '@a', phone: 'звонить' });
  assert.ok(errors.email);
  assert.ok(errors.telegram);
  assert.ok(errors.phone);
  assert.equal(hasErrors(validateContact({ name: 'Анна', email: 'anna@firm.ru' })), false);
});
