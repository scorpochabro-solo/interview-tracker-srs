// Поля форм. Проверку делаем сами (novalidate у формы), чтобы сообщения
// были на русском и одинаковыми во всех браузерах.

import { html } from '../html.js';

function labelFor(id, label, required) {
  return html`<label class="field__label" for="${id}">${label}${required
    ? html`<span class="field__req" aria-hidden="true"> *</span>` : ''}</label>`;
}

function describe(id, { error, hint }) {
  const ids = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
  return ids ? html`aria-describedby="${ids}"` : '';
}

function notes(id, { error, hint }) {
  return html`
    ${hint ? html`<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    ${error ? html`<p class="field__error" id="${id}-error">${error}</p>` : ''}`;
}

function wrap(content, { error, wide }) {
  return html`<div class="field ${error ? 'field--error' : ''} ${wide ? 'field--wide' : ''}">${content}</div>`;
}

export function input({
  name, label, value, type = 'text', required = false, error, hint, wide = false,
  autofocus = false, maxlength, placeholder, autocomplete = 'off', inputmode,
}) {
  const id = `f-${name}`;
  return wrap(html`
    ${labelFor(id, label, required)}
    <input class="field__control" id="${id}" name="${name}" type="${type}" value="${value ?? ''}" data-focus-key="${id}"
      autocomplete="${autocomplete}"
      ${required ? html`aria-required="true"` : ''}
      ${maxlength ? html`maxlength="${maxlength}"` : ''}
      ${placeholder ? html`placeholder="${placeholder}"` : ''}
      ${inputmode ? html`inputmode="${inputmode}"` : ''}
      ${autofocus ? html`autofocus` : ''}
      aria-invalid="${error ? 'true' : 'false'}" ${describe(id, { error, hint })}>
    ${notes(id, { error, hint })}`, { error, wide });
}

export function select({
  name, label, value, options, required = false, error, hint, empty, wide = false, autofocus = false,
}) {
  const id = `f-${name}`;
  return wrap(html`
    ${labelFor(id, label, required)}
    <select class="field__control" id="${id}" name="${name}" data-focus-key="${id}"
      ${required ? html`aria-required="true"` : ''}
      ${autofocus ? html`autofocus` : ''}
      aria-invalid="${error ? 'true' : 'false'}" ${describe(id, { error, hint })}>
      ${empty !== undefined ? html`<option value="">${empty}</option>` : ''}
      ${options.map((option) => html`
        <option value="${option.id}" ${option.id === value ? html`selected` : ''}>${option.title}</option>`)}
    </select>
    ${notes(id, { error, hint })}`, { error, wide });
}

export function textarea({ name, label, value, error, hint, maxlength, rows = 3 }) {
  const id = `f-${name}`;
  return wrap(html`
    ${labelFor(id, label, false)}
    <textarea class="field__control" id="${id}" name="${name}" rows="${rows}" data-focus-key="${id}"
      ${maxlength ? html`maxlength="${maxlength}"` : ''}
      aria-invalid="${error ? 'true' : 'false'}" ${describe(id, { error, hint })}>${value ?? ''}</textarea>
    ${notes(id, { error, hint })}`, { error, wide: true });
}
