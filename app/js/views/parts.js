// Мелкие куски разметки, которые повторяются в нескольких разделах.

import {
  FORMATS, RESULTS, STAGES, STATUSES, titleOf,
} from '../constants.js';
import { dayLabel, formatDate } from '../dates.js';
import { SafeHtml, html, safeUrl } from '../html.js';
import { isReminderDue, isTaskOverdue } from '../model.js';
import { isValidUrl } from '../validate.js';

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
};

export function icon(name) {
  return new SafeHtml(
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`,
  );
}

export function iconButton({ action, iconName, label, data = {}, focusKey, extraClass = '' }) {
  const attrs = Object.entries(data).map(([key, value]) => html` data-${key}="${value}"`);
  return html`<button type="button" class="icon-btn ${extraClass}" data-action="${action}"${attrs}
    ${focusKey ? html`data-focus-key="${focusKey}"` : ''} aria-label="${label}" title="${label}">${icon(iconName)}</button>`;
}

export function statusBadge(status) {
  return html`<span class="status status--${status}">${titleOf(STATUSES, status)}</span>`;
}

export function statusSelect(app, focusKey) {
  const id = `status-${focusKey}`;
  return html`
    <label class="visually-hidden" for="${id}">Статус отклика ${app.company}</label>
    <span class="pill-select status--${app.status}">
      <select class="pill-select__control" id="${id}"
        data-change="status" data-id="${app.id}" data-focus-key="${focusKey}">
        ${STATUSES.map((status) => html`
          <option value="${status.id}" ${status.id === app.status ? html`selected` : ''}>${status.title}</option>`)}
      </select>
    </span>`;
}

// Шапка раздела: номер, заголовок, подзаголовок и панель действий.
// Ряд плюсов снизу стоит ровно на линиях фоновой сетки.
export function viewHead({ index, title, lead, extra = '', toolbar = '' }) {
  return html`
    <div class="view__head">
      <div class="view__intro">
        <p class="label">${String(index).padStart(2, '0')} / 05</p>
        <h1 class="view__title" id="view-title">${title}</h1>
        ${lead ? html`<p class="view__lead">${lead}</p>` : ''}
        ${extra}
      </div>
      ${toolbar ? html`<div class="toolbar">${toolbar}</div>` : ''}
      <div class="xrow" aria-hidden="true">${Array.from({ length: 11 }, () => html`<span>+</span>`)}</div>
    </div>`;
}

export function progressBar({ done, total }, label) {
  const share = total === 0 ? 0 : Math.round((done / total) * 100);
  return html`
    <div class="progress" role="img" aria-label="${label}: выполнено ${done} из ${total}">
      <span class="progress__fill" style="--share: ${share}%"></span>
    </div>`;
}

export function emptyNote(text, action) {
  return html`<div class="empty"><p>${text}</p>${action ?? ''}</div>`;
}

export function placeLink(place) {
  if (!place) return '';
  if (!isValidUrl(place)) return html`<span class="meeting__place">${place}</span>`;
  return html`<a class="meeting__place" href="${safeUrl(place)}" target="_blank" rel="noopener noreferrer">
    ${icon('link')} Ссылка на встречу</a>`;
}

// Строка собеседования. app передаём, когда нужно показать компанию (в общем списке).
export function meetingItem(interview, { now, app = null, ctx }) {
  const key = `${ctx}-${interview.id}`;
  const meta = [titleOf(STAGES, interview.stage), titleOf(FORMATS, interview.format), interview.interviewer]
    .filter(Boolean)
    .join(' · ');

  return html`
    <li class="meeting meeting--${interview.result} ${isReminderDue(interview, now) ? 'meeting--soon' : ''}">
      <p class="meeting__when">
        <span class="meeting__day">${dayLabel(interview.date, now)}</span>
        <span class="meeting__time">${interview.time}</span>
      </p>
      <div class="meeting__body">
        ${app ? html`
          <h3 class="meeting__title">
            <button type="button" class="link-btn" data-action="open-application" data-id="${app.id}"
              data-focus-key="meeting-open-${key}">${app.company}</button>
            <span class="meeting__position">${app.position}</span>
          </h3>` : ''}
        <p class="meeting__meta">${meta}</p>
        ${placeLink(interview.place)}
        ${interview.notes ? html`<p class="meeting__notes">${interview.notes}</p>` : ''}
      </div>
      <div class="meeting__side">
        <label class="visually-hidden" for="result-${key}">Результат собеседования</label>
        <span class="pill-select result--${interview.result}">
          <select class="pill-select__control" id="result-${key}"
            data-change="result" data-id="${interview.id}" data-focus-key="result-${key}">
            ${RESULTS.map((result) => html`
              <option value="${result.id}" ${result.id === interview.result ? html`selected` : ''}>${result.title}</option>`)}
          </select>
        </span>
        <span class="meeting__actions">
          ${iconButton({ action: 'edit-interview', iconName: 'edit', label: 'Изменить собеседование', data: { id: interview.id }, focusKey: `edit-${key}` })}
          ${iconButton({ action: 'delete-interview', iconName: 'trash', label: 'Удалить собеседование', data: { id: interview.id }, focusKey: `delete-${key}`, extraClass: 'icon-btn--danger' })}
        </span>
      </div>
    </li>`;
}

export function taskItem(task, { now, ctx }) {
  const key = `${ctx}-${task.id}`;
  const overdue = isTaskOverdue(task, now);
  return html`
    <li class="task ${task.done ? 'task--done' : ''} ${overdue ? 'task--overdue' : ''}">
      <input class="task__check" type="checkbox" id="task-${key}" data-change="task-done"
        data-id="${task.id}" data-focus-key="task-${key}" ${task.done ? html`checked` : ''}>
      <label class="task__title" for="task-${key}">${task.title}</label>
      <span class="task__meta">
        ${task.dueDate ? html`<span class="task__due">до ${formatDate(task.dueDate)}</span>` : ''}
        ${overdue ? html`<span class="flag flag--danger">просрочено</span>` : ''}
      </span>
      <span class="task__actions">
        ${iconButton({ action: 'edit-task', iconName: 'edit', label: `Изменить задачу «${task.title}»`, data: { id: task.id }, focusKey: `edit-${key}` })}
        ${iconButton({ action: 'delete-task', iconName: 'trash', label: `Удалить задачу «${task.title}»`, data: { id: task.id }, focusKey: `delete-${key}`, extraClass: 'icon-btn--danger' })}
      </span>
    </li>`;
}
