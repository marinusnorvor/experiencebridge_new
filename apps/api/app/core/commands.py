"""Transactional commands with durable replay and attributed audit; no auth bypass."""

import hashlib
import json
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.errors import AppError
from app.database.base import Base
from app.identity.models import User
from app.organizations.models import Record


class AuditEvent(Record, Base):
    __tablename__ = "audit_events"
    actor_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[uuid.UUID]
    request_id: Mapped[str] = mapped_column(String(64))
    details: Mapped[dict] = mapped_column(JSON)


class CommandReceipt(Record, Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (UniqueConstraint("actor_user_id", "path", "key_hash"),)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    path: Mapped[str] = mapped_column(String(240))
    key_hash: Mapped[str] = mapped_column(String(64))
    request_hash: Mapped[str] = mapped_column(String(64))
    response_body: Mapped[dict] = mapped_column(JSON)


def fail(code: str, message: str, status: int = 409):
    raise AppError(status_code=status, code=code, message=message)


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def digest(value) -> str:
    return hashlib.sha256(json.dumps(jsonable_encoder(value), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def precondition(request: Request, record):
    token = request.headers.get("If-Match")
    if token is None:
        fail("PRECONDITION_REQUIRED", "Send the current resource ETag in If-Match.", 428)
    if token != f'"{record.row_version}"':
        fail("STALE_VERSION", "Refresh the resource before making this change.", 412)


def execute(db: Session, user: User, request: Request, body, authorize: Callable, action: Callable):
    key = request.headers.get("Idempotency-Key", "")
    if not 16 <= len(key) <= 128 or not key.isascii() or not key.isprintable():
        fail("VALIDATION_ERROR", "Idempotency-Key must contain 16–128 printable ASCII characters.", 422)
    # Serializes this actor's commands, including simultaneous first requests for a key.
    db.execute(select(User).where(User.id == user.id).with_for_update()).scalar_one()
    authorize()  # Always recheck resource permissions, even when replaying a receipt.
    path = f"{request.method} {request.url.path}"
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    fingerprint = digest({"body": body, "if_match": request.headers.get("If-Match")})
    receipt = db.scalar(select(CommandReceipt).where(
        CommandReceipt.actor_user_id == user.id, CommandReceipt.path == path,
        CommandReceipt.key_hash == key_hash,
    ))
    if receipt:
        if receipt.request_hash != fingerprint:
            fail("IDEMPOTENCY_CONFLICT", "This key was already used for a different request.")
        return receipt.response_body
    result = jsonable_encoder(action())
    db.add(CommandReceipt(actor_user_id=user.id, path=path, key_hash=key_hash,
                          request_hash=fingerprint, response_body=result))
    db.commit()
    return result


def audit(db: Session, user: User, request: Request, event: str, record, **details):
    db.add(AuditEvent(actor_user_id=user.id, event_type=event, entity_id=record.id,
                      request_id=request.state.request_id, details=details))
