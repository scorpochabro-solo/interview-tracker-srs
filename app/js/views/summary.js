import { STATUSES } from '../constants.js';
import { formatPercent } from '../format.js';
import { html } from '../html.js';
import { summarize } from '../stats.js';
import { icon, viewHead } from './parts.js';

function stat(value, label, modifier = '') {
  return html`
    <div class="stat ${modifier}">
      <dt class="stat__label">${label}</dt>
      <dd class="stat__value">${value}</dd>
    </div>`;
}

function funnel(summary) {
  const max = Math.max(1, ...Object.values(summary.byStatus));
  return html`
    <section class="panel" aria-labelledby="funnel-title">
      <h2 class="panel__title" id="funnel-title">По статусам</h2>
      <ul class="bars">
        ${STATUSES.map((status) => {
          const count = summary.byStatus[status.id];
          return html`
            <li class="bars__row bars__row--${status.id}">
              <span class="bars__label">${status.title}</span>
              <span class="bars__track"><span class="bars__fill" style="--share: ${Math.round((count / max) * 100)}%"></span></span>
              <span class="bars__value">${count}</span>
            </li>`;
        })}
      </ul>
    </section>`;
}

function backup() {
  return html`
    <section class="panel panel--backup" aria-labelledby="backup-title">
      <h2 class="panel__title" id="backup-title">Резервная копия</h2>
      <p>Данные хранятся только в этом браузере. Чтобы не потерять их при очистке браузера
        или перенести на другой компьютер, скачайте копию в файл.</p>
      <div class="panel__actions">
        <button type="button" class="btn btn--primary" data-action="export" data-focus-key="export">
          ${icon('download')}<span>Скачать копию</span></button>
        <button type="button" class="btn" data-action="import" data-focus-key="import">
          ${icon('upload')}<span>Загрузить из файла</span></button>
      </div>
      <p class="muted">При загрузке текущие данные заменяются данными из файла.</p>
    </section>`;
}

export function renderSummary(state, ui, now) {
  const summary = summarize(state, now);
  return html`
    <section class="view" aria-labelledby="view-title">
      ${viewHead({ index: 5, title: 'Сводка', lead: 'Как идёт поиск работы' })}
      <dl class="stats">
        ${stat(summary.total, 'Всего откликов', 'stat--total')}
        ${stat(formatPercent(summary.interviewRate), 'Доходят до собеседования')}
        ${stat(formatPercent(summary.offerRate), 'Заканчиваются оффером')}
        ${stat(summary.upcomingInterviews, 'Предстоящие собеседования')}
        ${stat(summary.overdueTasks, 'Просроченные задачи', summary.overdueTasks ? 'stat--alert' : '')}
      </dl>
      <div class="panels">
        ${funnel(summary)}
        ${backup()}
      </div>
    </section>`;
}
