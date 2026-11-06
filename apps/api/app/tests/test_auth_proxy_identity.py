"""Proxy identity must be authenticated before it affects rate limits."""
import hashlib
import hmac
import time

import pytest
from starlette.requests import Request

from app.core.errors import AppError
from app.identity import auth_router
from app.identity.auth_config import AuthConfig
from app.tests.auth_workflow_helpers import staging_workflow


def test_rate_limit_rejects_spoofed_and_accepts_signed_ip(monkeypatch):
    config = AuthConfig("staging", "https://app.example.invalid", "https://id.example.invalid", "s" * 32, "key", "sender@example.invalid", "p" * 32)
    class DB:
        def commit(self): pass
    seen = []
    monkeypatch.setattr(auth_router, "increment_rate_limit", lambda db, **kw: seen.append(kw["identity"]) or 1)
    timestamp = str(int(time.time()))
    ip = "203.0.113.42"
    signature = hmac.new(("p" * 32).encode(), f"{timestamp}.{ip}.POST./".encode(), hashlib.sha256).hexdigest()
    def request(sig, *, path="/", client_ip=ip, ts=timestamp):
        return Request({"type": "http", "method": "POST", "path": path, "headers": [(b"x-eb-client-ip", client_ip.encode()), (b"x-eb-proxy-time", ts.encode()), (b"x-eb-proxy-signature", sig.encode())], "client": ("127.0.0.1", 1)})
    for forged in (request(""), request("spoofed"), request(signature, path="/api/v1/auth/register"), request(signature, client_ip="198.51.100.1"), request(signature, ts=str(int(timestamp) - 61))):
        with pytest.raises(AppError) as error:
            auth_router._limit(DB(), forged, config, email="test@example.invalid", scope="login")
        assert error.value.status_code == 403
    assert not seen
    assert auth_router._limit(DB(), request(signature), config, email="test@example.invalid", scope="login")
    assert seen[-1] == ip


def test_vercel_services_routing_uses_vercel_forwarded_for(monkeypatch):
    config = AuthConfig("production", "https://app.example.invalid", "https://id.example.invalid", "s" * 32, "key", "sender@example.invalid", "p" * 32)
    class DB:
        def commit(self): pass
    seen = []
    monkeypatch.setattr(auth_router, "increment_rate_limit", lambda db, **kw: seen.append(kw["identity"]) or 1)
    def request(headers):
        return Request({"type": "http", "method": "POST", "path": "/api/v1/auth/login", "headers": [(k.encode(), v.encode()) for k, v in headers.items()], "client": ("127.0.0.1", 1)})
    # Outside Vercel the unsigned request is still rejected.
    monkeypatch.delenv("VERCEL", raising=False)
    with pytest.raises(AppError) as error:
        auth_router._limit(DB(), request({"x-vercel-forwarded-for": "203.0.113.7"}), config, email="test@example.invalid", scope="login")
    assert error.value.status_code == 403
    monkeypatch.setenv("VERCEL", "1")
    for bad in ({}, {"x-vercel-forwarded-for": ""}, {"x-vercel-forwarded-for": "not-an-ip"}):
        with pytest.raises(AppError) as error:
            auth_router._limit(DB(), request(bad), config, email="test@example.invalid", scope="login")
        assert error.value.status_code == 403
    assert not seen
    assert auth_router._limit(DB(), request({"x-vercel-forwarded-for": "203.0.113.7, 10.0.0.1"}), config, email="test@example.invalid", scope="login")
    assert seen[-1] == "203.0.113.7"
    # A present (forged) gateway signature still goes through HMAC verification on Vercel.
    with pytest.raises(AppError) as error:
        auth_router._limit(DB(), request({"x-vercel-forwarded-for": "203.0.113.7", "x-eb-client-ip": "203.0.113.7", "x-eb-proxy-time": str(int(time.time())), "x-eb-proxy-signature": "forged"}), config, email="test@example.invalid", scope="login")
    assert error.value.status_code == 403


def test_direct_backend_cannot_spoof_proxy_or_bypass_csrf(staging_workflow):
    from fastapi.testclient import TestClient
    from app.tests.auth_workflow_helpers import ORIGIN, PASSWORD, register_actor

    _, make_app = staging_workflow
    app = make_app()
    app.state.auth_config = AuthConfig("staging", ORIGIN, "https://id.example.invalid", "s" * 32, "synthetic-key", "sender@example.invalid", "p" * 32)
    with TestClient(app, base_url=ORIGIN) as client:
        actor = register_actor(client, "proxy")
        credentials = {"email": actor["email"], "password": PASSWORD}
        client.cookies.clear()
        client.headers.pop("X-CSRF-Token", None)
        csrf = client.get("/api/v1/auth/csrf").json()["csrf_token"]
        headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
        assert client.post("/api/v1/auth/login", json=credentials, headers=headers).status_code == 403
        headers.update({"X-EB-Client-IP": "203.0.113.42", "X-EB-Proxy-Time": str(int(time.time())), "X-EB-Proxy-Signature": "forged"})
        assert client.post("/api/v1/auth/login", json=credentials, headers=headers).status_code == 403
        payload = f'{headers["X-EB-Proxy-Time"]}.203.0.113.42.POST./api/v1/auth/login'
        headers["X-EB-Proxy-Signature"] = hmac.new(("p" * 32).encode(), payload.encode(), hashlib.sha256).hexdigest()
        without_csrf = dict(headers)
        del without_csrf["X-CSRF-Token"]
        assert client.post("/api/v1/auth/login", json=credentials, headers=without_csrf).status_code == 403
        assert client.post("/api/v1/auth/login", json=credentials, headers={**headers, "Origin": "https://evil.example.invalid"}).status_code == 403
        assert client.post("/api/v1/auth/login", json=credentials, headers=headers).status_code == 200
        client.headers.pop("X-CSRF-Token", None)
        assert client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}).status_code == 403
        organization = {"display_name": "Synthetic proxy test", "description": "Synthetic request"}
        assert client.post("/api/v1/organizations", json=organization, headers={"Origin": ORIGIN, "Idempotency-Key": "synthetic-proxy-test"}).status_code == 403
        session_csrf = client.get("/api/v1/auth/csrf").json()["csrf_token"]
        assert client.post("/api/v1/organizations", json=organization, headers={"Origin": "https://evil.example.invalid", "X-CSRF-Token": session_csrf, "Idempotency-Key": "synthetic-proxy-test"}).status_code == 403


def test_per_ip_limits_are_configurable_but_per_email_is_not(monkeypatch):
    config = AuthConfig("development", "http://localhost:3000", "https://id.example.invalid", "s" * 32, None, None, None)
    class DB:
        def commit(self): pass
    counts = {"email": 0, "ip": 0}
    def fake_increment(db, **kw):
        key = "email" if kw["scope"].endswith(":email") else "ip"
        return counts[key]
    monkeypatch.setattr(auth_router, "increment_rate_limit", fake_increment)
    request = Request({"type": "http", "method": "POST", "path": "/api/v1/auth/login", "headers": [], "client": ("127.0.0.1", 1)})
    monkeypatch.delenv("AUTH_LOGIN_PER_IP_PER_15MIN", raising=False)
    monkeypatch.delenv("AUTH_REGISTER_PER_IP_PER_HOUR", raising=False)
    # Defaults unchanged: 31st login attempt from one IP is limited.
    counts.update(ip=31, email=1)
    with pytest.raises(AppError) as error:
        auth_router._limit(DB(), request, config, email="a@example.invalid", scope="login")
    assert error.value.status_code == 429
    # Raised for a shared network.
    monkeypatch.setenv("AUTH_LOGIN_PER_IP_PER_15MIN", "300")
    assert auth_router._limit(DB(), request, config, email="a@example.invalid", scope="login")
    counts.update(ip=301)
    with pytest.raises(AppError):
        auth_router._limit(DB(), request, config, email="a@example.invalid", scope="login")
    # Per-email login limit (5) is not affected by the override.
    counts.update(ip=1, email=6)
    with pytest.raises(AppError):
        auth_router._limit(DB(), request, config, email="a@example.invalid", scope="login")
    # Register: default 20/hour, override applies; invalid values fall back to the default.
    counts.update(ip=21, email=1)
    with pytest.raises(AppError):
        auth_router._limit(DB(), request, config, email="b@example.invalid", scope="register")
    monkeypatch.setenv("AUTH_REGISTER_PER_IP_PER_HOUR", "300")
    assert auth_router._limit(DB(), request, config, email="b@example.invalid", scope="register")
    monkeypatch.setenv("AUTH_REGISTER_PER_IP_PER_HOUR", "not-a-number")
    with pytest.raises(AppError):
        auth_router._limit(DB(), request, config, email="b@example.invalid", scope="register")
    # Other scopes (forgot password) keep their fixed limit even when overrides are set.
    counts.update(ip=21, email=1)
    with pytest.raises(AppError):
        auth_router._limit(DB(), request, config, email="b@example.invalid", scope="reset_password")
