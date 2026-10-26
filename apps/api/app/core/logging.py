"""Structured logging with automatic credential and secret redaction."""

from __future__ import annotations

import logging
import re

_POSTGRES_URL_PATTERN = re.compile(
    r"(postgres(?:ql(?:\+psycopg)?)?://)([^:\s/@]+):([^@\s]+)@([^\s/'\"]+)",
    re.IGNORECASE,
)
_BEARER_PATTERN = re.compile(r"(Bearer\s+)[A-Za-z0-9._\-~+/]+=*", re.IGNORECASE)
_PASSWORD_KV_PATTERN = re.compile(
    r"((?:password|passwd|secret|token|database_url|database_url_unpooled)\s*[=:]\s*)([^\s,;'\"]+)",
    re.IGNORECASE,
)


def scrub_sensitive_text(text: str) -> str:
    """Redact database credentials, URLs, and bearer tokens from text."""
    if not text:
        return text
    scrubbed = _POSTGRES_URL_PATTERN.sub(r"\1***:***@\4", text)
    scrubbed = _BEARER_PATTERN.sub(r"\1[REDACTED]", scrubbed)
    scrubbed = _PASSWORD_KV_PATTERN.sub(r"\1[REDACTED]", scrubbed)
    return scrubbed


class CredentialRedactingFilter(logging.Filter):
    """Logging filter that guarantees credentials are redacted before emission."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = scrub_sensitive_text(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: scrub_sensitive_text(v) if isinstance(v, str) else v
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    scrub_sensitive_text(arg) if isinstance(arg, str) else arg
                    for arg in record.args
                )
        return True


def configure_logging(level: str = "INFO") -> logging.Logger:
    """Configure the application logger with credential redaction."""
    logger = logging.getLogger("experiencebridge.api")
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(numeric_level)

    if not any(isinstance(f, CredentialRedactingFilter) for f in logger.filters):
        logger.addFilter(CredentialRedactingFilter())

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(numeric_level)
        handler.addFilter(CredentialRedactingFilter())
        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    else:
        for handler in logger.handlers:
            handler.setLevel(numeric_level)
            if not any(isinstance(f, CredentialRedactingFilter) for f in handler.filters):
                handler.addFilter(CredentialRedactingFilter())

    return logger
