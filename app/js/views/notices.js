// Полоса уведомлений над разделом: ближайшие собеседования и проблемы с хранилищем.

import { dayLabel, formatCountdown, minutesUntil } from '../dates.js';
import { html } from '../html.js';
import { findById, interviewStart, upcomingReminders } from '../model.js';
import { iconButton } from './parts.js';

const STORAGE_TEXT = {
  unavailable: 'Браузер не даёт сохранять данные (возможно, включён приватный режим или запрещены cookie и данные сайтов). Всё, что вы добавите, пропадёт после закрытия страницы.',
  corrupted: 'Сохранённые данные оказались повреждены, поэтому трекер открыт с пустыми списками. Старые данные не удалены — они отложены в хранилище браузера отдельно.',
  locked: 'Сохранённые данные повреждены, а отложить их копию не получилось. Чтобы их не затереть, изменения сейчас не сохраняются.',
};

function reminders(state, now) {
  const soon = upcomingReminders(state.interviews, now);
  if (soon.length === 0) return '';
  return html`
    <section class="notice notice--reminder" aria-label="Ближайшие собеседования">
      <div class="notice__body">
        <p class="label notice__title"><span class="live-dot" aria-hidden="true"></span>${soon.length === 1 ? 'Скоро собеседование' : 'Скоро собеседования'}</p>
        <ul class="notice__list">
          ${soon.map((item) => {
            const app = findById(state.applications, item.applicationId);
            return html`
              <li>
                <button type="button" class="link-btn" data-action="open-application" data-id="${app.id}"
                  data-focus-key="reminder-${item.id}">${app.company}</button>
                — ${dayLabel(item.date, now)} в ${item.time}
                <span class="muted">(через ${formatCountdown(minutesUntil(interviewStart(item), now))})</span>
              </li>`;
          })}
        </ul>
      </div>
    </section>`;
}

function storageNotice(problem) {
  if (!problem || problem.dismissed) return '';
  return html`
    <section class="notice notice--warning" role="alert">
      <div class="notice__body">
        <p class="label notice__title">Проблема с сохранением</p>
        <p>${STORAGE_TEXT[problem.kind]}</p>
        ${problem.message ? html`<p class="muted">Причина: ${problem.message}</p>` : ''}
        ${problem.backupKey ? html`<p class="muted">Ключ копии: <code>${problem.backupKey}</code></p>` : ''}
      </div>
      ${iconButton({ action: 'dismiss-storage', iconName: 'close', label: 'Скрыть сообщение' })}
    </section>`;
}

function saveError(message) {
  if (!message) return '';
  return html`
    <section class="notice notice--error" role="alert">
      <div class="notice__body">
        <p class="label notice__title">Изменения не сохранены</p>
        <p>${message}</p>
      </div>
    </section>`;
}

export function renderNotices(state, ui, now) {
  return html`${storageNotice(ui.storageProblem)}${saveError(ui.saveError)}${reminders(state, now)}`;
}
