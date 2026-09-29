import { countLabel } from '../format.js';
import { html } from '../html.js';
import { findById, groupInterviews, interviewStart } from '../model.js';
import { addButton } from './forms.js';
import { emptyNote, meetingItem, viewHead } from './parts.js';

const GROUPS = [
  { id: 'today', title: 'Сегодня' },
  { id: 'upcoming', title: 'Предстоящие' },
  { id: 'past', title: 'Прошедшие' },
];

function group(state, { id, title }, interviews, now) {
  if (interviews.length === 0) return '';
  return html`
    <section class="group group--${id}" aria-labelledby="group-${id}">
      <h2 class="group__title" id="group-${id}">${title} <span class="group__count">${interviews.length}</span></h2>
      <ul class="meetings">
        ${interviews.map((item) => meetingItem(item, {
          now, app: findById(state.applications, item.applicationId), ctx: 'list',
        }))}
      </ul>
    </section>`;
}

export function renderInterviews(state, ui, now) {
  const groups = groupInterviews(state.interviews, now);
  const upcoming = state.interviews.filter((item) => interviewStart(item) >= now).length;
  const hasApps = state.applications.length > 0;

  let content;
  if (!hasApps) {
    content = emptyNote('Собеседования привязываются к откликам. Сначала добавьте отклик в разделе «Отклики».');
  } else if (state.interviews.length === 0) {
    content = emptyNote('Собеседований пока нет. Когда вас пригласят — добавьте дату и время, трекер напомнит за сутки.');
  } else {
    content = GROUPS.map((item) => group(state, item, groups[item.id], now));
  }

  return html`
    <section class="view" aria-labelledby="view-title">
      ${viewHead({
        index: 2,
        title: 'Собеседования',
        lead: upcoming
          ? `Впереди ${countLabel(upcoming, ['собеседование', 'собеседования', 'собеседований'])}`
          : 'Предстоящих нет',
        toolbar: addButton('new-interview', 'Добавить собеседование', { extraClass: 'btn--primary', focusKey: 'new-interview', disabled: !hasApps }),
      })}
      ${content}
    </section>`;
}
