"""Real cookie-authenticated workflow fixtures on explicitly verified staging.

Every test owns one transaction that is rolled back, including session and rate
limit writes. Never use this helper with an unverified or production database.
"""
import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from urllib.parse import urlsplit

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import Settings, normalize_sqlalchemy_postgres_url
from app.database.session import get_db
from app.identity.auth_config import AuthConfig
from app.identity.auth_email import DevelopmentMailer
from app.identity.auth_repository import create_session
from app.identity.models import User
from app.identity.password_models import PasswordCredential
from app.identity.password_security import hash_password
from app.main import create_app

ORIGIN = "https://frontend.example.invalid"
PASSWORD = "synthetic workflow password"


class SyntheticActor(dict):
    def __repr__(self):
        return "<synthetic actor; session values redacted>"


@pytest.fixture
def staging_workflow():
    url = os.environ.get("EB_AUTH_STAGING_TEST_URL", "")
    if not ((urlsplit(url).hostname or "").startswith("ep-ancient-truth-zavsgzpz-pooler.") and (urlsplit(url).hostname or "").endswith(".aws.neon.tech")):
        pytest.fail("A verified Neon staging pooled connection is required for workflow tests")
    engine = create_engine(normalize_sqlalchemy_postgres_url(url), poolclass=NullPool, hide_parameters=True)
    with engine.connect() as connection:
        outer = connection.begin()
        sessions = sessionmaker(bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint")

        def make_app():
            app = create_app(Settings(_env_file=None, APP_ENV="test", NEON_BRANCH="test"))
            app.state.auth_config = AuthConfig("test", ORIGIN, "https://identity.example.invalid", "synthetic-secret-32-bytes-minimum", None, None)
            app.state.auth_mailer = DevelopmentMailer()
            app.state.test_sessions = sessions

            def database():
                with sessions() as db:
                    yield db

            app.dependency_overrides[get_db] = database
            return app

        try:
            yield sessions, make_app
        finally:
            outer.rollback()
    engine.dispose()


def activate(client, actor):
    client.cookies.clear()
    for name, value in actor["cookies"].items():
        client.cookies.set(name, value, domain="frontend.example.invalid", path="/")
    client.headers["Origin"] = ORIGIN
    client.headers["X-CSRF-Token"] = actor["csrf"]


def register_actor(client, name):
    client.cookies.clear()
    client.headers["Origin"] = ORIGIN
    email = f"eb-workflow-{name}-{uuid.uuid4().hex}@example.invalid"
    with client.app.state.test_sessions() as db:
        user = User(identity_issuer="https://identity.example.invalid", identity_subject=uuid.uuid4().hex,
                    display_name=f"Synthetic {name}", email=email, email_verified_at=datetime.now(timezone.utc), account_status="active")
        db.add(user)
        db.flush()
        now = datetime.now(timezone.utc)
        db.add(PasswordCredential(user_id=user.id, normalized_email=email, password_hash=fixture_password_hash(), created_at=now, updated_at=now))
        token = create_session(db, user.id)
        db.commit()
    client.cookies.set("__Host-eb_session", token, domain="frontend.example.invalid", path="/")
    client.headers["X-CSRF-Token"] = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    response = client.get("/api/v1/me")
    assert response.status_code == 200, response.text
    return SyntheticActor(id=response.json()["id"], email=email, cookies=dict(client.cookies), csrf=client.headers["X-CSRF-Token"])


@lru_cache(maxsize=1)
def fixture_password_hash():
    return hash_password(PASSWORD)
