"""Opt-in staging schema checks. Each synthetic write is rolled back, never table-wide cleaned."""
from datetime import datetime, timedelta, timezone
import os
import uuid
from urllib.parse import urlsplit

import pytest
from sqlalchemy import create_engine, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import Session

from app.core.config import normalize_sqlalchemy_postgres_url
from app.identity.models import User
from app.identity.password_models import AuthCsrfContext, AuthRateLimit, AuthSession, AuthToken, PasswordCredential
from app.identity.password_security import hash_password, new_token, token_digest
from app.identity.auth_repository import check_csrf_context, consume_action_token, create_session, increment_rate_limit, issue_action_token, issue_csrf_context, resolve_session, revoke_user_sessions
from app.identity.auth_accounts import authenticate, register_account, reset_password, verify_email


def test_staging_auth_schema_transactionally():
    url = os.environ.get("EB_AUTH_STAGING_TEST_URL")
    expected_endpoint = os.environ.get("EB_AUTH_STAGING_ENDPOINT")
    if not url or not expected_endpoint:
        pytest.skip("Explicit verified staging connection not provided")
    host = urlsplit(url).hostname or ""
    if not host.startswith(expected_endpoint + "-pooler.") or not host.endswith(".aws.neon.tech") or expected_endpoint != "ep-ancient-truth-zavsgzpz":
        pytest.fail("Refusing a connection other than the explicitly verified staging pooled endpoint")
    engine = create_engine(normalize_sqlalchemy_postgres_url(url), poolclass=NullPool, hide_parameters=True)
    now = datetime.now(timezone.utc)
    user_id = uuid.uuid4()
    email = f"eb-auth-test-{user_id.hex}@example.invalid"
    session_hash, token_hash, csrf_hash = (token_digest(new_token()) for _ in range(3))
    try:
        with engine.connect() as conn:
            transaction = conn.begin()
            try:
                conn.execute(insert(User).values(id=user_id, identity_issuer="https://synthetic.example.invalid", identity_subject=user_id.hex, display_name="Synthetic auth test", email=email, account_status="active", created_at=now, updated_at=now, row_version=1))
                conn.execute(insert(PasswordCredential).values(user_id=user_id, normalized_email=email, password_hash=hash_password("synthetic test password"), created_at=now, updated_at=now))
                conn.execute(insert(AuthSession).values(token_hash=session_hash, user_id=user_id, created_at=now, last_seen_at=now, expires_at=now + timedelta(hours=1)))
                conn.execute(insert(AuthToken).values(token_hash=token_hash, user_id=user_id, purpose="verify_email", created_at=now, expires_at=now + timedelta(hours=1)))
                conn.execute(insert(AuthCsrfContext).values(context_hash=csrf_hash, csrf_hash=token_digest(new_token()), session_hash=session_hash, expires_at=now + timedelta(minutes=30)))
                conn.execute(insert(AuthRateLimit).values(id=uuid.uuid4(), bucket_key=token_digest(new_token()), window_start=now, expires_at=now + timedelta(hours=1), count=1))
                assert conn.execute(select(PasswordCredential.normalized_email).where(PasswordCredential.user_id == user_id)).scalar_one() == email
                other_id = uuid.uuid4()
                conn.execute(insert(User).values(id=other_id, identity_issuer="https://synthetic.example.invalid", identity_subject=other_id.hex, display_name="Synthetic duplicate test", email=f"eb-auth-test-{other_id.hex}@example.invalid", account_status="active", created_at=now, updated_at=now, row_version=1))
                with pytest.raises(IntegrityError), conn.begin_nested():
                    conn.execute(insert(PasswordCredential).values(user_id=other_id, normalized_email=email, password_hash="test-only", created_at=now, updated_at=now))
                # The ORM uses the same outer transaction; rollback leaves no rows.
                conn.execute(User.__table__.update().where(User.id == user_id).values(email_verified_at=now))
                with Session(bind=conn, join_transaction_mode="create_savepoint") as db:
                    raw_session = create_session(db, user_id, now)
                    assert resolve_session(db, raw_session, now).id == user_id
                    assert resolve_session(db, raw_session, now + timedelta(minutes=31)) is None
                    assert resolve_session(db, raw_session, now + timedelta(hours=25)) is None
                    context, csrf = issue_csrf_context(db, raw_session, now)
                    assert check_csrf_context(db, context, csrf, raw_session, now)
                    assert not check_csrf_context(db, context, csrf, None, now)
                    action = issue_action_token(db, user_id, "reset_password", now)
                    assert consume_action_token(db, action, "verify_email", now) is None
                    assert consume_action_token(db, action, "reset_password", now) == user_id
                    assert consume_action_token(db, action, "reset_password", now) is None
                    expiring = issue_action_token(db, user_id, "reset_password", now)
                    assert consume_action_token(db, expiring, "reset_password", now + timedelta(minutes=31)) is None
                    expired_verification = issue_action_token(db, user_id, "verify_email", now)
                    assert consume_action_token(db, expired_verification, "verify_email", now + timedelta(hours=25)) is None
                    changed_email_token = issue_action_token(db, user_id, "reset_password", now)
                    actor_for_email_change = db.get(User, user_id)
                    actor_for_email_change.email = f"eb-auth-test-changed-{user_id.hex}@example.invalid"
                    db.flush()
                    assert consume_action_token(db, changed_email_token, "reset_password", now) is None
                    actor_for_email_change.email = email
                    db.flush()
                    assert increment_rate_limit(db, secret="synthetic secret", scope="test", identity=user_id.hex, window_seconds=900, now=now) == 1
                    assert increment_rate_limit(db, secret="synthetic secret", scope="test", identity=user_id.hex, window_seconds=900, now=now) == 2
                    revoke_user_sessions(db, user_id, now)
                    assert resolve_session(db, raw_session, now) is None
                    new_email = f"eb-auth-test-new-{uuid.uuid4().hex}@example.invalid"
                    delivery = register_account(db, email=new_email, password="a synthetic test password", display_name="Synthetic New User", issuer="https://synthetic.example.invalid")
                    assert delivery is None
                    dummy_hash = hash_password("a synthetic dummy password")
                    actor = authenticate(db, email=new_email, password="a synthetic test password", dummy_hash=dummy_hash)
                    assert actor is not None
                    assert register_account(db, email=new_email, password="another synthetic password", display_name="Duplicate", issuer="https://synthetic.example.invalid") is None
                    legacy_delivery = register_account(db, email=email, password="attacker chosen password", display_name="Legacy", issuer="https://synthetic.example.invalid")
                    assert legacy_delivery is None  # Existing local credential cannot be replaced through registration.
                    legacy_email = f"eb-auth-test-legacy-{uuid.uuid4().hex}@example.invalid"
                    legacy_id = uuid.uuid4()
                    db.add(User(id=legacy_id, identity_issuer="https://clerk.synthetic.example.invalid", identity_subject=str(uuid.uuid4()), display_name="Synthetic Legacy", email=legacy_email, email_verified_at=now, account_status="active", created_at=now, updated_at=now, row_version=1))
                    db.flush()
                    legacy_delivery = register_account(db, email=legacy_email, password="attacker chosen password", display_name="Legacy", issuer="https://synthetic.example.invalid")
                    assert legacy_delivery is not None and legacy_delivery[1] == "reset-password"
                    assert authenticate(db, email=legacy_email, password="attacker chosen password", dummy_hash=dummy_hash) is None
                    assert reset_password(db, legacy_delivery[2], "owner selected password")
                    linked = authenticate(db, email=legacy_email, password="owner selected password", dummy_hash=dummy_hash)
                    assert linked is not None and linked.id == legacy_id
            finally:
                transaction.rollback()
    finally:
        engine.dispose()
