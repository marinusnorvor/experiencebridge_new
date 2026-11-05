"""Strict configuration for password authentication."""
from __future__ import annotations

from dataclasses import dataclass, field
import os
from urllib.parse import urlsplit


def _origin(value: str, *, https_required: bool) -> str:
    parsed = urlsplit(value)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in {"", "/"} or parsed.query or parsed.fragment):
        raise ValueError("Authentication origins must be exact HTTP(S) origins")
    if https_required and parsed.scheme != "https":
        raise ValueError("Authentication origins require HTTPS outside local development")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("HTTP authentication origins are permitted only on localhost")
    return value.rstrip("/")


@dataclass(frozen=True)
class AuthConfig:
    environment: str
    frontend_origin: str
    identity_issuer: str
    rate_limit_secret: str = field(repr=False)
    email_api_key: str | None = field(repr=False)
    email_from: str | None
    proxy_secret: str | None = field(default=None, repr=False)

    @classmethod
    def from_environment(cls, environment: str | None = None) -> AuthConfig:
        environment = (environment or os.environ.get("APP_ENV", "development")).strip().lower()
        if environment not in {"development", "test", "staging", "production"}:
            raise ValueError("Invalid APP_ENV")
        production_like = environment in {"staging", "production"}
        frontend = _origin(os.environ.get("FRONTEND_URL", ""), https_required=production_like)
        issuer = _origin(os.environ.get("AUTH_IDENTITY_ISSUER", ""), https_required=True)
        secret = os.environ.get("AUTH_RATE_LIMIT_SECRET", "")
        if len(secret.encode("utf-8")) < 32 or "<" in secret or ">" in secret:
            raise ValueError("AUTH_RATE_LIMIT_SECRET must contain at least 32 bytes")
        key = os.environ.get("EMAIL_API_KEY") or None
        sender = os.environ.get("EMAIL_FROM") or None
        if production_like and (not key or not sender):
            raise ValueError("EMAIL_API_KEY and EMAIL_FROM are required in staging and production")
        if production_like and (any(char in key for char in "<>") or any(char in sender for char in "<>") or "@" not in sender):
            raise ValueError("EMAIL_API_KEY and EMAIL_FROM must not contain placeholders")
        proxy_secret = os.environ.get("AUTH_PROXY_SECRET") or None
        if production_like and (not proxy_secret or len(proxy_secret.encode("utf-8")) < 32 or "<" in proxy_secret or ">" in proxy_secret):
            raise ValueError("AUTH_PROXY_SECRET must contain at least 32 non-placeholder bytes")
        return cls(environment, frontend, issuer, secret, key, sender, proxy_secret)

    @property
    def secure_cookies(self) -> bool:
        return urlsplit(self.frontend_origin).scheme == "https"

    @property
    def session_cookie(self) -> str:
        return "__Host-eb_session" if self.secure_cookies else "eb_session_dev"

    @property
    def preauth_cookie(self) -> str:
        return "__Host-eb_preauth" if self.secure_cookies else "eb_preauth_dev"
