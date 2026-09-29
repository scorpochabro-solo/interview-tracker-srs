import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ValidationError, addApplication, addContact, addInterview, addTask, applicationsOfContact,
  emptyState, filterTasks, findById, groupByStatus, groupInterviews, interviewsOf,
  isContactStale, isTaskOverdue, nextInterview, removeApplication, removeContact,
  removeInterview, removeTask, searchApplications, searchContacts, setInterviewResult,
  setStatus, setTaskDone, sortApplications, sortTasks, taskProgress, tasksOf,
  updateApplication, updateContact, updateInterview, updateTask, upcomingReminders, createId,
} from '../app/js/model.js';
import { NOW, application, interview, sampleState } from './fixtures.js';

test('createId выдаёт разные идентификаторы', () => {
  assert.notEqual(createId(), createId());
});

test('новый отклик получает статус «Отклик отправлен» и запись в истории', () => {
  const state = addApplication(emptyState(), application(), NOW, 'a1');
  const app = findById(state.applications, 'a1');
  assert.equal(app.status, 'applied');
  assert.deepEqual(app.history, [{ status: 'applied', at: NOW.toISOString() }]);
  assert.equal(app.contactId, null);
});

test('addApplication не меняет исходное состояние', () => {
  const before = emptyState();
  addApplication(before, application(), NOW);
  assert.equal(before.applications.length, 0);
});

test('поля отклика обрезаются от пробелов', () => {
  const state = addApplication(emptyState(), application({ company: '  VK  ' }), NOW, 'a1');
  assert.equal(state.applications[0].company, 'VK');
});

test('некорректный отклик не добавляется', () => {
  assert.throws(() => addApplication(emptyState(), application({ company: '' }), NOW), ValidationError);
  assert.throws(
    () => addApplication(emptyState(), application({ contactId: 'нет-такого' }), NOW),
    /Контакт не найден/,
  );
});

test('отклик можно отредактировать', () => {
  const state = updateApplication(sampleState(), 'a2', application({ company: 'Ozon Tech', salary: '' }), NOW);
  const app = findById(state.applications, 'a2');
  assert.equal(app.company, 'Ozon Tech');
  assert.equal(app.salary, '');
  assert.equal(app.status, 'applied');
  assert.throws(() => updateApplication(sampleState(), 'нет', application(), NOW), /не найдена/);
});

test('смена статуса пишется в историю, повторная смена на тот же статус ничего не делает', () => {
  const later = new Date(2026, 8, 25, 9, 0);
  const state = setStatus(sampleState(), 'a2', 'test', later);
  const app = findById(state.applications, 'a2');
  assert.equal(app.status, 'test');
  assert.deepEqual(app.history.at(-1), { status: 'test', at: later.toISOString() });
  assert.equal(setStatus(state, 'a2', 'test', later), state);
  assert.throws(() => setStatus(state, 'a2', 'hired'), /Неизвестный статус/);
  assert.throws(() => setStatus(state, 'нет', 'offer'), /не найден/);
});

test('удаление отклика удаляет его собеседования и задачи', () => {
  const state = removeApplication(sampleState(), 'a1');
  assert.equal(state.applications.length, 1);
  assert.equal(state.interviews.length, 0);
  assert.equal(state.tasks.length, 0);
});

test('поиск по компании и должности без учёта регистра', () => {
  const { applications } = sampleState();
  assert.deepEqual(searchApplications(applications, 'ЯН').map((a) => a.id), ['a1']);
  assert.equal(searchApplications(applications, 'frontend').length, 2);
  assert.equal(searchApplications(applications, '   ').length, 2);
  assert.equal(searchApplications(applications, 'сбер').length, 0);
});

test('сортировка откликов: сначала свежие', () => {
  const { applications } = sampleState();
  assert.deepEqual(sortApplications(applications).map((a) => a.id), ['a2', 'a1']);
});

test('группировка по статусам даёт все пять колонок', () => {
  const groups = groupByStatus(sampleState().applications);
  assert.deepEqual(Object.keys(groups), ['applied', 'test', 'interview', 'offer', 'rejected']);
  assert.equal(groups.interview.length, 1);
  assert.equal(groups.applied.length, 1);
});

test('первое собеседование переводит отклик в статус «Собеседование»', () => {
  const state = sampleState();
  assert.equal(findById(state.applications, 'a1').status, 'interview');
  assert.equal(findById(state.interviews, 'i1').result, 'pending');
});

test('из статуса «Оффер» или «Отказ» собеседование статус не меняет', () => {
  let state = setStatus(sampleState(), 'a2', 'rejected', NOW);
  state = addInterview(state, interview('a2'), NOW, 'i2');
  assert.equal(findById(state.applications, 'a2').status, 'rejected');
});

test('второе собеседование статус не трогает', () => {
  let state = setStatus(sampleState(), 'a1', 'test', NOW);
  state = addInterview(state, interview('a1', { date: '2026-09-28' }), NOW, 'i2');
  assert.equal(findById(state.applications, 'a1').status, 'test');
});

test('собеседование без отклика или без даты не добавляется', () => {
  assert.throws(() => addInterview(sampleState(), interview('нет'), NOW), /Отклик не найден/);
  assert.throws(() => addInterview(sampleState(), interview('a1', { date: '' }), NOW), ValidationError);
});

test('собеседование можно изменить, отклик при этом не меняется', () => {
  const state = updateInterview(sampleState(), 'i1', interview('a2', { time: '15:30' }));
  const item = findById(state.interviews, 'i1');
  assert.equal(item.time, '15:30');
  assert.equal(item.applicationId, 'a1');
});

test('результат собеседования и удаление', () => {
  let state = setInterviewResult(sampleState(), 'i1', 'passed');
  assert.equal(findById(state.interviews, 'i1').result, 'passed');
  assert.throws(() => setInterviewResult(state, 'i1', 'maybe'), /Неизвестный результат/);
  state = removeInterview(state, 'i1');
  assert.equal(state.interviews.length, 0);
});

test('собеседования делятся на сегодня, предстоящие и прошедшие', () => {
  let state = sampleState();
  state = addInterview(state, interview('a2', { date: '2026-09-20', time: '18:00' }), NOW, 'today-late');
  state = addInterview(state, interview('a2', { date: '2026-09-20', time: '09:00' }), NOW, 'today-early');
  state = addInterview(state, interview('a2', { date: '2026-09-01' }), NOW, 'old');
  state = addInterview(state, interview('a2', { date: '2026-09-15' }), NOW, 'less-old');

  const groups = groupInterviews(state.interviews, NOW);
  assert.deepEqual(groups.today.map((i) => i.id), ['today-early', 'today-late']);
  assert.deepEqual(groups.upcoming.map((i) => i.id), ['i1']);
  assert.deepEqual(groups.past.map((i) => i.id), ['less-old', 'old']);
});

test('напоминание показывается только если до собеседования меньше 24 часов', () => {
  let state = sampleState(); // i1: 21.09 11:00, то есть через 25 часов
  assert.equal(upcomingReminders(state.interviews, NOW).length, 0);

  state = addInterview(state, interview('a2', { date: '2026-09-21', time: '09:59' }), NOW, 'soon');
  state = addInterview(state, interview('a2', { date: '2026-09-20', time: '09:00' }), NOW, 'started');
  assert.deepEqual(upcomingReminders(state.interviews, NOW).map((i) => i.id), ['soon']);
});

test('ближайшее собеседование по отклику', () => {
  let state = sampleState();
  state = addInterview(state, interview('a1', { date: '2026-09-19' }), NOW, 'past');
  assert.equal(nextInterview(state.interviews, 'a1', NOW).id, 'i1');
  assert.equal(nextInterview(state.interviews, 'a2', NOW), null);
  assert.deepEqual(interviewsOf(state.interviews, 'a1').map((i) => i.id), ['past', 'i1']);
});

test('задачи: создание, отметка, изменение, удаление', () => {
  let state = sampleState();
  state = setTaskDone(state, 't2', true);
  assert.equal(findById(state.tasks, 't2').done, true);

  state = updateTask(state, 't2', { title: 'Прочитать отзывы на Хабре', applicationId: 'a1' });
  const task = findById(state.tasks, 't2');
  assert.equal(task.title, 'Прочитать отзывы на Хабре');
  assert.equal(task.done, true, 'изменение текста не сбрасывает отметку');

  state = removeTask(state, 't1');
  assert.deepEqual(state.tasks.map((t) => t.id), ['t2']);
});

test('задача без текста или с чужим откликом не добавляется', () => {
  assert.throws(() => addTask(sampleState(), { title: ' ' }, NOW), ValidationError);
  assert.throws(() => addTask(sampleState(), { title: 'x', applicationId: 'нет' }, NOW), /Отклик не найден/);
});

test('задача без привязки к отклику', () => {
  const state = addTask(sampleState(), { title: 'Обновить резюме', applicationId: '' }, NOW, 't3');
  const task = findById(state.tasks, 't3');
  assert.equal(task.applicationId, null);
  assert.equal(task.dueDate, null);
});

test('просроченная задача — невыполненная и со сроком в прошлом', () => {
  const state = sampleState();
  assert.equal(isTaskOverdue(findById(state.tasks, 't1'), NOW), true);
  assert.equal(isTaskOverdue(findById(state.tasks, 't2'), NOW), false, 'без срока');
  const done = setTaskDone(state, 't1', true);
  assert.equal(isTaskOverdue(findById(done.tasks, 't1'), NOW), false, 'выполненная');
});

test('фильтр, сортировка и прогресс задач', () => {
  let state = setTaskDone(sampleState(), 't1', true);
  state = addTask(state, { title: 'Без срока', applicationId: 'a1' }, NOW, 't3');
  state = addTask(state, { title: 'Со сроком', applicationId: 'a1', dueDate: '2026-09-22' }, NOW, 't4');

  assert.equal(filterTasks(state.tasks, 'active').length, 3);
  assert.equal(filterTasks(state.tasks, 'done').length, 1);
  assert.equal(filterTasks(state.tasks, 'непонятно').length, 4);
  assert.deepEqual(sortTasks(state.tasks).map((t) => t.id), ['t4', 't2', 't3', 't1']);
  assert.deepEqual(taskProgress(tasksOf(state.tasks, 'a1')), { done: 1, total: 4 });
  assert.deepEqual(taskProgress(tasksOf(state.tasks, 'a2')), { done: 0, total: 0 });
});

test('контакты: Telegram хранится без @, поиск по имени и компании', () => {
  let state = addContact(sampleState(), { name: 'Борис', company: 'Ozon', telegram: '@boris_hr' }, NOW, 'c2');
  assert.equal(findById(state.contacts, 'c2').telegram, 'boris_hr');
  assert.deepEqual(searchContacts(state.contacts, 'ozon').map((c) => c.id), ['c2']);
  assert.deepEqual(searchContacts(state.contacts, '').map((c) => c.name), ['Анна Смирнова', 'Борис']);
  assert.throws(() => addContact(state, { name: 'Вера', email: 'vera@' }, NOW), ValidationError);

  state = updateContact(state, 'c2', { name: 'Борис Петров', company: 'Ozon' });
  assert.equal(findById(state.contacts, 'c2').name, 'Борис Петров');
});

test('удаление контакта снимает привязку у откликов, но не удаляет их', () => {
  const state = removeContact(sampleState(), 'c1');
  assert.equal(state.contacts.length, 0);
  assert.equal(state.applications.length, 2);
  assert.equal(findById(state.applications, 'a1').contactId, null);
});

test('отклики контакта', () => {
  const { applications } = sampleState();
  assert.deepEqual(applicationsOfContact(applications, 'c1').map((a) => a.id), ['a1']);
});

test('контакт «давно не связывались» — больше 14 дней', () => {
  const base = { lastContactAt: null };
  assert.equal(isContactStale(base, NOW), false);
  assert.equal(isContactStale({ lastContactAt: '2026-09-06' }, NOW), false, 'ровно 14 дней');
  assert.equal(isContactStale({ lastContactAt: '2026-09-05' }, NOW), true);
});
