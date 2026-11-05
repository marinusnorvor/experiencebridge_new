"""Offline production configuration checks with synthetic values only."""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.pool import NullPool
from app.core.config import Settings, load_settings
from app.database.session import build_engine_options
from app.main import create_app
import check_config


def production_values():
    return dict(app_env="production", neon_branch="production", database_url="postgresql://example_production:synthetic@ep-example-pooler.example.com/db?sslmode=require", cors_allowed_origins=["https://app.example.com"])


def configure_auth(monkeypatch):
    for key,value in {"FRONTEND_URL":"https://app.example.com", "AUTH_IDENTITY_ISSUER":"https://identity.example.com", "AUTH_RATE_LIMIT_SECRET":"r"*32, "AUTH_PROXY_SECRET":"p"*32, "EMAIL_API_KEY":"synthetic", "EMAIL_FROM":"synthetic@example.com"}.items(): monkeypatch.setenv(key,value)
    for key in ("CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_ISSUER_URL", "CLERK_JWKS_URL"): monkeypatch.delenv(key,raising=False)


def test_production_pooling_is_serverless_safe():
    for settings in (Settings(_env_file=None,**production_values()),Settings(_env_file=None,**production_values(),vercel=True,vercel_env="production")):
        options=build_engine_options(settings)
        assert options["poolclass"] is NullPool
        assert options["connect_args"]["prepare_threshold"] is None


@pytest.mark.parametrize("origins", [[], ["http://localhost:3000"], ["https://app.example.com/path"], ["https://*.example.com"], ["https://user:private@api.example.com"]])
def test_production_rejects_ambiguous_origins(origins):
    with pytest.raises(ValidationError): Settings(_env_file=None,**(production_values() | {"cors_allowed_origins":origins}))


def test_production_startup_without_clerk_and_cors(monkeypatch):
    configure_auth(monkeypatch)
    with TestClient(create_app(Settings(_env_file=None,**production_values()))) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/me").status_code == 401
        result=client.options("/api/v1/me",headers={"Origin":"https://app.example.com","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"x-csrf-token"})
        assert result.status_code == 200
        assert result.headers["access-control-allow-origin"] == "https://app.example.com"
        assert client.options("/api/v1/me",headers={"Origin":"http://localhost:3000","Access-Control-Request-Method":"GET"}).status_code == 400


def test_production_fails_closed_without_email(monkeypatch):
    configure_auth(monkeypatch); monkeypatch.delenv("EMAIL_API_KEY")
    with pytest.raises(ValueError,match="EMAIL_API_KEY"): create_app(Settings(_env_file=None,**production_values()))


def test_offline_preflight_redacts_invalid_input(tmp_path,capsys):
    target=tmp_path/"invalid.env"; target.write_text("APP_ENV=production\nNEON_BRANCH=production\nDATABASE_URL=private-invalid-value\n",encoding="utf-8")
    assert check_config.main(["--env-file",str(target)]) == 1
    assert "private-invalid-value" not in capsys.readouterr().out


def test_explicit_production_never_loads_development_file(tmp_path,monkeypatch):
    target=tmp_path/"development.env"; target.write_text("DATABASE_URL=must-not-be-read\n",encoding="utf-8")
    monkeypatch.setenv("APP_ENV","production")
    assert "must-not-be-read" not in load_settings(env_file=target,overrides=production_values()).sqlalchemy_database_uri


def test_build_demo_workflows_opt_in_is_default_off_and_works_in_production(monkeypatch):
    from app.core.errors import AppError
    from app.projects.router import demonstration_environment
    configure_auth(monkeypatch)
    monkeypatch.delenv("EB_BUILD_DEMO_WORKFLOWS", raising=False)
    default = Settings(_env_file=None, **production_values())
    assert default.build_demo_workflows is False
    with TestClient(create_app(default)) as client:
        assert client.get("/api/v1/projects").status_code == 403
    with pytest.raises(AppError) as error:
        demonstration_environment(default)
    assert error.value.status_code == 403
    for value in ("false", "0", ""):
        monkeypatch.setenv("EB_BUILD_DEMO_WORKFLOWS", value)
        if value:
            assert Settings(_env_file=None, **production_values()).build_demo_workflows is False
    monkeypatch.setenv("EB_BUILD_DEMO_WORKFLOWS", "true")
    enabled = Settings(_env_file=None, **production_values())
    assert enabled.build_demo_workflows is True
    assert demonstration_environment(enabled) is None
