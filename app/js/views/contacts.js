import { formatDate } from '../dates.js';
import { countLabel } from '../format.js';
import { html } from '../html.js';
import { applicationsOfContact, isContactStale, searchContacts } from '../model.js';
import { addButton } from './forms.js';
import {
  emptyNote, icon, iconButton, statusBadge, viewHead,
} from './parts.js';

function channels(contact) {
  const items = [
    contact.phone && html`<li><a href="tel:${contact.phone.replace(/[^\d+]/g, '')}">${contact.phone}</a></li>`,
    contact.email && html`<li><a href="mailto:${contact.email}">${contact.email}</a></li>`,
    contact.telegram && html`<li><a href="https://t.me/${contact.telegram}" target="_blank" rel="noopener noreferrer">@${contact.telegram}</a></li>`,
  ].filter(Boolean);
  return items.length ? html`<ul class="contact__channels">${items}</ul>` : '';
}

function contactCard(state, contact, now) {
  const apps = applicationsOfContact(state.applications, contact.id);
  const stale = isContactStale(contact, now);
  const role = [contact.role, contact.company].filter(Boolean).join(', ');

  return html`
    <li class="contact ${stale ? 'contact--stale' : ''}">
      <header class="contact__head">
        <div>
          <h2 class="contact__name">${contact.name}</h2>
          ${role ? html`<p class="contact__role">${role}</p>` : ''}
        </div>
        <span class="contact__actions">
          ${iconButton({ action: 'edit-contact', iconName: 'edit', label: `Изменить контакт ${contact.name}`, data: { id: contact.id }, focusKey: `edit-contact-${contact.id}` })}
          ${iconButton({ action: 'delete-contact', iconName: 'trash', label: `Удалить контакт ${contact.name}`, data: { id: contact.id }, focusKey: `delete-contact-${contact.id}`, extraClass: 'icon-btn--danger' })}
        </span>
      </header>
      ${channels(contact)}
      <p class="contact__last">
        ${contact.lastContactAt
          ? html`последнее общение ${formatDate(contact.lastContactAt)}`
          : html`<span class="muted">дата общения не указана</span>`}
        ${stale ? html`<span class="flag flag--warning">давно не связывались</span>` : ''}
      </p>
      ${contact.notes ? html`<p class="contact__notes">${contact.notes}</p>` : ''}
      <div class="contact__apps">
        <h3 class="contact__apps-title">Отклики</h3>
        ${apps.length
          ? html`<ul>${apps.map((app) => html`
              <li>
                <button type="button" class="link-btn" data-action="open-application" data-id="${app.id}"
                  data-focus-key="contact-app-${contact.id}-${app.id}">${app.company} — ${app.position}</button>
                ${statusBadge(app.status)}
              </li>`)}</ul>`
          : html`<p class="muted">Пока не привязан ни к одному отклику</p>`}
      </div>
    </li>`;
}

export function renderContacts(state, ui, now) {
  const total = state.contacts.length;
  const found = searchContacts(state.contacts, ui.contactSearch);

  let content;
  if (total === 0) {
    content = emptyNote('Сохраняйте здесь рекрутеров и HR: как связаться и когда вы общались в последний раз.');
  } else if (found.length === 0) {
    content = emptyNote(`По запросу «${ui.contactSearch.trim()}» никого не нашлось.`);
  } else {
    content = html`<ul class="contacts">${found.map((contact) => contactCard(state, contact, now))}</ul>`;
  }

  return html`
    <section class="view" aria-labelledby="view-title">
      ${viewHead({
        index: 4,
        title: 'Контакты HR',
        lead: total ? countLabel(total, ['контакт', 'контакта', 'контактов']) : 'Пока никого',
        toolbar: html`
          ${total ? html`
            <label class="search">
              ${icon('search')}
              <span class="visually-hidden">Поиск по имени и компании</span>
              <input class="search__input" type="search" value="${ui.contactSearch}" placeholder="Имя или компания"
                data-input="contact-search" data-focus-key="contact-search" autocomplete="off">
            </label>` : ''}
          ${addButton('new-contact', 'Новый контакт', { extraClass: 'btn--primary', focusKey: 'new-contact' })}`,
      })}
      ${content}
    </section>`;
}
