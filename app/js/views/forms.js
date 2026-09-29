import {
  FORMATS, MAX_NOTES, MAX_PLACE, MAX_SHORT, RESULTS, SOURCES, STAGES,
} from '../constants.js';
import { todayISO } from '../dates.js';
import { html } from '../html.js';
import { findById, searchContacts, sortApplications } from '../model.js';
import { input, select, textarea } from './fields.js';
import { icon, iconButton } from './parts.js';

export function sheetHead({ eyebrow, title, subtitle, hasBack }) {
  return html`
    <header class="sheet__head">
      ${hasBack ? iconButton({ action: 'modal-back', iconName: 'back', label: 'Назад', extraClass: 'sheet__back' }) : ''}
      <div class="sheet__heading">
        ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
        <h2 class="sheet__title" id="modal-title" tabindex="-1">${title}</h2>
        ${subtitle ? html`<p class="sheet__subtitle">${subtitle}</p>` : ''}
      </div>
      ${iconButton({ action: 'close-modal', iconName: 'close', label: 'Закрыть', extraClass: 'sheet__close' })}
    </header>`;
}

function formSheet({ form, id, head, fields, submitLabel, hasBack }) {
  return html`
    ${head}
    <form class="sheet__form" data-form="${form}" ${id ? html`data-id="${id}"` : ''} novalidate>
      <div class="sheet__body" data-scroll-key="sheet">
        <div class="form-grid">${fields}</div>
        <p class="form-note"><span aria-hidden="true">*</span> — обязательные поля</p>
      </div>
      <footer class="sheet__foot">
        <button type="button" class="btn btn--ghost" data-action="${hasBack ? 'modal-back' : 'close-modal'}">Отмена</button>
        <button type="submit" class="btn btn--primary">${submitLabel}</button>
      </footer>
    </form>`;
}

// Значения для формы: сначала то, что пользователь уже ввёл (draft), потом сохранённая запись.
const valuesFor = (modal, record, defaults) => ({ ...defaults, ...(record ?? {}), ...(modal.draft ?? {}) });

const applicationOptions = (state) => sortApplications(state.applications)
  .map((app) => ({ id: app.id, title: `${app.company} — ${app.position}` }));

export function applicationForm(state, modal, now) {
  const record = modal.id ? findById(state.applications, modal.id) : null;
  if (modal.id && !record) return null;
  const v = valuesFor(modal, record, { appliedAt: todayISO(now), contactId: '' });
  const e = modal.errors ?? {};
  const contacts = searchContacts(state.contacts, '').map((contact) => ({
    id: contact.id,
    title: contact.company ? `${contact.name} (${contact.company})` : contact.name,
  }));

  return formSheet({
    form: 'application',
    id: modal.id,
    hasBack: Boolean(modal.back),
    head: sheetHead({ title: record ? 'Изменить отклик' : 'Новый отклик', hasBack: Boolean(modal.back) }),
    submitLabel: record ? 'Сохранить' : 'Добавить отклик',
    fields: html`
      ${input({ name: 'company', label: 'Компания', value: v.company, required: true, error: e.company, maxlength: MAX_SHORT, autofocus: true })}
      ${input({ name: 'position', label: 'Должность', value: v.position, required: true, error: e.position, maxlength: MAX_SHORT })}
      ${input({ name: 'appliedAt', label: 'Дата отклика', type: 'date', value: v.appliedAt, required: true, error: e.appliedAt })}
      ${select({ name: 'source', label: 'Источник', value: v.source, options: SOURCES, empty: 'Не указан', error: e.source })}
      ${input({ name: 'url', label: 'Ссылка на вакансию', type: 'url', value: v.url, error: e.url, wide: true, placeholder: 'https://hh.ru/vacancy/…', maxlength: MAX_PLACE, inputmode: 'url' })}
      ${input({ name: 'salary', label: 'Зарплатная вилка', value: v.salary, error: e.salary, placeholder: 'например, 150–200 тыс. ₽', maxlength: MAX_SHORT })}
      ${select({
        name: 'contactId', label: 'Контакт HR', value: v.contactId ?? '', options: contacts, empty: 'Без контакта', error: e.contactId,
        hint: contacts.length === 0 ? 'Контакты добавляются в разделе «Контакты HR»' : '',
      })}
      ${textarea({ name: 'notes', label: 'Заметки', value: v.notes, error: e.notes, maxlength: MAX_NOTES })}`,
  });
}

export function interviewForm(state, modal) {
  const record = modal.id ? findById(state.interviews, modal.id) : null;
  if (modal.id && !record) return null;
  const v = valuesFor(modal, record, {
    applicationId: modal.applicationId ?? '', stage: 'hr', format: 'online', result: 'pending',
  });
  const e = modal.errors ?? {};
  const app = findById(state.applications, record?.applicationId ?? modal.applicationId);
  // Отклик выбирается только при создании из раздела «Собеседования».
  const chooseApp = !record && !modal.applicationId;

  return formSheet({
    form: 'interview',
    id: modal.id,
    hasBack: Boolean(modal.back),
    head: sheetHead({
      eyebrow: app ? `${app.company} — ${app.position}` : '',
      title: record ? 'Изменить собеседование' : 'Новое собеседование',
      hasBack: Boolean(modal.back),
    }),
    submitLabel: record ? 'Сохранить' : 'Добавить',
    fields: html`
      ${chooseApp
        ? select({ name: 'applicationId', label: 'Отклик', value: v.applicationId, options: applicationOptions(state), empty: 'Выберите отклик', required: true, error: e.applicationId, wide: true, autofocus: true })
        : html`<input type="hidden" name="applicationId" value="${v.applicationId}">`}
      ${input({ name: 'date', label: 'Дата', type: 'date', value: v.date, required: true, error: e.date, autofocus: !chooseApp })}
      ${input({ name: 'time', label: 'Время', type: 'time', value: v.time, required: true, error: e.time })}
      ${select({ name: 'stage', label: 'Этап', value: v.stage, options: STAGES, required: true, error: e.stage })}
      ${select({ name: 'format', label: 'Формат', value: v.format, options: FORMATS, required: true, error: e.format })}
      ${input({ name: 'place', label: 'Ссылка на звонок или адрес', value: v.place, error: e.place, wide: true, maxlength: MAX_PLACE })}
      ${input({ name: 'interviewer', label: 'Интервьюер', value: v.interviewer, error: e.interviewer, maxlength: MAX_SHORT })}
      ${select({ name: 'result', label: 'Результат', value: v.result, options: RESULTS, error: e.result })}
      ${textarea({ name: 'notes', label: 'Заметки', value: v.notes, error: e.notes, maxlength: MAX_NOTES, hint: 'Вопросы, которые задавали, что стоит подтянуть' })}`,
  });
}

export function taskForm(state, modal) {
  const record = modal.id ? findById(state.tasks, modal.id) : null;
  if (modal.id && !record) return null;
  const v = valuesFor(modal, record, { applicationId: modal.applicationId ?? '' });
  const e = modal.errors ?? {};

  return formSheet({
    form: 'task',
    id: modal.id,
    hasBack: Boolean(modal.back),
    head: sheetHead({ title: record ? 'Изменить задачу' : 'Новая задача', hasBack: Boolean(modal.back) }),
    submitLabel: record ? 'Сохранить' : 'Добавить',
    fields: html`
      ${input({ name: 'title', label: 'Что сделать', value: v.title, required: true, error: e.title, wide: true, maxlength: MAX_SHORT * 2, autofocus: true, placeholder: 'например, повторить SQL-запросы' })}
      ${input({ name: 'dueDate', label: 'Срок', type: 'date', value: v.dueDate ?? '', error: e.dueDate })}
      ${select({ name: 'applicationId', label: 'Отклик', value: v.applicationId ?? '', options: applicationOptions(state), empty: 'Без привязки', error: e.applicationId })}`,
  });
}

export function contactForm(state, modal) {
  const record = modal.id ? findById(state.contacts, modal.id) : null;
  if (modal.id && !record) return null;
  const v = valuesFor(modal, record, {});
  const e = modal.errors ?? {};

  return formSheet({
    form: 'contact',
    id: modal.id,
    hasBack: Boolean(modal.back),
    head: sheetHead({ title: record ? 'Изменить контакт' : 'Новый контакт', hasBack: Boolean(modal.back) }),
    submitLabel: record ? 'Сохранить' : 'Добавить',
    fields: html`
      ${input({ name: 'name', label: 'Имя', value: v.name, required: true, error: e.name, maxlength: MAX_SHORT, autofocus: true, autocomplete: 'off' })}
      ${input({ name: 'company', label: 'Компания', value: v.company, error: e.company, maxlength: MAX_SHORT })}
      ${input({ name: 'role', label: 'Должность', value: v.role, error: e.role, maxlength: MAX_SHORT, placeholder: 'например, IT-рекрутер' })}
      ${input({ name: 'phone', label: 'Телефон', type: 'tel', value: v.phone, error: e.phone, placeholder: '+7 999 123-45-67', inputmode: 'tel' })}
      ${input({ name: 'email', label: 'E-mail', type: 'email', value: v.email, error: e.email, maxlength: MAX_SHORT, inputmode: 'email' })}
      ${input({ name: 'telegram', label: 'Telegram', value: v.telegram ? `@${v.telegram.replace(/^@/, '')}` : '', error: e.telegram, placeholder: '@username' })}
      ${input({ name: 'lastContactAt', label: 'Последнее общение', type: 'date', value: v.lastContactAt ?? '', error: e.lastContactAt })}
      ${textarea({ name: 'notes', label: 'Заметки', value: v.notes, error: e.notes, maxlength: MAX_NOTES })}`,
  });
}

export function addButton(action, label, { data = {}, focusKey, extraClass = '', disabled = false } = {}) {
  const attrs = Object.entries(data).map(([key, value]) => html` data-${key}="${value}"`);
  return html`<button type="button" class="btn ${extraClass}" data-action="${action}"${attrs}
    ${focusKey ? html`data-focus-key="${focusKey}"` : ''} ${disabled ? html`disabled` : ''}>${icon('plus')}<span>${label}</span></button>`;
}
