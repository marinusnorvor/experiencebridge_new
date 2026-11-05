"""Email link and transport behavior without sending mail."""
import pytest

from app.identity.auth_email import DevelopmentMailer, ResendMailer, link_for


def test_links_use_trusted_origin_and_fragment():
    assert link_for("https://app.example.invalid", "verify-email", "synthetic-token") == "https://app.example.invalid/verify-email#synthetic-token"
    with pytest.raises(ValueError):
        link_for("https://example.invalid/path", "reset-password", "synthetic-token")
    with pytest.raises(ValueError):
        link_for("https://example.invalid", "unknown", "synthetic-token")


def test_test_transport_only_captures_and_production_requires_https():
    mailer = DevelopmentMailer()
    mailer.send_link(recipient="synthetic@example.invalid", purpose="verify-email", token="synthetic-token")
    assert mailer.messages == [("synthetic@example.invalid", "verify-email", "synthetic-token")]
    with pytest.raises(ValueError):
        ResendMailer(api_key="synthetic", sender="synthetic@example.invalid", frontend_url="http://localhost:3000")


def test_development_mailbox_requires_local_secret_and_is_never_available_on_deployments(monkeypatch):
    from types import SimpleNamespace
    from fastapi.testclient import TestClient
    from app.core.config import Settings
    from app.identity.auth_config import AuthConfig
    from app.main import create_app

    monkeypatch.setenv("AUTH_DEV_MAILBOX_ENABLED", "true")
    monkeypatch.setenv("AUTH_DEV_MAILBOX_SECRET", "synthetic-private-secret-32-characters")
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    app = create_app(Settings(_env_file=None, APP_ENV="development", NEON_BRANCH="development"))
    app.state.auth_config = AuthConfig("development", "http://localhost:3000", "https://identity.example.invalid", "s" * 32, None, None)
    app.state.auth_mailer = DevelopmentMailer()
    app.state.auth_mailer.send_link(recipient="synthetic@example.invalid", purpose="verify-email", token="synthetic-token")
    body = {"email": "synthetic@example.invalid", "purpose": "verify-email"}
    headers = {"X-Dev-Mailbox-Secret": "synthetic-private-secret-32-characters"}
    with TestClient(app, base_url="http://127.0.0.1:8000", client=("127.0.0.1", 1234)) as client:
        assert client.post("/api/v1/auth/dev-mailbox", json=body).status_code == 404
        assert client.post("/api/v1/auth/dev-mailbox", json=body, headers={**headers, "Origin": "http://localhost:3000"}).status_code == 404
        assert client.post("/api/v1/auth/dev-mailbox", json=body, headers={**headers, "X-Forwarded-For": "127.0.0.1"}).status_code == 404
        assert client.post("/api/v1/auth/dev-mailbox", json=body, headers={**headers, "Host": "evil.example.invalid"}).status_code == 404
        result = client.post("/api/v1/auth/dev-mailbox", json=body, headers=headers)
        assert result.status_code == 200 and result.json()["link"] == "http://localhost:3000/verify-email#synthetic-token"
        assert result.headers["Cache-Control"] == "no-store"
        monkeypatch.setenv("VERCEL", "1")
        assert client.post("/api/v1/auth/dev-mailbox", json=body, headers=headers).status_code == 404
        monkeypatch.delenv("VERCEL")
        original_settings = app.state.settings
        for environment in ("test", "staging", "production"):
            app.state.settings = SimpleNamespace(app_env=environment)
            assert client.post("/api/v1/auth/dev-mailbox", json=body, headers=headers).status_code == 404
        app.state.settings = original_settings
    with TestClient(app, base_url="http://127.0.0.1:8000", client=("203.0.113.10", 1234)) as remote:
        assert remote.post("/api/v1/auth/dev-mailbox", json=body, headers=headers).status_code == 404
