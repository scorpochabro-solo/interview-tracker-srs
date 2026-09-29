import { html } from '../html.js';
import { groupInterviews, isTaskOverdue } from '../model.js';

export const TABS = [
  { id: 'board', title: 'Отклики' },
  { id: 'interviews', title: 'Собеседования' },
  { id: 'tasks', title: 'Подготовка' },
  { id: 'contacts', title: 'Контакты HR' },
  { id: 'summary', title: 'Сводка' },
];

export function tabFromHash(hash) {
  const id = hash.replace(/^#/, '');
  return TABS.some((tab) => tab.id === id) ? id : TABS[0].id;
}

function counters(state, now) {
  const today = groupInterviews(state.interviews, now).today.length;
  const overdue = state.tasks.filter((task) => isTaskOverdue(task, now)).length;
  return {
    board: state.applications.length ? { value: state.applications.length, label: 'всего' } : null,
    interviews: today ? { value: today, label: 'сегодня', accent: true } : null,
    tasks: overdue ? { value: overdue, label: 'просрочено', alert: true } : null,
    contacts: state.contacts.length ? { value: state.contacts.length, label: 'всего' } : null,
    summary: null,
  };
}

export function renderNav(state, ui, now) {
  const counts = counters(state, now);
  return html`
    <ul class="tabs">
      ${TABS.map((tab) => {
        const count = counts[tab.id];
        return html`
          <li>
            <a class="tab" href="#${tab.id}" ${tab.id === ui.tab ? html`aria-current="page"` : ''}
              data-focus-key="tab-${tab.id}">
              ${tab.title}
              ${count ? html`<span class="tab__count ${count.accent ? 'tab__count--accent' : ''} ${count.alert ? 'tab__count--alert' : ''}">
                ${count.value}<span class="visually-hidden"> ${count.label}</span></span>` : ''}
            </a>
          </li>`;
      })}
    </ul>`;
}
