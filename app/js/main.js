import { STATUSES, titleOf } from './constants.js';
import { countLabel } from './format.js';
import { setHtml } from './html.js';
import * as model from './model.js';
import {
  STORAGE_KEY, backupFileName, loadState, parseBackup, saveState, serializeBackup,
} from './store.js';
import {
  hasErrors, validateApplication, validateContact, validateInterview, validateTask,
} from './validate.js';
import { renderBoard } from './views/board.js';
import { renderContacts } from './views/contacts.js';
import { renderInterviews } from './views/interviews.js';
import { isFormModal, modalKey, renderModal } from './views/modal.js';
import { renderNav, tabFromHash } from './views/nav.js';
import { renderNotices } from './views/notices.js';
import { renderSummary } from './views/summary.js';
import { renderTasks } from './views/tasks.js';

const VIEWS = {
  board: renderBoard,
  interviews: renderInterviews,
  tasks: renderTasks,
  contacts: renderContacts,
  summary: renderSummary,
};

const CLOCK_MS = 60_000;
const TOAST_MS = 3500;
const ERROR_TOAST_MS = 8000;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const els = {
  nav: document.getElementById('nav'),
  notices: document.getElementById('notices'),
  main: document.getElementById('main'),
  modal: document.getElementById('modal'),
  modalContent: document.getElementById('modal-content'),
  confirm: document.getElementById('confirm'),
  confirmText: document.getElementById('confirm-text'),
  confirmOk: document.getElementById('confirm-ok'),
  toast: document.getElementById('toast'),
  importFile: document.getElementById('import-file'),
};

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // доступ к localStorage запрещён настройками браузера
  }
}

const storage = getStorage();
const loaded = storage ? loadState(storage) : { state: model.emptyState(), problem: 'unavailable' };
const canSave = loaded.problem === null || loaded.problem === 'corrupted';

let state = loaded.state;
let ui = {
  tab: tabFromHash(window.location.hash),
  search: '',
  contactSearch: '',
  taskFilter: 'active',
  modal: null,
  storageProblem: loaded.problem
    ? { kind: loaded.problem, message: loaded.message, backupKey: loaded.backupKey, dismissed: false }
    : null,
  saveError: null,
};

let shownModal = null; // modalKey окна, которое сейчас на экране
let returnFocusKey = null; // куда вернуть фокус после закрытия окна
let currentDay = new Date().toDateString();
let toastTimer = null;

function setUi(patch) {
  ui = { ...ui, ...patch };
}

// ---------- Отрисовка ----------

function captureView() {
  const active = document.activeElement;
  return {
    active,
    focusKey: active?.dataset?.focusKey ?? null,
    selection: typeof active?.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null,
    scroll: [...document.querySelectorAll('[data-scroll-key]')]
      .map((el) => ({ key: el.dataset.scrollKey, left: el.scrollLeft, top: el.scrollTop })),
  };
}

function findByKey(attr, key) {
  return key ? document.querySelector(`[${attr}="${CSS.escape(key)}"]`) : null;
}

function focusByKey(key, selection = null) {
  const el = findByKey('data-focus-key', key);
  if (!el || el.disabled) return false;
  el.focus();
  if (selection && typeof el.selectionStart === 'number') el.setSelectionRange(...selection);
  return true;
}

function restoreScroll(snapshot, keep = () => true) {
  snapshot.scroll.filter(({ key }) => keep(key)).forEach(({ key, left, top }) => {
    const el = findByKey('data-scroll-key', key);
    if (el) {
      el.scrollLeft = left;
      el.scrollTop = top;
    }
  });
}

function focusModal() {
  const target = els.modal.querySelector('[autofocus]') ?? els.modal.querySelector('.sheet__title');
  target?.focus();
}

// Если форма открыта, сохраняем введённое в draft, чтобы перерисовка его не стёрла.
function syncDraft() {
  if (!isFormModal(ui.modal) || modalKey(ui.modal) !== shownModal) return;
  const form = els.modalContent.querySelector('form[data-form]');
  if (form) setUi({ modal: { ...ui.modal, draft: Object.fromEntries(new FormData(form)) } });
}

// Рисует окно и сообщает, что с ним произошло: opened / changed / same / closed / none.
function renderModalLayer(now) {
  const content = ui.modal ? renderModal(state, ui.modal, now) : null;
  if (!content) {
    if (ui.modal) setUi({ modal: null }); // запись удалили — показывать нечего
    const wasShown = shownModal !== null;
    shownModal = null;
    if (els.modal.open) els.modal.close();
    return wasShown ? 'closed' : 'none';
  }
  setHtml(els.modalContent, content);
  if (!els.modal.open) els.modal.showModal();
  const key = modalKey(ui.modal);
  let change = 'changed';
  if (shownModal === null) change = 'opened';
  else if (shownModal === key) change = 'same';
  shownModal = key;
  return change;
}

function renderChrome(now) {
  setHtml(els.nav, renderNav(state, ui, now));
  setHtml(els.notices, renderNotices(state, ui, now));
}

function render() {
  const now = new Date();
  syncDraft();
  const snapshot = captureView();

  renderChrome(now);
  setHtml(els.main, VIEWS[ui.tab](state, ui, now));
  const modalChange = renderModalLayer(now);

  if (modalChange === 'opened' || modalChange === 'changed') {
    restoreScroll(snapshot, (key) => key !== 'sheet');
    focusModal();
  } else if (modalChange === 'closed') {
    restoreScroll(snapshot, (key) => key !== 'sheet');
    if (!focusByKey(returnFocusKey)) els.main.focus();
  } else {
    restoreScroll(snapshot);
    if (!snapshot.active?.isConnected && !focusByKey(snapshot.focusKey, snapshot.selection) && els.modal.open) {
      focusModal();
    }
  }
}

// ---------- Изменение данных ----------

function persist() {
  if (!canSave) return;
  const result = saveState(storage, state);
  setUi({ saveError: result.ok ? null : result.message });
}

function showToast(message, type = 'info') {
  // Окно <dialog> лежит поверх страницы, поэтому уведомление кладём внутрь открытого окна.
  const host = [els.confirm, els.modal].find((dialog) => dialog.open) ?? document.body;
  if (els.toast.parentElement !== host) host.append(els.toast);
  els.toast.textContent = message;
  els.toast.dataset.type = type;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, type === 'error' ? ERROR_TOAST_MS : TOAST_MS);
}

// change получает текущее состояние и возвращает новое.
// modal: undefined — окно не трогаем, null — закрыть, объект — открыть такое окно.
function apply(change, { message, modal } = {}) {
  let next;
  try {
    next = change(state);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Не получилось выполнить действие', 'error');
    return false;
  }
  state = next;
  persist();
  if (modal !== undefined) setUi({ modal });
  render();
  if (message && !ui.saveError) showToast(message);
  return true;
}

function ask(question, confirmLabel = 'Удалить') {
  if (els.confirm.open) return Promise.resolve(false);
  els.confirmText.textContent = question;
  els.confirmOk.textContent = confirmLabel;
  els.confirm.returnValue = '';
  els.confirm.showModal();
  return new Promise((resolve) => {
    els.confirm.addEventListener('close', () => resolve(els.confirm.returnValue === 'yes'), { once: true });
  });
}

async function confirmAndApply(question, change, options) {
  if (await ask(question)) apply(change, options);
}

// ---------- Окна ----------

function openModal(modal) {
  if (!ui.modal) returnFocusKey = document.activeElement?.dataset?.focusKey ?? null;
  setUi({ modal });
  render();
}

function closeModal() {
  setUi({ modal: null });
  render();
}

function goBack() {
  setUi({ modal: ui.modal?.back ?? null });
  render();
}

// ---------- Резервная копия ----------

function exportBackup() {
  const url = URL.createObjectURL(new Blob([serializeBackup(state)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName();
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Копия данных скачана');
}

async function importBackup(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    showToast('Файл слишком большой для копии трекера', 'error');
    return;
  }
  let text;
  try {
    text = await file.text();
  } catch {
    showToast('Не удалось прочитать файл', 'error');
    return;
  }
  const result = parseBackup(text);
  if (!result.ok) {
    showToast(`Файл не загружен: ${result.message}`, 'error');
    return;
  }
  const count = countLabel(result.state.applications.length, ['отклик', 'отклика', 'откликов']);
  const question = `Загрузить копию из файла «${file.name}»? В ней ${count}. Всё, что сейчас есть в трекере, будет заменено.`;
  if (await ask(question, 'Заменить')) {
    apply(() => result.state, { message: 'Данные загружены из файла', modal: null });
  }
}

// ---------- Действия ----------

function nameOf(list, id, describe) {
  const item = model.findById(list, id);
  return item ? describe(item) : '';
}

const CLICK = {
  'new-application': () => openModal({ kind: 'application-form' }),
  'open-application': ({ id }) => openModal({ kind: 'application', id }),
  'edit-application': ({ id }) => openModal({ kind: 'application-form', id, back: ui.modal }),
  'delete-application': ({ id }) => confirmAndApply(
    `Удалить отклик «${nameOf(state.applications, id, (a) => `${a.company} — ${a.position}`)}»? Его собеседования и задачи по подготовке тоже удалятся.`,
    (s) => model.removeApplication(s, id),
    { message: 'Отклик удалён', modal: null },
  ),
  'new-interview': ({ applicationId }) => openModal({ kind: 'interview-form', applicationId, back: ui.modal }),
  'edit-interview': ({ id }) => openModal({ kind: 'interview-form', id, back: ui.modal }),
  'delete-interview': ({ id }) => confirmAndApply(
    'Удалить это собеседование?',
    (s) => model.removeInterview(s, id),
    { message: 'Собеседование удалено' },
  ),
  'new-task': ({ applicationId }) => openModal({ kind: 'task-form', applicationId, back: ui.modal }),
  'edit-task': ({ id }) => openModal({ kind: 'task-form', id, back: ui.modal }),
  'delete-task': ({ id }) => confirmAndApply(
    `Удалить задачу «${nameOf(state.tasks, id, (t) => t.title)}»?`,
    (s) => model.removeTask(s, id),
    { message: 'Задача удалена' },
  ),
  'new-contact': () => openModal({ kind: 'contact-form', back: ui.modal }),
  'edit-contact': ({ id }) => openModal({ kind: 'contact-form', id, back: ui.modal }),
  'delete-contact': ({ id }) => confirmAndApply(
    `Удалить контакт «${nameOf(state.contacts, id, (c) => c.name)}»? Отклики останутся, у них просто не будет контакта.`,
    (s) => model.removeContact(s, id),
    { message: 'Контакт удалён' },
  ),
  'close-modal': closeModal,
  'modal-back': goBack,
  export: exportBackup,
  import: () => els.importFile.click(),
  'dismiss-storage': () => {
    setUi({ storageProblem: { ...ui.storageProblem, dismissed: true } });
    render();
  },
};

const CHANGE = {
  status: (el) => apply(
    (s) => model.setStatus(s, el.dataset.id, el.value),
    { message: `Статус: ${titleOf(STATUSES, el.value)}` },
  ),
  result: (el) => apply((s) => model.setInterviewResult(s, el.dataset.id, el.value)),
  'task-done': (el) => apply((s) => model.setTaskDone(s, el.dataset.id, el.checked)),
  'task-filter': (el) => {
    setUi({ taskFilter: el.value });
    render();
  },
};

const INPUT = {
  search: (el) => setUi({ search: el.value }),
  'contact-search': (el) => setUi({ contactSearch: el.value }),
};

const FORMS = {
  application: {
    validate: validateApplication,
    save: (fields, id) => (id
      ? { change: (s) => model.updateApplication(s, id, fields), message: 'Отклик сохранён' }
      : { change: (s) => model.addApplication(s, fields), message: 'Отклик добавлен' }),
  },
  interview: {
    validate: validateInterview,
    save: (fields, id) => (id
      ? { change: (s) => model.updateInterview(s, id, fields), message: 'Собеседование сохранено' }
      : { change: (s) => model.addInterview(s, fields), message: 'Собеседование добавлено' }),
  },
  task: {
    validate: validateTask,
    save: (fields, id) => (id
      ? { change: (s) => model.updateTask(s, id, fields), message: 'Задача сохранена' }
      : { change: (s) => model.addTask(s, fields), message: 'Задача добавлена' }),
  },
  contact: {
    validate: validateContact,
    save: (fields, id) => (id
      ? { change: (s) => model.updateContact(s, id, fields), message: 'Контакт сохранён' }
      : { change: (s) => model.addContact(s, fields), message: 'Контакт добавлен' }),
  },
};

function submitForm(form) {
  const config = FORMS[form.dataset.form];
  const fields = Object.fromEntries(new FormData(form));
  const errors = config.validate(fields);
  if (hasErrors(errors)) {
    setUi({ modal: { ...ui.modal, draft: fields, errors } });
    render();
    els.modal.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const { change, message } = config.save(fields, form.dataset.id);
  apply(change, { message, modal: ui.modal?.back ?? null });
}

function submitQuickTask(form) {
  const fields = { title: form.elements.title.value, applicationId: form.dataset.applicationId };
  const errors = validateTask(fields);
  if (hasErrors(errors)) {
    showToast(errors.title, 'error');
    form.elements.title.focus();
    return;
  }
  apply((s) => model.addTask(s, fields), { message: 'Задача добавлена' });
}

// ---------- События ----------

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const handler = CLICK[target.dataset.action];
  if (!handler) return;
  event.preventDefault();
  handler(target.dataset);
});

document.addEventListener('change', (event) => {
  const handler = CHANGE[event.target.dataset?.change];
  if (handler) handler(event.target);
});

document.addEventListener('input', (event) => {
  const handler = INPUT[event.target.dataset?.input];
  if (!handler) return;
  handler(event.target);
  render();
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === 'quick-task') submitQuickTask(form);
  else submitForm(form);
});

// Esc или закрытие окна средствами браузера.
els.modal.addEventListener('close', () => {
  if (!ui.modal) return;
  setUi({ modal: null });
  render();
});

// Клик по затемнению вокруг карточки закрывает её. Формы так не закрываем, чтобы не потерять ввод.
els.modal.addEventListener('click', (event) => {
  if (event.target === els.modal && !isFormModal(ui.modal)) closeModal();
});

els.importFile.addEventListener('change', () => {
  const [file] = els.importFile.files;
  els.importFile.value = '';
  importBackup(file);
});

window.addEventListener('hashchange', () => {
  setUi({ tab: tabFromHash(window.location.hash) });
  render();
});

// Данные поменяли в другой вкладке — подхватываем их, чтобы не затереть.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || event.newValue === null || !canSave) return;
  const result = parseBackup(event.newValue);
  if (!result.ok) return;
  state = result.state;
  render();
});

// Раз в минуту обновляем напоминания и счётчики, а в полночь — всё целиком.
setInterval(() => {
  const today = new Date().toDateString();
  if (today !== currentDay) {
    currentDay = today;
    render();
    return;
  }
  const snapshot = captureView();
  renderChrome(new Date());
  if (!snapshot.active?.isConnected) focusByKey(snapshot.focusKey);
}, CLOCK_MS);

render();
