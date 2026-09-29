import { html } from '../html.js';
import {
  filterTasks, sortApplications, sortTasks, taskProgress, tasksOf,
} from '../model.js';
import { addButton } from './forms.js';
import {
  emptyNote, progressBar, taskItem, viewHead,
} from './parts.js';

const FILTERS = [
  { id: 'all', title: 'Все' },
  { id: 'active', title: 'Активные' },
  { id: 'done', title: 'Выполненные' },
];

const EMPTY_TEXT = {
  all: 'Задач пока нет. Добавьте то, что нужно сделать перед собеседованием: повторить темы, изучить компанию, подготовить вопросы.',
  active: 'Все задачи выполнены.',
  done: 'Выполненных задач пока нет.',
};

function filterSwitch(current) {
  return html`
    <fieldset class="segmented">
      <legend class="visually-hidden">Какие задачи показывать</legend>
      ${FILTERS.map((filter) => html`
        <label class="segmented__item">
          <input type="radio" name="task-filter" value="${filter.id}" data-change="task-filter"
            data-focus-key="filter-${filter.id}" ${filter.id === current ? html`checked` : ''}>
          <span>${filter.title}</span>
        </label>`)}
    </fieldset>`;
}

function group(title, tasks, { now, key, progress }) {
  return html`
    <section class="group" aria-labelledby="tasks-${key}">
      <h2 class="group__title group__title--small" id="tasks-${key}">
        ${title}
        ${progress ? html`<span class="group__count">${progress.done}/${progress.total}</span>` : ''}
      </h2>
      <ul class="tasks">${sortTasks(tasks).map((task) => taskItem(task, { now, ctx: 'list' }))}</ul>
    </section>`;
}

export function renderTasks(state, ui, now) {
  const all = taskProgress(state.tasks);
  const visible = filterTasks(state.tasks, ui.taskFilter);

  const byApp = sortApplications(state.applications)
    .map((app) => ({ app, tasks: tasksOf(visible, app.id) }))
    .filter(({ tasks }) => tasks.length > 0);
  const general = tasksOf(visible, null);

  const content = visible.length === 0
    ? emptyNote(EMPTY_TEXT[ui.taskFilter] ?? EMPTY_TEXT.all)
    : html`
      ${byApp.map(({ app, tasks }) => group(`${app.company} — ${app.position}`, tasks, {
        now, key: app.id, progress: taskProgress(tasksOf(state.tasks, app.id)),
      }))}
      ${general.length ? group('Без привязки к отклику', general, { now, key: 'general' }) : ''}`;

  return html`
    <section class="view" aria-labelledby="view-title">
      ${viewHead({
        index: 3,
        title: 'Подготовка',
        lead: `Выполнено ${all.done} из ${all.total}`,
        extra: all.total ? progressBar(all, 'Вся подготовка') : '',
        toolbar: html`
          ${filterSwitch(ui.taskFilter)}
          ${addButton('new-task', 'Новая задача', { extraClass: 'btn--primary', focusKey: 'new-task' })}`,
      })}
      ${content}
    </section>`;
}
