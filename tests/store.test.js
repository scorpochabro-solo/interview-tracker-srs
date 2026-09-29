import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emptyState } from '../app/js/model.js';
import {
  STORAGE_KEY, backupFileName, loadState, normalizeState, parseBackup, saveState, serializeBackup,
} from '../app/js/store.js';
import { NOW, sampleState } from './fixtures.js';

// Простая замена localStorage для тестов.
function memoryStorage(initial = {}, { failOnSet = null } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem(key, value) {
      if (failOnSet) throw failOnSet;
      data.set(key, String(value));
    },
    removeItem: (key) => data.delete(key),
  };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

test('сохранённые данные загружаются обратно без изменений', () => {
  const storage = memoryStorage();
  const state = sampleState();
  assert.deepEqual(saveState(storage, state), { ok: true });

  const loaded = loadState(storage, NOW);
  assert.equal(loaded.problem, null);
  assert.deepEqual(loaded.state, state);
});

test('при первом запуске — пустые списки', () => {
  const loaded = loadState(memoryStorage(), NOW);
  assert.equal(loaded.problem, null);
  assert.deepEqual(loaded.state, emptyState());
});

test('повреждённые данные откладываются в отдельный ключ', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{не json' });
  const loaded = loadState(storage, NOW);

  assert.equal(loaded.problem, 'corrupted');
  assert.deepEqual(loaded.state, emptyState());
  assert.equal(storage.data.get(loaded.backupKey), '{не json');
  assert.equal(storage.data.has(STORAGE_KEY), false);
});

test('если копию повреждённых данных сделать нельзя — данные не трогаются', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '[]' }, { failOnSet: new Error('нет места') });
  const loaded = loadState(storage, NOW);
  assert.equal(loaded.problem, 'locked');
  assert.equal(storage.data.get(STORAGE_KEY), '[]');
});

test('недоступный localStorage не ломает запуск', () => {
  const storage = { getItem() { throw new Error('SecurityError'); } };
  const loaded = loadState(storage, NOW);
  assert.equal(loaded.problem, 'unavailable');
  assert.deepEqual(loaded.state, emptyState());
});

test('saveState сообщает о нехватке места', () => {
  const quota = new Error('quota');
  quota.name = 'QuotaExceededError';
  const full = saveState(memoryStorage({}, { failOnSet: quota }), emptyState());
  assert.equal(full.ok, false);
  assert.match(full.message, /Не хватает места/);

  const other = saveState(memoryStorage({}, { failOnSet: new Error('что-то') }), emptyState());
  assert.match(other.message, /Не удалось сохранить/);
});

test('резервная копия читается обратно', () => {
  const state = sampleState();
  const result = parseBackup(serializeBackup(state));
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, state);
});

test('имя файла копии содержит дату', () => {
  assert.equal(backupFileName(NOW), 'interview-tracker-2026-09-20.json');
});

test('parseBackup отклоняет не-JSON и чужие данные', () => {
  assert.equal(parseBackup('привет').ok, false);
  assert.match(parseBackup('[]').message, /не данные трекера/);
  assert.match(parseBackup('{"version": 2}').message, /версия/);
  assert.match(parseBackup('{"version": 1, "applications": []}').message, /собеседования/);
});

test('лишние поля из файла отбрасываются', () => {
  const raw = clone(sampleState());
  raw.applications[0].isAdmin = true;
  raw.extra = 'x';
  const state = normalizeState(raw);
  assert.equal('isAdmin' in state.applications[0], false);
  assert.equal('extra' in state, false);
});

const broken = [
  ['запись не объект', (raw) => { raw.applications[0] = 'строка'; }, /неверный формат/],
  ['нет id', (raw) => { delete raw.tasks[0].id; }, /нет идентификатора/],
  ['пустая компания', (raw) => { raw.applications[0].company = ''; }, /Укажите компанию/],
  ['неизвестный статус', (raw) => { raw.applications[0].status = 'hired'; }, /неизвестный статус/],
  ['пустая история', (raw) => { raw.applications[0].history = []; }, /нет истории/],
  ['битая история', (raw) => { raw.applications[0].history[0].at = 'вчера'; }, /истории статусов/],
  ['битая дата создания', (raw) => { raw.contacts[0].createdAt = 5; }, /дата создания/],
  ['done не boolean', (raw) => { raw.tasks[0].done = 'да'; }, /отметка о выполнении/],
  ['плохой e-mail', (raw) => { raw.contacts[0].email = 'anna@'; }, /e-mail/],
  ['неверное время собеседования', (raw) => { raw.interviews[0].time = '25:00'; }, /ЧЧ:ММ/],
  ['javascript-ссылка', (raw) => { raw.applications[0].url = 'javascript:alert(1)'; }, /http/],
  ['повтор id', (raw) => { raw.tasks[1].id = raw.tasks[0].id; }, /повторяются/],
  ['чужой контакт', (raw) => { raw.applications[0].contactId = 'нет'; }, /несуществующий контакт/],
  ['собеседование без отклика', (raw) => { raw.interviews[0].applicationId = 'нет'; }, /несуществующий отклик/],
  ['задача без отклика', (raw) => { raw.tasks[0].applicationId = 'нет'; }, /несуществующий отклик/],
];

for (const [name, breakIt, message] of broken) {
  test(`parseBackup: ${name}`, () => {
    const raw = clone(sampleState());
    breakIt(raw);
    const result = parseBackup(JSON.stringify(raw));
    assert.equal(result.ok, false);
    assert.match(result.message, message);
  });
}
