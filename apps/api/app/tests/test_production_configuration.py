"""Offline production configuration checks. All keys and database URLs are synthetic."""

import base64

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import check_config
from app.core.config import Settings, load_settings
from app.main import create_app
from app.database.session import build_engine_options
from sqlalchemy.pool import NullPool


def production_values():
    return dict(
        app_env="production", neon_branch="production",
        database_url="postgresql://example_production:synthetic@ep-example-pooler.example.com/db?sslmode=require",
        clerk_publishable_key="pk_live_" + base64.b64encode(b"clerk.example.com$").decode(),
        cors_allowed_origins=["https://app.example.com"],
        clerk_authorized_parties=["https://app.example.com"],
    )


def test_local_and_vercel_production_use_identical_security_settings():
    local = Settings(_env_file=None, **production_values())
    deployed = Settings(_env_file=None, **production_values(), vercel=True, vercel_env="production")
    for settings in (local, deployed):
        assert settings.clerk_issuer_url == "https://clerk.example.com"
        assert settings.clerk_jwks_url == "https://clerk.example.com/.well-known/jwks.json"
        assert settings.effective_clerk_authorized_parties == ["https://app.example.com"]
        options = build_engine_options(settings)
        assert options["poolclass"] is NullPool
        assert options["connect_args"]["prepare_threshold"] is None


@pytest.mark.parametrize("overrides", [
    {"clerk_publishable_key": None},
    {"clerk_publishable_key": "pk_live_not-a-key"},
    {"clerk_issuer_url": "https://different.example.com"},
    {"clerk_jwks_url": "https://different.example.com/keys"},
    {"clerk_authorized_parties": []},
    {"clerk_authorized_parties": ["http://localhost:3000"]},
    {"clerk_authorized_parties": ["https://app.example.com/path"]},
    {"clerk_authorized_parties": ["https://*.example.com"]},
    {"cors_allowed_origins": []},
    {"cors_allowed_origins": ["https://user:private@api.example.com"]},
])
def test_production_rejects_ambiguous_identity_or_origins(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **(production_values() | overrides))


def test_production_startup_and_auth_fail_closed_without_database_access(monkeypatch):
    import app.database.session as database
    monkeypatch.setattr(database, "get_session_factory", lambda: pytest.fail("No database access permitted"))
    with TestClient(create_app(Settings(_env_file=None, **production_values()))) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/me").status_code == 401
        assert client.post("/api/v1/organizations", json={}).status_code == 403
        response = client.options("/api/v1/me", headers={
            "Origin": "https://app.example.com", "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        })
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "https://app.example.com"
        assert client.options("/api/v1/me", headers={
            "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET",
        }).status_code == 400


def test_offline_preflight_redacts_invalid_input(tmp_path, capsys):
    target = tmp_path / ".env.production.local"
    target.write_text("APP_ENV=production\nNEON_BRANCH=production\nCLERK_SECRET_KEY=sk_test_private_value\n", encoding="utf-8")
    assert check_config.main(["--env-file", str(target)]) == 1
    assert "private_value" not in capsys.readouterr().out
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None, **(production_values() | {"clerk_secret_key": "sk_test_private_value"}))
    assert "private_value" not in str(error.value)


def test_explicit_production_environment_never_loads_development_file(tmp_path, monkeypatch):
    target = tmp_path / ".env.development.local"
    target.write_text("DATABASE_URL=must-not-be-read\n", encoding="utf-8")
    monkeypatch.setenv("APP_ENV", "production")
    settings = load_settings(env_file=target, overrides=production_values())
    assert "must-not-be-read" not in settings.sqlalchemy_database_uri
