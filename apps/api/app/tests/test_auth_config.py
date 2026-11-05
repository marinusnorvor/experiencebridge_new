"""Configuration fails closed without production credentials or safe origins."""
import pytest

from app.identity.auth_config import AuthConfig
from app.core.config import Settings
from app.main import create_app
from fastapi.testclient import TestClient


def test_production_requires_mail_configuration(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example.invalid")
    monkeypatch.setenv("AUTH_IDENTITY_ISSUER", "https://identity.example.invalid")
    monkeypatch.setenv("AUTH_RATE_LIMIT_SECRET", "x" * 32)
    monkeypatch.delenv("EMAIL_API_KEY", raising=False)
    monkeypatch.delenv("EMAIL_FROM", raising=False)
    with pytest.raises(ValueError, match="EMAIL_API_KEY"):
        AuthConfig.from_environment()
    monkeypatch.setenv("EMAIL_API_KEY", "synthetic")
    monkeypatch.setenv("EMAIL_FROM", "synthetic@example.invalid")
    monkeypatch.setenv("AUTH_PROXY_SECRET", "x" * 32)
    config = AuthConfig.from_environment()
    assert config.secure_cookies and config.session_cookie.startswith("__Host-")


def test_insecure_origin_only_allowed_for_local_development(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AUTH_IDENTITY_ISSUER", "https://identity.example.invalid")
    monkeypatch.setenv("AUTH_RATE_LIMIT_SECRET", "x" * 32)
    monkeypatch.setenv("FRONTEND_URL", "http://example.invalid")
    with pytest.raises(ValueError, match="localhost"):
        AuthConfig.from_environment()
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    assert AuthConfig.from_environment().session_cookie == "eb_session_dev"


def test_application_starts_without_clerk_credentials(monkeypatch):
    for name in ("CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_ISSUER_URL", "CLERK_JWKS_URL"):
        monkeypatch.delenv(name, raising=False)
    settings = Settings(_env_file=None, APP_ENV="test", NEON_BRANCH="test")
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").status_code == 200
        assert "/api/v1/auth/login" in client.get("/openapi.json").json()["paths"]
