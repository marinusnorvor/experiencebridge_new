"""End-to-end unit and integration tests for Clerk JWT verification and identity persistence."""

from __future__ import annotations

import json
import time
from collections.abc import Generator
from datetime import datetime, timezone
from typing import Any

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from jwt import PyJWK
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.database.base import Base
from app.database.session import get_db
from app.identity.dependencies import require_global_role
from app.identity.models import User, UserRoleGrant
from app.main import create_app

TEST_ISSUER = "https://clerk.experiencebridge.dev.lcl.dev"
TEST_JWKS_URL = f"{TEST_ISSUER}/.well-known/jwks.json"
TEST_KID = "ins_test_key_001"


def _generate_rsa_keypair() -> tuple[rsa.RSAPrivateKey, PyJWK]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk_json = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key())
    public_jwk_dict = json.loads(public_jwk_json)
    public_jwk_dict["kid"] = TEST_KID
    public_jwk_dict["use"] = "sig"
    public_jwk_dict["alg"] = "RS256"
    return private_key, PyJWK.from_dict(public_jwk_dict)


RSA_PRIVATE_KEY, RSA_PUBLIC_JWK = _generate_rsa_keypair()
OTHER_PRIVATE_KEY, _ = _generate_rsa_keypair()


def _make_clerk_settings(
    *,
    authorized_parties: list[str] | None = None,
    audience: str | None = None,
) -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        neon_branch="test",
        cors_allowed_origins=["http://localhost:3000"],
        clerk_issuer_url=TEST_ISSUER,
        clerk_jwks_url=TEST_JWKS_URL,
        clerk_secret_key="sk_test_neverExposeThisSecretInResponses123",
        clerk_authorized_parties=authorized_parties or ["http://localhost:3000"],
        clerk_audience=audience,
        clerk_jwt_leeway_seconds=5,
    )


def _mint_jwt(
    private_key: rsa.RSAPrivateKey = RSA_PRIVATE_KEY,
    *,
    sub: str | None = "user_2xClerkTestSub001",
    iss: str = TEST_ISSUER,
    exp_offset: int = 300,
    nbf_offset: int = -10,
    iat_offset: int = -10,
    azp: str | None = "http://localhost:3000",
    aud: str | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "iss": iss,
        "exp": now + exp_offset,
        "nbf": now + nbf_offset,
        "iat": now + iat_offset,
    }
    if sub is not None:
        payload["sub"] = sub
    if azp is not None:
        payload["azp"] = azp
    if aud is not None:
        payload["aud"] = aud
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
        headers={"kid": TEST_KID, "typ": "JWT"},
    )


def _create_in_memory_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _build_test_app_and_session_factory(
    settings: Settings | None = None,
) -> tuple[FastAPI, sessionmaker[Session]]:
    active_settings = settings or _make_clerk_settings()
    app = create_app(active_settings)
    app.state.clerk_signing_key_resolver = lambda _token: RSA_PUBLIC_JWK.key
    session_factory = _create_in_memory_session_factory()

    def _override_db_session() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_db_session

    admin_router = APIRouter()

    @admin_router.get("/api/v1/_test/admin-only")
    def admin_only_route(user: User = Depends(require_global_role("platform_admin"))) -> dict[str, str]:
        return {"admin_user_id": str(user.id)}

    app.include_router(admin_router)
    return app, session_factory


def test_anonymous_requests_to_me_are_rejected_with_401() -> None:
    app, _ = _build_test_app_and_session_factory()
    with TestClient(app) as client:
        resp_missing = client.get("/api/v1/me")
        assert resp_missing.status_code == 401
        assert resp_missing.json()["error"]["code"] == "AUTH_REQUIRED"
        assert resp_missing.headers.get("WWW-Authenticate") == "Bearer"

        resp_basic = client.get("/api/v1/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
        assert resp_basic.status_code == 401
        assert resp_basic.json()["error"]["code"] == "AUTH_REQUIRED"

        resp_empty = client.get("/api/v1/me", headers={"Authorization": "Bearer   "})
        assert resp_empty.status_code == 401
        assert resp_empty.json()["error"]["code"] == "AUTH_REQUIRED"


def test_valid_clerk_token_provisions_user_and_returns_user_self() -> None:
    app, _ = _build_test_app_and_session_factory()
    token = _mint_jwt(
        sub="user_clerk_student_101",
        extra_claims={
            "name": "Ama Mensah",
            "email": "ama.mensah@example.edu",
            "email_verified": True,
            "sid": "sess_123",
        },
    )

    with TestClient(app) as client:
        first_resp = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert first_resp.status_code == 200
        body = first_resp.json()
        assert body["identity_issuer"] == TEST_ISSUER
        assert body["identity_subject"] == "user_clerk_student_101"
        assert body["display_name"] == "Ama Mensah"
        assert body["email"] == "ama.mensah@example.edu"
        assert body["email_verified_at"] is not None
        assert body["account_status"] == "active"
        assert body["role_grants"] == []
        assert body["effective_contexts"] == []
        assert body["row_version"] == 1
        assert "sk_test_" not in first_resp.text
        assert token not in first_resp.text

        # Second call with same identity reuses the same internal User UUID.
        second_resp = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert second_resp.status_code == 200
        assert second_resp.json()["id"] == body["id"]


def test_invalid_expired_wrong_issuer_signature_azp_and_aud_tokens_rejected() -> None:
    settings = _make_clerk_settings(
        authorized_parties=["http://localhost:3000"],
        audience="experiencebridge-api",
    )
    app, _ = _build_test_app_and_session_factory(settings)

    expired_token = _mint_jwt(exp_offset=-60, aud="experiencebridge-api")
    future_nbf_token = _mint_jwt(nbf_offset=120, aud="experiencebridge-api")
    wrong_issuer_token = _mint_jwt(
        iss="https://evil.clerk.accounts.dev",
        aud="experiencebridge-api",
    )
    wrong_sig_token = _mint_jwt(
        private_key=OTHER_PRIVATE_KEY,
        aud="experiencebridge-api",
    )
    wrong_azp_token = _mint_jwt(
        azp="https://malicious.example.com",
        aud="experiencebridge-api",
    )
    wrong_aud_token = _mint_jwt(
        azp="http://localhost:3000",
        aud="wrong-audience",
    )
    missing_sub_token = _mint_jwt(
        sub=None,
        aud="experiencebridge-api",
    )
    hs256_token = jwt.encode(
        {
            "iss": TEST_ISSUER,
            "sub": "user_hs256",
            "exp": int(time.time()) + 300,
            "iat": int(time.time()) - 10,
            "aud": "experiencebridge-api",
        },
        "symmetric-secret-at-least-32-bytes-long-for-sha256",
        algorithm="HS256",
    )

    with TestClient(app) as client:
        for bad_token in (
            expired_token,
            future_nbf_token,
            wrong_issuer_token,
            wrong_sig_token,
            wrong_azp_token,
            wrong_aud_token,
            missing_sub_token,
            hs256_token,
            "not-a-valid-jwt",
        ):
            resp = client.get(
                "/api/v1/me",
                headers={"Authorization": f"Bearer {bad_token}"},
            )
            assert resp.status_code == 401
            assert resp.json()["error"]["code"] == "AUTH_REQUIRED"
            assert bad_token not in resp.text


def test_client_cannot_self_grant_roles_via_jwt_claims_or_headers() -> None:
    app, session_factory = _build_test_app_and_session_factory()

    # Attacker embeds elevated role claims inside JWT or HTTP headers/query params
    spoofed_token = _mint_jwt(
        sub="user_spoof_attempt_001",
        extra_claims={
            "role": "platform_admin",
            "roles": ["platform_admin", "student", "mentor_candidate"],
            "effective_contexts": ["admin", "organization", "mentor", "student"],
            "org_role": "org:admin",
        },
    )

    with TestClient(app) as client:
        me_resp = client.get(
            "/api/v1/me?role=platform_admin&context=admin",
            headers={
                "Authorization": f"Bearer {spoofed_token}",
                "X-ExperienceBridge-Role": "platform_admin",
            },
        )
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data["role_grants"] == []
        assert me_data["effective_contexts"] == []

        # Attempting to call a platform_admin route is blocked with 403 FORBIDDEN
        admin_resp = client.get(
            "/api/v1/_test/admin-only",
            headers={"Authorization": f"Bearer {spoofed_token}"},
        )
        assert admin_resp.status_code == 403
        assert admin_resp.json()["error"]["code"] == "FORBIDDEN"

        # Now grant "student" and "platform_admin" in the database (server-side only)
        with session_factory() as db:
            user = db.query(User).filter_by(identity_subject="user_spoof_attempt_001").one()
            db.add(UserRoleGrant(user_id=user.id, role="student", reason="Approved onboarding"))
            admin_grant = UserRoleGrant(
                user_id=user.id,
                role="platform_admin",
                reason="D1 human operator grant",
            )
            db.add(admin_grant)
            db.commit()
            admin_grant_id = admin_grant.id

        me_after_grant = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {spoofed_token}"},
        )
        assert me_after_grant.status_code == 200
        granted_data = me_after_grant.json()
        assert granted_data["role_grants"] == ["student", "platform_admin"]
        assert granted_data["effective_contexts"] == [
            "student",
            "admin",
        ]

        admin_allowed = client.get(
            "/api/v1/_test/admin-only",
            headers={"Authorization": f"Bearer {spoofed_token}"},
        )
        assert admin_allowed.status_code == 200
        assert admin_allowed.json()["admin_user_id"] == granted_data["id"]

        # Revoking the platform_admin grant immediately removes admin access
        with session_factory() as db:
            grant_to_revoke = db.get(UserRoleGrant, admin_grant_id)
            assert grant_to_revoke is not None
            grant_to_revoke.revoked_at = datetime.now(timezone.utc)
            db.commit()

        me_after_revoke = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {spoofed_token}"},
        )
        assert me_after_revoke.status_code == 200
        assert me_after_revoke.json()["role_grants"] == ["student"]
        assert me_after_revoke.json()["effective_contexts"] == ["student"]

        admin_revoked = client.get(
            "/api/v1/_test/admin-only",
            headers={"Authorization": f"Bearer {spoofed_token}"},
        )
        assert admin_revoked.status_code == 403


def test_suspended_user_is_rejected_with_403() -> None:
    app, session_factory = _build_test_app_and_session_factory()
    token = _mint_jwt(sub="user_suspended_001")

    with TestClient(app) as client:
        first = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
        assert first.status_code == 200

        with session_factory() as db:
            user = db.query(User).filter_by(identity_subject="user_suspended_001").one()
            user.account_status = "suspended"
            db.commit()

        second = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
        assert second.status_code == 403
        assert second.json()["error"]["code"] == "FORBIDDEN"


def test_live_neon_development_identity_tables_migrated() -> None:
    """Verify users and user_role_grants tables exist on the Neon development database."""
    import pytest
    from sqlalchemy import inspect, text

    from app.core.config import DEFAULT_DEV_ENV_FILE, load_settings
    from app.database.session import create_db_engine

    if not DEFAULT_DEV_ENV_FILE.is_file():
        pytest.skip("Local Neon development .env.development.local is not present.")

    dev_settings = load_settings(
        env_file=DEFAULT_DEV_ENV_FILE,
        overrides={"app_env": "development", "neon_branch": "development"},
    )
    engine = create_db_engine(dev_settings)
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            tables = set(inspector.get_table_names(schema="public"))
            assert "users" in tables
            assert "user_role_grants" in tables
            assert "alembic_version" in tables

            version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            assert version == "20261026_0001"
    finally:
        engine.dispose()

