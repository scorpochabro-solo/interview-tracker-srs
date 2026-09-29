// Карточка отклика: подробности, собеседования, подготовка и история статусов.

import { MAX_SHORT, SOURCES, STATUSES, titleOf } from '../constants.js';
import { formatDate, formatDateTime } from '../dates.js';
import { html, safeUrl } from '../html.js';
import {
  findById, interviewsOf, sortTasks, taskProgress, tasksOf,
} from '../model.js';
import { addButton, sheetHead } from './forms.js';
import {
  icon, meetingItem, progressBar, statusBadge, statusSelect, taskItem,
} from './parts.js';

function contactFacts(contact) {
  if (!contact) return html`<dd>не указан</dd>`;
  return html`
    <dd>
      ${contact.name}${contact.role ? html`, <span class="muted">${contact.role}</span>` : ''}
      ${contact.phone ? html`<br><a href="tel:${contact.phone.replace(/[^\d+]/g, '')}">${contact.phone}</a>` : ''}
      ${contact.email ? html`<br><a href="mailto:${contact.email}">${contact.email}</a>` : ''}
      ${contact.telegram ? html`<br><a href="https://t.me/${contact.telegram}" target="_blank" rel="noopener noreferrer">@${contact.telegram}</a>` : ''}
    </dd>`;
}

function facts(state, app) {
  const contact = app.contactId ? findById(state.contacts, app.contactId) : null;
  return html`
    <dl class="facts">
      <div><dt>Источник</dt><dd>${titleOf(SOURCES, app.source) || 'не указан'}</dd></div>
      <div><dt>Зарплатная вилка</dt><dd>${app.salary || 'не указана'}</dd></div>
      <div><dt>Вакансия</dt><dd>${app.url
        ? html`<a href="${safeUrl(app.url)}" target="_blank" rel="noopener noreferrer">${icon('link')} открыть</a>`
        : 'ссылки нет'}</dd></div>
      <div><dt>Контакт HR</dt>${contactFacts(contact)}</div>
    </dl>`;
}

function interviewsSection(state, app, now) {
  const interviews = interviewsOf(state.interviews, app.id);
  return html`
    <section class="sheet__section" aria-labelledby="sec-interviews">
      <div class="section-head">
        <h3 id="sec-interviews">Собеседования</h3>
        ${addButton('new-interview', 'Добавить', { data: { 'application-id': app.id }, extraClass: 'btn--small', focusKey: 'detail-new-interview' })}
      </div>
      ${interviews.length
        ? html`<ul class="meetings meetings--compact">${interviews.map((item) => meetingItem(item, { now, ctx: 'detail' }))}</ul>`
        : html`<p class="muted">Собеседований пока нет.</p>`}
    </section>`;
}

function tasksSection(state, app, now) {
  const tasks = sortTasks(tasksOf(state.tasks, app.id));
  const progress = taskProgress(tasks);
  return html`
    <section class="sheet__section" aria-labelledby="sec-tasks">
      <div class="section-head">
        <h3 id="sec-tasks">Подготовка</h3>
        <span class="section-head__meta">выполнено ${progress.done} из ${progress.total}</span>
      </div>
      ${progress.total ? progressBar(progress, 'Подготовка') : ''}
      ${tasks.length ? html`<ul class="tasks">${tasks.map((task) => taskItem(task, { now, ctx: 'detail' }))}</ul>` : ''}
      <form class="quick-add" data-form="quick-task" data-application-id="${app.id}" novalidate>
        <label class="visually-hidden" for="quick-task-${app.id}">Новая задача по подготовке</label>
        <input class="field__control" id="quick-task-${app.id}" name="title" maxlength="${MAX_SHORT * 2}"
          placeholder="Новая задача, например «изучить продукт компании»" autocomplete="off"
          data-focus-key="quick-task">
        <button type="submit" class="btn btn--small">${icon('plus')}<span>Добавить</span></button>
      </form>
    </section>`;
}

function historySection(app) {
  return html`
    <section class="sheet__section" aria-labelledby="sec-history">
      <h3 id="sec-history">История статусов</h3>
      <ol class="history">
        ${app.history.map((entry) => html`
          <li class="history__item history__item--${entry.status}">
            ${statusBadge(entry.status)}
            <time datetime="${entry.at}">${formatDateTime(entry.at)}</time>
          </li>`)}
      </ol>
    </section>`;
}

export function renderApplication(state, modal, now) {
  const app = findById(state.applications, modal.id);
  if (!app) return null;

  return html`
    ${sheetHead({ eyebrow: `Отклик от ${formatDate(app.appliedAt)}`, title: app.company, subtitle: app.position })}
    <div class="sheet__body" data-scroll-key="sheet">
      <div class="sheet__status">
        <span class="sheet__status-label" aria-hidden="true">Статус</span>
        ${statusSelect(app, `detail-${app.id}`)}
        <span class="visually-hidden">Сейчас: ${titleOf(STATUSES, app.status)}</span>
      </div>
      ${facts(state, app)}
      ${app.notes ? html`<p class="notes">${app.notes}</p>` : ''}
      ${interviewsSection(state, app, now)}
      ${tasksSection(state, app, now)}
      ${historySection(app)}
    </div>
    <footer class="sheet__foot">
      <button type="button" class="btn btn--danger" data-action="delete-application" data-id="${app.id}">
        ${icon('trash')}<span>Удалить</span></button>
      <button type="button" class="btn btn--primary" data-action="edit-application" data-id="${app.id}"
        data-focus-key="detail-edit">${icon('edit')}<span>Редактировать</span></button>
    </footer>`;
}
