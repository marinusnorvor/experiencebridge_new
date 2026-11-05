"""Concurrent synthetic registration; cleanup is restricted to the generated identity."""
from concurrent.futures import ThreadPoolExecutor
import os
from urllib.parse import urlsplit
import uuid

import pytest
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import normalize_sqlalchemy_postgres_url
from app.identity.auth_accounts import register_account
from app.identity.models import User
from app.identity.password_models import AuthToken, PasswordCredential


def test_simultaneous_registration_creates_only_one_identity():
    url = os.environ.get("EB_AUTH_STAGING_TEST_URL")
    if not url:
        pytest.skip("Explicit verified staging connection not provided")
    if not ((urlsplit(url).hostname or "").startswith("ep-ancient-truth-zavsgzpz-pooler.") and (urlsplit(url).hostname or "").endswith(".aws.neon.tech")):
        pytest.fail("Refusing a connection other than the verified staging pooled endpoint")
    engine = create_engine(normalize_sqlalchemy_postgres_url(url), poolclass=NullPool, hide_parameters=True)
    email = f"eb-auth-concurrency-{uuid.uuid4().hex}@example.invalid"
    issuer = "https://synthetic.example.invalid"
    def attempt():
        with Session(engine) as db, db.begin():
            return register_account(db, email=email, password="a synthetic test password", display_name="Synthetic concurrency test", issuer=issuer)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: attempt(), range(2)))
        with Session(engine) as db:
            ids = list(db.scalars(select(User.id).where(User.email == email, User.identity_issuer == issuer)))
            assert len(ids) == 1
            creds = list(db.scalars(select(PasswordCredential.user_id).where(PasswordCredential.normalized_email == email)))
            assert len(creds) == 1
    finally:
        with Session(engine) as db, db.begin():
            ids = list(db.scalars(select(User.id).where(User.email == email, User.identity_issuer == issuer)))
            if ids:
                db.execute(delete(AuthToken).where(AuthToken.user_id.in_(ids)))
                db.execute(delete(PasswordCredential).where(PasswordCredential.user_id.in_(ids), PasswordCredential.normalized_email == email))
                db.execute(delete(User).where(User.id.in_(ids), User.email == email, User.identity_issuer == issuer))
        engine.dispose()
