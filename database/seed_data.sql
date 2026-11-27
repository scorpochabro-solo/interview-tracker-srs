PRAGMA foreign_keys = ON;

BEGIN;

INSERT INTO companies (id, name) VALUES
    (1, 'Полярис Тех'),
    (2, 'Вектор Софт'),
    (3, 'Линия Данных');

INSERT INTO contacts (id, company_id, full_name, role, email, last_contact_on) VALUES
    (1, 1, 'Анна Соколова', 'Рекрутер', 'anna@example.org', '2026-11-18'),
    (2, 2, 'Иван Крылов', 'HR-менеджер', 'ivan@example.org', '2026-11-22');

INSERT INTO applications (
    id, company_id, contact_id, position, applied_on, vacancy_url, source, salary_expectation
) VALUES
    (1, 1, 1, 'Frontend-разработчик', '2026-11-15', 'https://example.org/jobs/frontend', 'site', 'от 110 000 ₽'),
    (2, 2, 2, 'QA-инженер', '2026-11-16', NULL, 'referral', NULL),
    (3, 3, NULL, 'Аналитик данных', '2026-11-25', NULL, 'hh', NULL);

-- Записи о первоначальных откликах уже добавлены триггером.
INSERT INTO application_status_history (application_id, status_code, changed_at) VALUES
    (1, 'test', '2026-11-17T09:30:00.000Z'),
    (1, 'interview', '2026-11-18T11:00:00.000Z'),
    (2, 'interview', '2026-11-17T13:00:00.000Z'),
    (2, 'offer', '2026-11-22T15:10:00.000Z');

INSERT INTO interviews (application_id, scheduled_on, scheduled_time, stage, format, place, result) VALUES
    (1, '2026-11-18', '14:00', 'hr', 'phone', NULL, 'passed'),
    (1, '2026-11-28', '10:30', 'tech', 'online', 'https://example.org/meeting/tech', 'pending'),
    (2, '2026-11-20', '12:00', 'final', 'office', 'Офис компании', 'passed');

INSERT INTO preparation_tasks (application_id, title, due_on, done) VALUES
    (1, 'Повторить вопросы по JavaScript', '2026-11-27', 0),
    (1, 'Проверить связь перед созвоном', '2026-11-18', 1),
    (2, 'Разобрать пример чек-листа', '2026-11-19', 1),
    (NULL, 'Обновить резюме', NULL, 0);

COMMIT;
