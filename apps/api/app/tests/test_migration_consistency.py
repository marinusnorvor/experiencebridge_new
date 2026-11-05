"""Check the complete migration chain without connecting to any Neon database."""

import io
from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import CheckConstraint, create_engine, inspect

import app.identity.models  # noqa: F401
import app.identity.password_models  # noqa: F401
import app.organizations.models  # noqa: F401
import app.projects.models  # noqa: F401
import app.applications.models  # noqa: F401
import app.mentorship.models  # noqa: F401
import app.assessments.models  # noqa: F401
import app.core.commands  # noqa: F401
from app.database.base import Base


def test_full_migration_chain_matches_models_and_compiles_for_postgres():
    scripts = ScriptDirectory(str(Path(__file__).resolve().parents[2] / "alembic"))
    assert scripts.get_heads() == ["20261105_0006"]
    revisions = list(reversed(list(scripts.walk_revisions())))
    assert len(revisions) == 6
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            context = MigrationContext.configure(connection, opts={"compare_type": True})
            with Operations.context(context):
                for revision in revisions:
                    revision.module.upgrade()
            assert compare_metadata(context, Base.metadata) == []
            inspector = inspect(connection)
            assert set(inspector.get_table_names()) == set(Base.metadata.tables)
            for table in Base.metadata.sorted_tables:
                expected = {str(c.name): str(c.sqltext) for c in table.constraints if isinstance(c, CheckConstraint)}
                actual = {c["name"]: c["sqltext"] for c in inspector.get_check_constraints(table.name)}
                assert actual == expected, table.name
            with Operations.context(context):
                with pytest.raises(RuntimeError, match="data-preserving rollback"):
                    revisions[-1].module.downgrade()
    finally:
        engine.dispose()

    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        for revision in revisions:
            revision.module.upgrade()
    sql = output.getvalue()
    for name in Base.metadata.tables:
        assert f"CREATE TABLE {name} (" in sql
    assert "WHERE status = 'offered'" in sql
    assert "WHERE status = 'accepted'" in sql
    assert "DROP TABLE" not in sql
