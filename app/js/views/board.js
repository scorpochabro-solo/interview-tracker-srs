import { STATUSES } from '../constants.js';
import { dayLabel, formatDate } from '../dates.js';
import { countLabel } from '../format.js';
import { html } from '../html.js';
import {
  groupByStatus, nextInterview, searchApplications, sortApplications, taskProgress, tasksOf,
} from '../model.js';
import { addButton } from './forms.js';
import {
  emptyNote, icon, statusSelect, viewHead,
} from './parts.js';

const APPLICATION_FORMS = ['отклик', 'отклика', 'откликов'];

function card(state, app, now) {
  const next = nextInterview(state.interviews, app.id, now);
  const progress = taskProgress(tasksOf(state.tasks, app.id));
  return html`
    <li class="card card--${app.status}">
      <h3 class="card__company">
        <button type="button" class="card__open" data-action="open-application" data-id="${app.id}"
          data-focus-key="open-${app.id}">${app.company}</button>
      </h3>
      <p class="card__position">${app.position}</p>
      <ul class="card__facts">
        <li>отклик ${formatDate(app.appliedAt)}</li>
        ${next ? html`<li class="card__next"><span>собеседование</span> ${dayLabel(next.date, now)}, ${next.time}</li>` : ''}
        ${progress.total ? html`<li>подготовка ${progress.done}/${progress.total}</li>` : ''}
      </ul>
      <div class="card__status">${statusSelect(app, `card-${app.id}`)}</div>
    </li>`;
}

function column(state, status, apps, now) {
  return html`
    <section class="column column--${status.id}" aria-labelledby="col-${status.id}">
      <header class="column__head">
        <h2 class="column__title status status--${status.id}" id="col-${status.id}">${status.title}</h2>
        <span class="column__count" aria-label="${countLabel(apps.length, APPLICATION_FORMS)}">${apps.length}</span>
      </header>
      ${apps.length
        ? html`<ul class="column__list">${apps.map((app) => card(state, app, now))}</ul>`
        : html`<p class="column__empty">Пусто</p>`}
    </section>`;
}

export function renderBoard(state, ui, now) {
  const total = state.applications.length;
  const found = sortApplications(searchApplications(state.applications, ui.search));
  const groups = groupByStatus(found);

  let content;
  if (total === 0) {
    content = emptyNote(
      'Здесь будут все ваши отклики. Добавьте первый — компанию, должность и дату отклика.',
      addButton('new-application', 'Добавить отклик', { extraClass: 'btn--primary', focusKey: 'empty-new-application' }),
    );
  } else if (found.length === 0) {
    content = emptyNote(`По запросу «${ui.search.trim()}» ничего не нашлось.`);
  } else {
    content = html`
      <div class="board" data-scroll-key="board">
        ${STATUSES.map((status) => column(state, status, groups[status.id], now))}
      </div>`;
  }

  const toolbar = total === 0 ? '' : html`
    <label class="search">
      ${icon('search')}
      <span class="visually-hidden">Поиск по компании и должности</span>
      <input class="search__input" type="search" value="${ui.search}" placeholder="Компания или должность"
        data-input="search" data-focus-key="search" autocomplete="off">
    </label>
    ${addButton('new-application', 'Новый отклик', { extraClass: 'btn--primary', focusKey: 'new-application' })}`;

  return html`
    <section class="view" aria-labelledby="view-title">
      ${viewHead({
        index: 1,
        title: 'Отклики',
        lead: total ? countLabel(total, APPLICATION_FORMS) : 'Пока ни одного отклика',
        toolbar,
      })}
      ${content}
    </section>`;
}
