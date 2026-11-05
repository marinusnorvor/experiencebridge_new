"""Authentication primitive behavior; no persistent database or real identities."""

import pytest

from app.identity.password_security import (
    hash_password,
    new_token,
    normalize_email,
    password_needs_rehash,
    token_digest,
    token_matches,
    validate_password,
    verify_password,
)


def test_password_hashing_is_salted_and_verifies():
    value = "long password with spaces"
    first = hash_password(value)
    second = hash_password(value)
    assert first != second and value not in first
    assert first.startswith("$argon2id$")
    assert verify_password(first, value)
    assert not verify_password(first, "an incorrect password")
    assert not password_needs_rehash(first)


def test_input_boundaries_and_email_normalization():
    assert normalize_email("  Example+tag@EXAMPLE.ORG ") == "example+tag@example.org"
    with pytest.raises(ValueError):
        normalize_email("no-address")
    with pytest.raises(ValueError):
        validate_password("too short")
    assert validate_password("a" * 256) == "a" * 256
    with pytest.raises(ValueError):
        validate_password("é" * 513)


def test_tokens_are_random_and_only_matching_digests_verify():
    first, second = new_token(), new_token()
    assert first != second
    digest = token_digest(first)
    assert first not in digest
    assert token_matches(first, digest)
    assert not token_matches(second, digest)
