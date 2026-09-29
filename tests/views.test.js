// Разделы — это чистые функции «состояние -> разметка», поэтому их можно
// проверить без браузера: что всё рисуется и что текст пользователя экранируется.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SafeHtml, escapeHtml, html, safeUrl, setHtml } from '../app/js/html.js';
import { addApplication, emptyState, setStatus } from '../app/js/model.js';
import { renderBoard } from '../app/js/views/board.js';
import { renderContacts } from '../app/js/views/contacts.js';
import { renderInterviews } from '../app/js/views/interviews.js';
import { modalKey, renderModal } from '../app/js/views/modal.js';
import { renderNav, tabFromHash } from '../app/js/views/nav.js';
import { renderNotices } from '../app/js/views/notices.js';
import { renderSummary } from '../app/js/views/summary.js';
import { renderTasks } from '../app/js/views/tasks.js';
import { NOW, application, sampleState } from './fixtures.js';

const ui = { tab: 'board', search: '', contactSearch: '', taskFilter: 'all', storageProblem: null, saveError: null };
const text = (safe) => String(safe);
const EVIL = '<img src=x onerror=alert(1)>';

test('html`` экранирует подставленные значения', () => {
  const out = html`<p title="${'"a"'}">${EVIL}</p>`;
  assert.ok(out instanceof SafeHtml);
  assert.equal(text(out), '<p title="&quot;a&quot;">&lt;img src=x onerror=alert(1)&gt;</p>');
});

test('html`` вставляет вложенную разметку и массивы, пропускает пустые значения', () => {
  const items = ['a', '<b>'].map((item) => html`<li>${item}</li>`);
  assert.equal(text(html`<ul>${items}</ul>${null}${undefined}${false}${0}`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>0');
  assert.equal(escapeHtml(`'&'`), '&#39;&amp;&#39;');
});

test('setHtml принимает только безопасную разметку', () => {
  const element = { innerHTML: '' };
  setHtml(element, html`<b>${'x'}</b>`);
  assert.equal(element.innerHTML, '<b>x</b>');
  assert.throws(() => setHtml(element, '<b>x</b>'), TypeError);
});

test('safeUrl пропускает только http и https', () => {
  assert.equal(safeUrl('https://hh.ru'), 'https://hh.ru');
  assert.equal(safeUrl('javascript:alert(1)'), '#');
});

test('все разделы рисуются на пустых данных', () => {
  const state = emptyState();
  assert.match(text(renderBoard(state, ui, NOW)), /Добавить отклик/);
  assert.match(text(renderInterviews(state, ui, NOW)), /Сначала добавьте отклик/);
  assert.match(text(renderTasks(state, ui, NOW)), /Задач пока нет/);
  assert.match(text(renderContacts(state, ui, NOW)), /Пока никого/);
  assert.match(text(renderSummary(state, ui, NOW)), /—/);
  assert.equal(text(renderNotices(state, ui, NOW)).trim(), '');
});

test('доска: пять колонок, счётчики и поиск', () => {
  const out = text(renderBoard(sampleState(), ui, NOW));
  assert.equal((out.match(/class="column column--/g) ?? []).length, 5);
  assert.match(out, /собеседование<\/span> завтра, 11:00/);
  assert.match(text(renderBoard(sampleState(), { ...ui, search: 'сбер' }, NOW)), /ничего не нашлось/);
});

test('текст из формы не превращается в разметку ни в одном разделе', () => {
  let state = addApplication(emptyState(), application({ company: EVIL, position: EVIL, notes: EVIL }), NOW, 'x1');
  state = setStatus(state, 'x1', 'test', NOW);
  const views = [renderBoard, renderInterviews, renderTasks, renderContacts, renderSummary];
  for (const render of views) {
    assert.doesNotMatch(text(render(state, { ...ui, search: EVIL }, NOW)), /<img/);
  }
  assert.doesNotMatch(text(renderModal(state, { kind: 'application', id: 'x1' }, NOW)), /<img/);
});

test('напоминание появляется за сутки до собеседования', () => {
  const soon = new Date(2026, 8, 21, 9, 0); // за 2 часа до собеседования i1
  const out = text(renderNotices(sampleState(), ui, soon));
  assert.match(out, /Скоро собеседование/);
  assert.match(out, /через 2 ч/);
});

test('проблемы с хранилищем показываются, пока их не скрыли', () => {
  const problem = { kind: 'corrupted', message: 'Файл повреждён', backupKey: 'k', dismissed: false };
  assert.match(text(renderNotices(emptyState(), { ...ui, storageProblem: problem }, NOW)), /повреждены/);
  assert.equal(text(renderNotices(emptyState(), { ...ui, storageProblem: { ...problem, dismissed: true } }, NOW)).trim(), '');
  assert.match(text(renderNotices(emptyState(), { ...ui, saveError: 'Нет места' }, NOW)), /Нет места/);
});

test('меню: текущий раздел, счётчики и разбор адреса', () => {
  const out = text(renderNav(sampleState(), { ...ui, tab: 'tasks' }, NOW));
  assert.match(out, /href="#tasks" aria-current="page"/);
  assert.match(out, /просрочено/);
  assert.equal(tabFromHash('#contacts'), 'contacts');
  assert.equal(tabFromHash('#нет-такого'), 'board');
  assert.equal(tabFromHash(''), 'board');
});

test('задачи: фильтр и группы по откликам', () => {
  const out = text(renderTasks(sampleState(), { ...ui, taskFilter: 'done' }, NOW));
  assert.match(out, /Выполненных задач пока нет/);
  const all = text(renderTasks(sampleState(), ui, NOW));
  assert.match(all, /Яндекс — Frontend-разработчик/);
  assert.match(all, /просрочено/);
});

test('контакты: пометка «давно не связывались» и связанные отклики', () => {
  const late = new Date(2026, 9, 30);
  const state = sampleState();
  const withDate = { ...state, contacts: state.contacts.map((c) => ({ ...c, lastContactAt: '2026-09-01' })) };
  const out = text(renderContacts(withDate, ui, late));
  assert.match(out, /давно не связывались/);
  assert.match(out, /Яндекс — Frontend-разработчик/);
  assert.match(text(renderContacts(state, { ...ui, contactSearch: 'зzz' }, NOW)), /никого не нашлось/);
});

test('окна: формы, карточка и удалённые записи', () => {
  const state = sampleState();
  assert.match(text(renderModal(state, { kind: 'application', id: 'a1' }, NOW)), /История статусов/);
  assert.match(text(renderModal(state, { kind: 'application-form' }, NOW)), /Новый отклик/);
  assert.match(text(renderModal(state, { kind: 'application-form', id: 'a1' }, NOW)), /Изменить отклик/);
  assert.match(text(renderModal(state, { kind: 'interview-form' }, NOW)), /Выберите отклик/);
  assert.match(text(renderModal(state, { kind: 'interview-form', applicationId: 'a1' }, NOW)), /type="hidden"/);
  assert.match(text(renderModal(state, { kind: 'interview-form', id: 'i1' }, NOW)), /Изменить собеседование/);
  assert.match(text(renderModal(state, { kind: 'task-form', id: 't1' }, NOW)), /Повторить замыкания/);
  assert.match(text(renderModal(state, { kind: 'contact-form', id: 'c1' }, NOW)), /@?Анна/);
  assert.equal(renderModal(state, { kind: 'application', id: 'нет' }, NOW), null);
  assert.equal(renderModal(state, { kind: 'task-form', id: 'нет' }, NOW), null);
  assert.throws(() => renderModal(state, { kind: 'что-то' }, NOW), /Неизвестное окно/);
});

test('форма показывает введённое и ошибки', () => {
  const modal = { kind: 'application-form', draft: { company: EVIL, position: '' }, errors: { position: 'Укажите должность' } };
  const out = text(renderModal(sampleState(), modal, NOW));
  assert.match(out, /Укажите должность/);
  assert.match(out, /aria-invalid="true"/);
  assert.doesNotMatch(out, /<img/);
});

test('modalKey различает окна', () => {
  assert.equal(modalKey(null), null);
  assert.equal(modalKey({ kind: 'application', id: 'a1' }), 'application:a1');
  assert.equal(modalKey({ kind: 'interview-form', applicationId: 'a1' }), 'interview-form:a1');
  assert.equal(modalKey({ kind: 'contact-form' }), 'contact-form:new');
});

test('собеседования: группы, ссылка на встречу и адрес', () => {
  let state = sampleState();
  state = { ...state, interviews: [...state.interviews, { ...state.interviews[0], id: 'i2', date: '2026-09-20', time: '18:00', place: 'Москва, Льва Толстого, 16' }] };
  const out = text(renderInterviews(state, ui, NOW));
  assert.match(out, /Сегодня/);
  assert.match(out, /Предстоящие/);
  assert.match(out, /Ссылка на встречу/);
  assert.match(out, /Льва Толстого/);
  assert.match(out, /Впереди 2 собеседования/);
});
