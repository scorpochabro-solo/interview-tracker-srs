PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 120)
) STRICT;

CREATE TABLE contacts (
    id INTEGER PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
    role TEXT,
    phone TEXT,
    email TEXT,
    telegram TEXT,
    last_contact_on TEXT CHECK (
        last_contact_on IS NULL OR date(last_contact_on, '+0 days') IS last_contact_on
    ),
    notes TEXT
) STRICT;

CREATE TABLE applications (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    position TEXT NOT NULL CHECK (length(trim(position)) BETWEEN 1 AND 120),
    applied_on TEXT NOT NULL CHECK (date(applied_on, '+0 days') IS applied_on),
    vacancy_url TEXT,
    source TEXT CHECK (source IN ('hh', 'habr', 'superjob', 'telegram', 'referral', 'site', 'other')),
    salary_expectation TEXT,
    notes TEXT
) STRICT;

CREATE TABLE application_statuses (
    code TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE
) STRICT;

INSERT INTO application_statuses (code, title) VALUES
    ('applied', 'Отклик отправлен'),
    ('test', 'Тестовое задание'),
    ('interview', 'Собеседование'),
    ('offer', 'Оффер'),
    ('rejected', 'Отказ');

CREATE TABLE application_status_history (
    id INTEGER PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status_code TEXT NOT NULL REFERENCES application_statuses(code) ON DELETE RESTRICT,
    changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', changed_at, '+0 seconds') IS changed_at)
) STRICT;

CREATE TABLE interviews (
    id INTEGER PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_on TEXT NOT NULL CHECK (date(scheduled_on, '+0 days') IS scheduled_on),
    scheduled_time TEXT NOT NULL CHECK (
        scheduled_time GLOB '[0-2][0-9]:[0-5][0-9]' AND scheduled_time < '24:00'
    ),
    stage TEXT NOT NULL CHECK (stage IN ('hr', 'tech', 'review', 'final')),
    format TEXT NOT NULL CHECK (format IN ('online', 'office', 'phone')),
    place TEXT,
    interviewer TEXT,
    result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed')),
    notes TEXT
) STRICT;

CREATE TABLE preparation_tasks (
    id INTEGER PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    due_on TEXT CHECK (due_on IS NULL OR date(due_on, '+0 days') IS due_on),
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
) STRICT;

CREATE INDEX idx_contacts_company ON contacts (company_id);
CREATE INDEX idx_applications_company ON applications (company_id);
CREATE INDEX idx_applications_contact ON applications (contact_id);
CREATE INDEX idx_applications_date ON applications (applied_on DESC, id DESC);
CREATE INDEX idx_interviews_application ON interviews (application_id);
CREATE INDEX idx_interviews_schedule ON interviews (scheduled_on, scheduled_time);
CREATE INDEX idx_tasks_application ON preparation_tasks (application_id);
CREATE INDEX idx_tasks_pending_due ON preparation_tasks (due_on) WHERE done = 0;
CREATE INDEX idx_history_latest ON application_status_history (application_id, changed_at DESC, id DESC);
CREATE INDEX idx_history_status ON application_status_history (status_code);

CREATE TRIGGER applications_initial_status
AFTER INSERT ON applications
BEGIN
    INSERT INTO application_status_history (application_id, status_code, changed_at)
    VALUES (NEW.id, 'applied', NEW.applied_on || 'T00:00:00.000Z');
END;

CREATE VIEW application_current_status AS
SELECT application.id AS application_id, status.code AS status_code, status.title AS status_title,
       event.changed_at
FROM applications AS application
JOIN application_status_history AS event ON event.id = (
    SELECT history.id
    FROM application_status_history AS history
    WHERE history.application_id = application.id
    ORDER BY history.changed_at DESC, history.id DESC
    LIMIT 1
)
JOIN application_statuses AS status ON status.code = event.status_code;

COMMIT;
