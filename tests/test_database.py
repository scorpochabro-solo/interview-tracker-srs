import sqlite3
import unittest
from pathlib import Path


DATABASE = Path(__file__).resolve().parents[1] / "database"


class InterviewDatabaseTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)
        for name in ("schema.sql", "seed_data.sql"):
            self.db.executescript((DATABASE / name).read_text(encoding="utf-8"))

    def test_seed_is_consistent(self):
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])
        actual = self.db.execute(
            "SELECT status_code FROM application_current_status ORDER BY application_id"
        ).fetchall()
        self.assertEqual(actual, [("interview",), ("offer",), ("applied",)])

    def test_initial_status_created_with_application(self):
        self.db.execute(
            "INSERT INTO applications (id, company_id, position, applied_on) "
            "VALUES (10, 1, 'Аналитик', '2026-11-26')"
        )
        self.assertEqual(
            self.db.execute(
                "SELECT status_code, changed_at FROM application_current_status "
                "WHERE application_id = 10"
            ).fetchone(),
            ("applied", "2026-11-26T00:00:00.000Z"),
        )

    def test_latest_status_uses_time_then_id(self):
        self.db.executemany(
            "INSERT INTO application_status_history (application_id, status_code, changed_at) "
            "VALUES (1, ?, ?)",
            [
                ("offer", "2026-11-29T12:00:00.000Z"),
                ("rejected", "2026-11-29T12:00:00.000Z"),
                ("test", "2026-11-16T12:00:00.000Z"),
            ],
        )
        self.assertEqual(
            self.db.execute(
                "SELECT status_code FROM application_current_status WHERE application_id = 1"
            ).fetchone(),
            ("rejected",),
        )

    def test_deleting_application_removes_linked_details_only(self):
        self.db.execute("DELETE FROM applications WHERE id = 1")
        for table in ("interviews", "preparation_tasks", "application_status_history"):
            with self.subTest(table=table):
                remaining = self.db.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE application_id = 1"
                ).fetchone()
                self.assertEqual(remaining, (0,))
        self.assertEqual(
            self.db.execute(
                "SELECT title FROM preparation_tasks WHERE application_id IS NULL"
            ).fetchall(),
            [("Обновить резюме",)],
        )
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM contacts").fetchone(), (2,))

    def test_deleting_contact_keeps_application(self):
        self.db.execute("DELETE FROM contacts WHERE id = 1")
        self.assertEqual(
            self.db.execute("SELECT company_id, contact_id FROM applications WHERE id = 1").fetchone(),
            (1, None),
        )

    def test_rejects_orphans_invalid_dates_and_status(self):
        statements = [
            "INSERT INTO applications (company_id, position, applied_on) "
            "VALUES (999, 'Аналитик', '2026-11-30')",
            "INSERT INTO preparation_tasks (application_id, title) VALUES (999, 'Подготовиться')",
            "INSERT INTO application_status_history (application_id, status_code) VALUES (1, 'unknown')",
            "INSERT INTO applications (company_id, position, applied_on) "
            "VALUES (1, 'Аналитик', '2026-02-30')",
            "INSERT INTO interviews (application_id, scheduled_on, scheduled_time, stage, format) "
            "VALUES (1, '2026-11-28', '25:00', 'hr', 'online')",
            "INSERT INTO application_status_history (application_id, status_code, changed_at) "
            "VALUES (1, 'test', '2026-02-30T12:00:00.000Z')",
        ]
        for statement in statements:
            with self.subTest(statement=statement), self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(statement)
