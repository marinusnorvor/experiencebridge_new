"""Cleanup is bounded and never touches identity or business tables."""
from datetime import datetime, timezone

import pytest
from sqlalchemy.dialects import postgresql

from app.identity.auth_repository import cleanup_expired_auth_records


def test_auth_cleanup_uses_bounded_batches_without_touching_business_tables():
    class RecordingSession:
        def __init__(self):
            self.statements = []
        def execute(self, statement):
            self.statements.append(str(statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})))

    db = RecordingSession()
    cleanup_expired_auth_records(db, datetime(2026, 1, 10, tzinfo=timezone.utc), batch_size=25)
    assert len(db.statements) == 4
    for table, sql in zip(("auth_csrf_contexts", "auth_tokens", "auth_rate_limits", "auth_sessions"), db.statements):
        assert sql.startswith(f"DELETE FROM {table} ")
        assert "LIMIT 25" in sql
    assert "auth_csrf_contexts" in db.statements[-1]
    with pytest.raises(ValueError):
        cleanup_expired_auth_records(db, batch_size=0)
    with pytest.raises(ValueError):
        cleanup_expired_auth_records(db, batch_size=10001)
