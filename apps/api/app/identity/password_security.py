"""Password and opaque-token primitives for FastAPI authentication."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1, type=Type.ID)


def normalize_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 320 or value.count("@") != 1 or any(c.isspace() for c in value):
        raise ValueError("Invalid email address")
    local, domain = value.split("@")
    if not local or not domain or len(local.encode("utf-8")) > 64:
        raise ValueError("Invalid email address")
    return value


def validate_password(value: str) -> str:
    if len(value) < 12 or len(value.encode("utf-8")) > 1024:
        raise ValueError("Password must contain at least 12 characters and at most 1024 UTF-8 bytes")
    return value


def hash_password(value: str) -> str:
    return _hasher.hash(validate_password(value))


def verify_password(encoded: str, value: str) -> bool:
    if len(value.encode("utf-8")) > 1024:
        return False
    try:
        return _hasher.verify(encoded, value)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def password_needs_rehash(encoded: str) -> bool:
    return _hasher.check_needs_rehash(encoded)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def token_matches(value: str, digest: str) -> bool:
    return hmac.compare_digest(token_digest(value), digest)
