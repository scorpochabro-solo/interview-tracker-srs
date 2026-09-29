import { renderApplication } from './application.js';
import {
  applicationForm, contactForm, interviewForm, taskForm,
} from './forms.js';

const KINDS = {
  application: renderApplication,
  'application-form': applicationForm,
  'interview-form': interviewForm,
  'task-form': taskForm,
  'contact-form': contactForm,
};

export const isFormModal = (modal) => Boolean(modal) && modal.kind.endsWith('-form');

// Ключ «что сейчас открыто». Если он меняется — фокус переносим в окно заново.
export function modalKey(modal) {
  if (!modal) return null;
  return `${modal.kind}:${modal.id ?? modal.applicationId ?? 'new'}`;
}

// Возвращает разметку окна или null, если запись уже удалена и показывать нечего.
export function renderModal(state, modal, now) {
  const render = KINDS[modal.kind];
  if (!render) throw new Error(`Неизвестное окно: ${modal.kind}`);
  return render(state, modal, now);
}
