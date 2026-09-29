import {
  addApplication, addContact, addInterview, addTask, emptyState,
} from '../app/js/model.js';

export const NOW = new Date(2026, 8, 20, 10, 0); // 20.09.2026 10:00

export function application(overrides = {}) {
  return {
    company: 'Яндекс',
    position: 'Frontend-разработчик',
    appliedAt: '2026-09-10',
    url: 'https://hh.ru/vacancy/1',
    source: 'hh',
    salary: '150–200 тыс.',
    notes: '',
    ...overrides,
  };
}

export function interview(applicationId, overrides = {}) {
  return {
    applicationId,
    date: '2026-09-21',
    time: '11:00',
    stage: 'hr',
    format: 'online',
    place: 'https://telemost.yandex.ru/j/123',
    interviewer: 'Анна',
    ...overrides,
  };
}

// Небольшое готовое состояние: два отклика, контакт, собеседование и задачи.
export function sampleState() {
  let state = emptyState();
  state = addContact(state, { name: 'Анна Смирнова', company: 'Яндекс', email: 'anna@ya.ru' }, NOW, 'c1');
  state = addApplication(state, application({ contactId: 'c1' }), NOW, 'a1');
  state = addApplication(state, application({ company: 'Ozon', appliedAt: '2026-09-12' }), NOW, 'a2');
  state = addInterview(state, interview('a1'), NOW, 'i1');
  state = addTask(state, { title: 'Повторить замыкания', applicationId: 'a1', dueDate: '2026-09-19' }, NOW, 't1');
  state = addTask(state, { title: 'Почитать про компанию', applicationId: 'a1' }, NOW, 't2');
  return state;
}
