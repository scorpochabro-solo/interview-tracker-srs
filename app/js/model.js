// Все функции здесь чистые: принимают состояние и возвращают новое,
// старое не меняется. Так проще тестировать и отменять ошибки.

import {
  DATA_VERSION, REMINDER_HOURS, RESULTS, STALE_CONTACT_DAYS, STATUSES, hasId,
} from './constants.js';
import { daysBetween, minutesUntil, toLocalDate, todayISO } from './dates.js';
import { normalizeSearch } from './format.js';
import {
  hasErrors, validateApplication, validateContact, validateInterview, validateTask,
} from './validate.js';

export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors)[0]);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export function emptyState() {
  return {
    version: DATA_VERSION,
    applications: [],
    interviews: [],
    tasks: [],
    contacts: [],
  };
}

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function findById(list, id) {
  return list.find((item) => item.id === id) ?? null;
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const optional = (value) => text(value) || null;

function assertValid(errors) {
  if (hasErrors(errors)) throw new ValidationError(errors);
}

function ensure(item, message) {
  if (!item) throw new Error(message);
  return item;
}

function replaceById(list, id, update) {
  ensure(findById(list, id), 'Запись не найдена, возможно она уже удалена');
  return list.map((item) => (item.id === id ? update(item) : item));
}

// ---------- Отклики ----------

export function applicationFields(fields) {
  return {
    company: text(fields.company),
    position: text(fields.position),
    appliedAt: text(fields.appliedAt),
    url: text(fields.url),
    source: text(fields.source),
    salary: text(fields.salary),
    contactId: optional(fields.contactId),
    notes: text(fields.notes),
  };
}

function checkApplication(state, data) {
  assertValid(validateApplication(data));
  if (data.contactId) ensure(findById(state.contacts, data.contactId), 'Контакт не найден');
}

export function addApplication(state, fields, now = new Date(), id = createId()) {
  const data = applicationFields(fields);
  checkApplication(state, data);
  const at = now.toISOString();
  const application = {
    id,
    ...data,
    status: 'applied',
    history: [{ status: 'applied', at }],
    createdAt: at,
    updatedAt: at,
  };
  return { ...state, applications: [...state.applications, application] };
}

export function updateApplication(state, id, fields, now = new Date()) {
  const data = applicationFields(fields);
  checkApplication(state, data);
  return {
    ...state,
    applications: replaceById(state.applications, id, (app) => ({
      ...app,
      ...data,
      updatedAt: now.toISOString(),
    })),
  };
}

export function setStatus(state, id, status, now = new Date()) {
  if (!hasId(STATUSES, status)) throw new Error(`Неизвестный статус: ${status}`);
  const app = ensure(findById(state.applications, id), 'Отклик не найден');
  if (app.status === status) return state;
  const at = now.toISOString();
  return {
    ...state,
    applications: replaceById(state.applications, id, (item) => ({
      ...item,
      status,
      history: [...item.history, { status, at }],
      updatedAt: at,
    })),
  };
}

export function removeApplication(state, id) {
  return {
    ...state,
    applications: state.applications.filter((app) => app.id !== id),
    interviews: state.interviews.filter((interview) => interview.applicationId !== id),
    tasks: state.tasks.filter((task) => task.applicationId !== id),
  };
}

export function searchApplications(applications, query) {
  const needle = normalizeSearch(query);
  if (!needle) return applications;
  return applications.filter((app) => normalizeSearch(`${app.company} ${app.position}`).includes(needle));
}

export function sortApplications(applications) {
  return [...applications].sort((a, b) => (
    b.appliedAt.localeCompare(a.appliedAt) || b.createdAt.localeCompare(a.createdAt)
  ));
}

export function groupByStatus(applications) {
  return Object.fromEntries(
    STATUSES.map((status) => [status.id, applications.filter((app) => app.status === status.id)]),
  );
}

// ---------- Собеседования ----------

// Первое собеседование двигает отклик дальше по воронке только из этих статусов.
const AUTO_INTERVIEW_FROM = ['applied', 'test'];

export function interviewFields(fields) {
  return {
    applicationId: text(fields.applicationId),
    date: text(fields.date),
    time: text(fields.time),
    stage: text(fields.stage),
    format: text(fields.format),
    place: text(fields.place),
    interviewer: text(fields.interviewer),
    result: text(fields.result) || 'pending',
    notes: text(fields.notes),
  };
}

export function addInterview(state, fields, now = new Date(), id = createId()) {
  const data = interviewFields(fields);
  assertValid(validateInterview(data));
  const app = ensure(findById(state.applications, data.applicationId), 'Отклик не найден');
  const isFirst = !state.interviews.some((interview) => interview.applicationId === app.id);
  const next = {
    ...state,
    interviews: [...state.interviews, { id, ...data, createdAt: now.toISOString() }],
  };
  return isFirst && AUTO_INTERVIEW_FROM.includes(app.status)
    ? setStatus(next, app.id, 'interview', now)
    : next;
}

export function updateInterview(state, id, fields) {
  const current = ensure(findById(state.interviews, id), 'Собеседование не найдено');
  // отклик у собеседования не меняется, даже если его подсунули в полях
  const data = { ...interviewFields(fields), applicationId: current.applicationId };
  assertValid(validateInterview(data));
  return {
    ...state,
    interviews: replaceById(state.interviews, id, (interview) => ({ ...interview, ...data })),
  };
}

export function setInterviewResult(state, id, result) {
  if (!hasId(RESULTS, result)) throw new Error(`Неизвестный результат: ${result}`);
  return {
    ...state,
    interviews: replaceById(state.interviews, id, (interview) => ({ ...interview, result })),
  };
}

export function removeInterview(state, id) {
  return { ...state, interviews: state.interviews.filter((interview) => interview.id !== id) };
}

export function interviewStart(interview) {
  return toLocalDate(interview.date, interview.time);
}

const byStart = (a, b) => interviewStart(a) - interviewStart(b);

export function groupInterviews(interviews, now = new Date()) {
  const today = todayISO(now);
  return {
    today: interviews.filter((item) => item.date === today).sort(byStart),
    upcoming: interviews.filter((item) => item.date > today).sort(byStart),
    past: interviews.filter((item) => item.date < today).sort((a, b) => byStart(b, a)),
  };
}

export function interviewsOf(interviews, applicationId) {
  return interviews.filter((item) => item.applicationId === applicationId).sort(byStart);
}

export function nextInterview(interviews, applicationId, now = new Date()) {
  return interviewsOf(interviews, applicationId).find((item) => interviewStart(item) >= now) ?? null;
}

// До собеседования осталось меньше REMINDER_HOURS часов, и оно ещё не началось.
export function isReminderDue(interview, now = new Date()) {
  const minutes = minutesUntil(interviewStart(interview), now);
  return minutes >= 0 && minutes < REMINDER_HOURS * 60;
}

export function upcomingReminders(interviews, now = new Date()) {
  return interviews.filter((item) => isReminderDue(item, now)).sort(byStart);
}

// ---------- Задачи по подготовке ----------

export function taskFields(fields) {
  return {
    title: text(fields.title),
    dueDate: optional(fields.dueDate),
    applicationId: optional(fields.applicationId),
  };
}

function checkTask(state, data) {
  assertValid(validateTask(data));
  if (data.applicationId) ensure(findById(state.applications, data.applicationId), 'Отклик не найден');
}

export function addTask(state, fields, now = new Date(), id = createId()) {
  const data = taskFields(fields);
  checkTask(state, data);
  const task = { id, ...data, done: false, createdAt: now.toISOString() };
  return { ...state, tasks: [...state.tasks, task] };
}

export function updateTask(state, id, fields) {
  const data = taskFields(fields);
  checkTask(state, data);
  return { ...state, tasks: replaceById(state.tasks, id, (task) => ({ ...task, ...data })) };
}

export function setTaskDone(state, id, done) {
  return { ...state, tasks: replaceById(state.tasks, id, (task) => ({ ...task, done: Boolean(done) })) };
}

export function removeTask(state, id) {
  return { ...state, tasks: state.tasks.filter((task) => task.id !== id) };
}

export function isTaskOverdue(task, now = new Date()) {
  return !task.done && task.dueDate !== null && task.dueDate < todayISO(now);
}

const TASK_FILTERS = {
  all: () => true,
  active: (task) => !task.done,
  done: (task) => task.done,
};

export function filterTasks(tasks, filter) {
  return tasks.filter(TASK_FILTERS[filter] ?? TASK_FILTERS.all);
}

// Сначала невыполненные, внутри — по сроку (без срока в конце).
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => (
    Number(a.done) - Number(b.done)
    || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    || a.createdAt.localeCompare(b.createdAt)
  ));
}

export function tasksOf(tasks, applicationId) {
  return tasks.filter((task) => task.applicationId === applicationId);
}

export function taskProgress(tasks) {
  return { done: tasks.filter((task) => task.done).length, total: tasks.length };
}

// ---------- Контакты HR ----------

export function contactFields(fields) {
  return {
    name: text(fields.name),
    company: text(fields.company),
    role: text(fields.role),
    phone: text(fields.phone),
    email: text(fields.email),
    telegram: text(fields.telegram).replace(/^@/, ''),
    lastContactAt: optional(fields.lastContactAt),
    notes: text(fields.notes),
  };
}

export function addContact(state, fields, now = new Date(), id = createId()) {
  const data = contactFields(fields);
  assertValid(validateContact(data));
  return {
    ...state,
    contacts: [...state.contacts, { id, ...data, createdAt: now.toISOString() }],
  };
}

export function updateContact(state, id, fields) {
  const data = contactFields(fields);
  assertValid(validateContact(data));
  return { ...state, contacts: replaceById(state.contacts, id, (contact) => ({ ...contact, ...data })) };
}

export function removeContact(state, id) {
  return {
    ...state,
    contacts: state.contacts.filter((contact) => contact.id !== id),
    applications: state.applications.map((app) => (
      app.contactId === id ? { ...app, contactId: null } : app
    )),
  };
}

export function searchContacts(contacts, query) {
  const needle = normalizeSearch(query);
  const found = needle
    ? contacts.filter((c) => normalizeSearch(`${c.name} ${c.company}`).includes(needle))
    : contacts;
  return [...found].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function applicationsOfContact(applications, contactId) {
  return applications.filter((app) => app.contactId === contactId);
}

export function isContactStale(contact, now = new Date()) {
  return contact.lastContactAt !== null
    && daysBetween(contact.lastContactAt, todayISO(now)) > STALE_CONTACT_DAYS;
}
