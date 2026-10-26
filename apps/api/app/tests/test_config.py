"""Automated tests for environment settings, credential redaction, and branch isolation."""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

import run_dev
from app.core.config import (
    Settings,
    normalize_sqlalchemy_postgres_url,
    redact_database_url,
)
from app.core.logging import scrub_sensitive_text

VALID_DEV_POOLER_URL = (
    "postgresql://experiencebridge_development:superSecretPass123"
    "@ep-demo-pooler.us-east-2.aws.neon.tech/experiencebridge?sslmode=require"
)
VALID_DEV_DIRECT_URL = (
    "postgresql://experiencebridge_development:superSecretPass123"
    "@ep-demo.us-east-2.aws.neon.tech/experiencebridge?sslmode=require"
)


def test_normalize_sqlalchemy_postgres_url_converts_schemes() -> None:
    url = normalize_sqlalchemy_postgres_url(VALID_DEV_POOLER_URL)
    assert url.startswith("postgresql+psycopg://")
    assert "sslmode=require" in url

    postgres_scheme_url = VALID_DEV_POOLER_URL.replace("postgresql://", "postgres://", 1)
    assert normalize_sqlalchemy_postgres_url(postgres_scheme_url).startswith(
        "postgresql+psycopg://"
    )


def test_normalize_sqlalchemy_postgres_url_rejects_invalid_inputs() -> None:
    with pytest.raises(ValueError, match="PostgreSQL scheme"):
        normalize_sqlalchemy_postgres_url("mysql://user:pass@localhost/db")

    with pytest.raises(ValueError, match="placeholder"):
        normalize_sqlalchemy_postgres_url(
            "postgresql://experiencebridge_development:<password>@<development-pooler-host>/db?sslmode=require"
        )


def test_credential_redaction_never_exposes_secrets() -> None:
    settings = Settings(
        _env_file=None,
        app_env="development",
        neon_branch="development",
        database_url=VALID_DEV_POOLER_URL,
    )
    assert "superSecretPass123" not in repr(settings)
    assert "superSecretPass123" not in str(settings)
    assert "superSecretPass123" not in settings.redacted_database_url
    assert settings.redacted_database_url == (
        "postgresql+psycopg://***:***@ep-demo-pooler.us-east-2.aws.neon.tech/experiencebridge"
    )
    assert redact_database_url(None) == "<unconfigured>"

    log_line = f"Connection failed for {VALID_DEV_POOLER_URL} with Bearer secretTokenXYZ"
    scrubbed = scrub_sensitive_text(log_line)
    assert "superSecretPass123" not in scrubbed
    assert "secretTokenXYZ" not in scrubbed
    assert "***:***@ep-demo-pooler.us-east-2.aws.neon.tech" in scrubbed


def test_settings_reject_production_branch_in_local_or_test() -> None:
    with pytest.raises(ValidationError, match="never target NEON_BRANCH=production"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="production",
        )

    with pytest.raises(ValidationError, match="never target NEON_BRANCH=production"):
        Settings(
            _env_file=None,
            app_env="test",
            neon_branch="production",
        )


def test_settings_reject_production_role_or_unpooled_runtime_in_development() -> None:
    prod_role_url = (
        "postgresql://experiencebridge_production:secret"
        "@ep-demo-pooler.us-east-2.aws.neon.tech/experiencebridge?sslmode=require"
    )
    with pytest.raises(ValidationError, match="production database role"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="development",
            database_url=prod_role_url,
        )

    with pytest.raises(ValidationError, match="pooled \\(-pooler\\) endpoint"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="development",
            database_url=VALID_DEV_DIRECT_URL,
        )


def test_settings_require_sslmode_for_neon_and_direct_host_for_unpooled() -> None:
    no_ssl_url = (
        "postgresql://experiencebridge_development:secret"
        "@ep-demo-pooler.us-east-2.aws.neon.tech/experiencebridge"
    )
    with pytest.raises(ValidationError, match="sslmode=require"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="development",
            database_url=no_ssl_url,
        )

    with pytest.raises(ValidationError, match="direct \\(non-pooler\\)"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="development",
            database_url=VALID_DEV_POOLER_URL,
            database_url_unpooled=VALID_DEV_POOLER_URL,
        )

    valid = Settings(
        _env_file=None,
        app_env="development",
        neon_branch="development",
        database_url=VALID_DEV_POOLER_URL,
        database_url_unpooled=VALID_DEV_DIRECT_URL,
    )
    assert "-pooler." not in valid.sqlalchemy_migration_uri


def test_cors_settings_validation() -> None:
    with pytest.raises(ValidationError, match="Wildcard CORS origin"):
        Settings(
            _env_file=None,
            app_env="development",
            neon_branch="development",
            cors_allowed_origins=["*"],
            cors_allow_credentials=True,
        )

    settings = Settings(
        _env_file=None,
        app_env="development",
        neon_branch="development",
        cors_allowed_origins="http://localhost:3000, http://127.0.0.1:3000",
    )
    assert settings.cors_allowed_origins == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_run_dev_guard_rejects_non_development_env(tmp_path: Path) -> None:
    bad_branch_env = tmp_path / ".env.development.local"
    bad_branch_env.write_text(
        f"NEON_BRANCH=production\nDATABASE_URL={VALID_DEV_POOLER_URL}\n",
        encoding="utf-8",
    )
    with pytest.raises(SystemExit, match="NEON_BRANCH=development"):
        run_dev.read_environment(bad_branch_env)

    bad_host_env = tmp_path / ".env.badhost.local"
    bad_host_env.write_text(
        f"NEON_BRANCH=development\nDATABASE_URL={VALID_DEV_DIRECT_URL}\n",
        encoding="utf-8",
    )
    with pytest.raises(SystemExit, match="pooled development endpoint"):
        run_dev.read_environment(bad_host_env)
