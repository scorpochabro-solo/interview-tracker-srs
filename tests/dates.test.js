import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dayLabel, daysBetween, formatCountdown, formatDate, formatDateTime, isValidISODate,
  isValidTime, isValidTimestamp, minutesUntil, toLocalDate, todayISO,
} from '../app/js/dates.js';

test('todayISO берёт локальную дату', () => {
  assert.equal(todayISO(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('isValidISODate отсекает несуществующие даты', () => {
  assert.equal(isValidISODate('2026-02-28'), true);
  assert.equal(isValidISODate('2028-02-29'), true);
  assert.equal(isValidISODate('2026-02-29'), false);
  assert.equal(isValidISODate('2026-13-01'), false);
  assert.equal(isValidISODate('01.02.2026'), false);
  assert.equal(isValidISODate(''), false);
  assert.equal(isValidISODate(null), false);
});

test('isValidTime принимает только ЧЧ:ММ в 24-часовом формате', () => {
  assert.equal(isValidTime('00:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('9:30'), false);
  assert.equal(isValidTime(930), false);
});

test('isValidTimestamp', () => {
  assert.equal(isValidTimestamp('2026-09-01T10:00:00.000Z'), true);
  assert.equal(isValidTimestamp('вчера'), false);
  assert.equal(isValidTimestamp(''), false);
  assert.equal(isValidTimestamp(undefined), false);
});

test('formatDate выводит ДД.ММ.ГГГГ', () => {
  assert.equal(formatDate('2026-09-07'), '07.09.2026');
  assert.equal(formatDate('ерунда'), '');
});

test('formatDateTime выводит дату и время в 24-часовом формате', () => {
  const at = new Date(2026, 8, 7, 18, 5).toISOString();
  assert.equal(formatDateTime(at), '07.09.2026 18:05');
  assert.equal(formatDateTime('не дата'), '');
});

test('toLocalDate собирает дату и время', () => {
  const date = toLocalDate('2026-10-01', '11:30');
  assert.equal(date.getHours(), 11);
  assert.equal(date.getMinutes(), 30);
  assert.equal(date.getDate(), 1);
});

test('daysBetween считает календарные дни', () => {
  assert.equal(daysBetween('2026-09-01', '2026-09-15'), 14);
  assert.equal(daysBetween('2026-09-15', '2026-09-01'), -14);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});

test('minutesUntil', () => {
  const now = new Date(2026, 8, 1, 10, 0);
  assert.equal(minutesUntil(new Date(2026, 8, 1, 11, 30), now), 90);
  assert.equal(minutesUntil(new Date(2026, 8, 1, 9, 0), now), -60);
});

test('dayLabel пишет «сегодня» и «завтра»', () => {
  const now = new Date(2026, 8, 30, 12, 0);
  assert.equal(dayLabel('2026-09-30', now), 'сегодня');
  assert.equal(dayLabel('2026-10-01', now), 'завтра');
  assert.equal(dayLabel('2026-10-05', now), '05.10.2026');
});

test('formatCountdown', () => {
  assert.equal(formatCountdown(0), 'меньше минуты');
  assert.equal(formatCountdown(45), '45 мин');
  assert.equal(formatCountdown(120), '2 ч');
  assert.equal(formatCountdown(135), '2 ч 15 мин');
});
