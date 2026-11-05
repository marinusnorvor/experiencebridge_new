"""Environment-based settings with validation and secure credential handling."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import parse_qs, unquote, urlsplit, urlunsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

AppEnvironment = Literal["development", "test", "staging", "production"]
NeonBranchName = Literal["development", "test", "staging", "production"]
DatabasePoolMode = Literal["auto", "null", "queue"]
LogLevelName = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

API_ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DEV_ENV_FILE = API_ROOT_DIR / ".env.development.local"

ALLOWED_POSTGRES_SCHEMES = {
    "postgres",
    "postgresql",
    "postgresql+psycopg",
}
REQUIRED_SSL_MODES = {"require", "verify-ca", "verify-full"}
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
EXPECTED_DEVELOPMENT_ROLE = "experiencebridge_development"


def redact_database_url(raw_url: str | SecretStr | None) -> str:
    """Return a sanitized representation of a database URL with credentials removed."""
    if raw_url is None:
        return "<unconfigured>"
    value = raw_url.get_secret_value() if isinstance(raw_url, SecretStr) else str(raw_url)
    value = value.strip()
    if not value:
        return "<empty>"
    try:
        parsed = urlsplit(value)
        if not parsed.scheme or not parsed.hostname:
            return "<redacted-db-url>"
        db_name = parsed.path.lstrip("/") or "<db>"
        return f"postgresql+psycopg://***:***@{parsed.hostname}/{db_name}"
    except Exception:
        return "<redacted-db-url>"


def normalize_sqlalchemy_postgres_url(raw_url: str | SecretStr) -> str:
    """Normalize a PostgreSQL URL to use SQLAlchemy 2.x with psycopg 3 driver."""
    value = raw_url.get_secret_value() if isinstance(raw_url, SecretStr) else str(raw_url)
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Database URL must not be empty.")

    if "<password>" in cleaned or "<development-" in cleaned or "<staging-" in cleaned or "<production-" in cleaned:
        raise ValueError("Database URL contains placeholder values; provide a real branch connection URL.")

    parsed = urlsplit(cleaned)
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_POSTGRES_SCHEMES:
        raise ValueError(
            "Database URL must use a PostgreSQL scheme (postgres://, postgresql://, or postgresql+psycopg://)."
        )
    if not parsed.hostname:
        raise ValueError("Database URL must include a valid database hostname.")
    database_name = parsed.path.lstrip("/")
    if not database_name:
        raise ValueError("Database URL must include a database name in the path.")

    return urlunsplit(
        (
            "postgresql+psycopg",
            parsed.netloc,
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


def validate_database_url_safety(
    raw_url: str | SecretStr,
    *,
    app_env: AppEnvironment,
    neon_branch: NeonBranchName,
    is_unpooled: bool = False,
) -> None:
    """Validate SSL, pooling, and environment/branch isolation rules for a database URL."""
    normalized = normalize_sqlalchemy_postgres_url(raw_url)
    parsed = urlsplit(normalized)
    hostname = (parsed.hostname or "").lower()
    username = unquote(parsed.username or "").lower()
    query_params = parse_qs(parsed.query, keep_blank_values=True)
    # libpq/SQLAlchemy query arguments can override the authority we validate above.
    # Require one unambiguous target in the URL rather than validating a decoy host.
    if parsed.fragment or any(len(values) != 1 for values in query_params.values()):
        raise ValueError("Database URLs must not contain fragments or repeated query parameters.")
    target_overrides = {"host", "hostaddr", "port", "user", "password", "dbname", "database", "service", "servicefile"}
    if target_overrides.intersection(query_params):
        raise ValueError("Database target and credentials must be specified in the URL authority/path, not query parameters.")
    sslmode_values = query_params.get("sslmode", [])

    is_local_host = hostname in LOCAL_HOSTS

    if not is_local_host:
        if not sslmode_values or sslmode_values[0] not in REQUIRED_SSL_MODES:
            raise ValueError(
                "Remote/Neon database connections require sslmode=require (or verify-ca / verify-full)."
            )

    if app_env in {"development", "test"} or neon_branch in {"development", "test"}:
        if "production" in username or username.endswith("_prod") or username == "prod":
            raise ValueError(
                "Refusing to use a production database role in development or test environment."
            )
        if "staging" in username:
            raise ValueError(
                "Refusing to use a staging database role in development or test environment."
            )
        if "prod" in hostname.split(".")[0].split("-"):
            raise ValueError(
                "Refusing to connect to a production database host in development or test environment."
            )

    if app_env == "development" and neon_branch == "development" and not is_local_host:
        if username != EXPECTED_DEVELOPMENT_ROLE:
            raise ValueError(
                f"Local development with Neon requires database role '{EXPECTED_DEVELOPMENT_ROLE}'."
            )
        if not is_unpooled and "-pooler." not in hostname:
            raise ValueError(
                "Runtime DATABASE_URL for Neon development must use the pooled (-pooler) endpoint."
            )

    if is_unpooled and "-pooler." in hostname:
        raise ValueError(
            "DATABASE_URL_UNPOOLED must use a direct (non-pooler) Neon connection string for migrations."
        )


def _parse_origin_list(value: Any, *, setting_name: str, default: list[str] | None = None) -> list[str]:
    if value is None:
        return list(default) if default is not None else []
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("["):
            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                raise ValueError(f"{setting_name} JSON value must be a list.")
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    if isinstance(value, (list, tuple, set)):
        return [str(origin).strip() for origin in value if str(origin).strip()]
    raise ValueError(f"Invalid {setting_name} format.")


class Settings(BaseSettings):
    """Typed, validated application settings with environment isolation."""

    model_config = SettingsConfigDict(
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
        hide_input_in_errors=True,
    )

    app_name: str = Field(default="ExperienceBridge API", validation_alias="APP_NAME")
    app_service: str = Field(default="experiencebridge-api", validation_alias="APP_SERVICE")
    app_version: str = Field(default="0.1.0", validation_alias="APP_VERSION")
    app_description: str = Field(
        default="Backend API for the ExperienceBridge platform",
        validation_alias="APP_DESCRIPTION",
    )

    app_env: AppEnvironment = Field(default="development", validation_alias="APP_ENV")
    neon_branch: NeonBranchName = Field(default="development", validation_alias="NEON_BRANCH")

    database_url: SecretStr | None = Field(default=None, validation_alias="DATABASE_URL")
    database_url_unpooled: SecretStr | None = Field(
        default=None,
        validation_alias="DATABASE_URL_UNPOOLED",
    )

    db_pool_mode: DatabasePoolMode = Field(default="auto", validation_alias="DB_POOL_MODE")
    db_pool_size: int = Field(default=5, ge=1, le=50, validation_alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=10, ge=0, le=50, validation_alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, ge=1, le=120, validation_alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=60, ge=10, le=3600, validation_alias="DB_POOL_RECYCLE")
    db_connect_timeout: int = Field(default=30, ge=1, le=120, validation_alias="DB_CONNECT_TIMEOUT")
    db_statement_timeout_ms: int = Field(
        default=30000,
        ge=1000,
        le=120000,
        validation_alias="DB_STATEMENT_TIMEOUT_MS",
    )

    vercel: bool = Field(default=False, validation_alias="VERCEL")
    vercel_env: str | None = Field(default=None, validation_alias="VERCEL_ENV")

    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias="CORS_ALLOWED_ORIGINS",
    )
    cors_allow_credentials: bool = Field(
        default=True,
        validation_alias="CORS_ALLOW_CREDENTIALS",
    )

    log_level: LogLevelName = Field(default="INFO", validation_alias="LOG_LEVEL")
    docs_enabled: bool = Field(default=True, validation_alias="DOCS_ENABLED")

    super_admin_email: str | None = Field(default=None, validation_alias="SUPER_ADMIN_EMAIL")
    super_admin_password: SecretStr | None = Field(default=None, validation_alias="SUPER_ADMIN_PASSWORD")
    super_admin_name: str = Field(default="Super Administrator", validation_alias="SUPER_ADMIN_NAME")

    @field_validator("app_env", mode="before")
    @classmethod
    def _normalize_app_env(cls, value: Any) -> str:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("neon_branch", mode="before")
    @classmethod
    def _normalize_neon_branch(cls, value: Any) -> str:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalize_log_level(cls, value: Any) -> str:
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: Any) -> list[str]:
        return _parse_origin_list(
            value,
            setting_name="CORS_ALLOWED_ORIGINS",
            default=["http://localhost:3000", "http://127.0.0.1:3000"],
        )

    @model_validator(mode="after")
    def _validate_environment_and_credentials(self) -> Settings:
        # 1. Environment and Neon branch alignment checks
        if self.app_env in {"development", "test"} and self.neon_branch == "production":
            raise ValueError(
                "Local development and test environments must never target NEON_BRANCH=production."
            )
        if self.app_env == "staging" and self.neon_branch == "production":
            raise ValueError(
                "Staging environment must never target NEON_BRANCH=production."
            )
        if self.app_env == "production" and self.neon_branch != "production":
            raise ValueError(
                "Production environment requires NEON_BRANCH=production."
            )

        # 2. CORS validation
        for origin in self.cors_allowed_origins:
            if origin == "*":
                if self.app_env in {"staging", "production"} or self.cors_allow_credentials:
                    raise ValueError(
                        "Wildcard CORS origin '*' is not permitted when credentials are allowed or in staging/production."
                    )
            else:
                parsed_origin = urlsplit(origin)
                if parsed_origin.scheme not in {"http", "https"} or not parsed_origin.netloc:
                    raise ValueError(f"Invalid CORS origin URL: {origin!r}")
                if self.app_env == "production" and parsed_origin.scheme != "https":
                    raise ValueError("Production CORS origins must use https://.")

        # 3. Database URL validation
        if self.database_url is not None and self.database_url.get_secret_value().strip():
            validate_database_url_safety(
                self.database_url,
                app_env=self.app_env,
                neon_branch=self.neon_branch,
                is_unpooled=False,
            )

        if self.database_url_unpooled is not None and self.database_url_unpooled.get_secret_value().strip():
            validate_database_url_safety(
                self.database_url_unpooled,
                app_env=self.app_env,
                neon_branch=self.neon_branch,
                is_unpooled=True,
            )

        # Production origins must be exact HTTPS origins even without an identity provider.
        if self.app_env == "production":
            if not self.cors_allowed_origins:
                raise ValueError("Production requires explicit CORS_ALLOWED_ORIGINS.")
            for origin in self.cors_allowed_origins:
                parsed = urlsplit(origin)
                if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                        or parsed.path or parsed.query or parsed.fragment or "*" in origin):
                    raise ValueError("Production CORS origins must be exact HTTPS origins without paths or credentials.")

        # Password authentication configuration is validated at application startup.

        return self

    @property
    def is_serverless(self) -> bool:
        """Return True when running inside Vercel serverless functions or pooled serverless mode."""
        if self.vercel or bool(self.vercel_env):
            return True
        if self.database_url is not None:
            hostname = urlsplit(self.database_url.get_secret_value()).hostname or ""
            if "-pooler." in hostname:
                return True
        return False

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Return the normalized SQLAlchemy 2.x psycopg 3 URI for runtime connections."""
        if self.database_url is None or not self.database_url.get_secret_value().strip():
            raise ValueError("DATABASE_URL is not configured.")
        return normalize_sqlalchemy_postgres_url(self.database_url)

    @property
    def sqlalchemy_migration_uri(self) -> str:
        """Return the normalized SQLAlchemy URI for Alembic migrations (prefers direct unpooled)."""
        if self.database_url_unpooled is not None and self.database_url_unpooled.get_secret_value().strip():
            return normalize_sqlalchemy_postgres_url(self.database_url_unpooled)
        if self.database_url is not None and self.database_url.get_secret_value().strip():
            return normalize_sqlalchemy_postgres_url(self.database_url)
        raise ValueError("Neither DATABASE_URL_UNPOOLED nor DATABASE_URL is configured for Alembic.")

    @property
    def redacted_database_url(self) -> str:
        """Return a safe, credential-redacted summary of the configured database URL."""
        return redact_database_url(self.database_url)


def load_settings(
    *,
    env_file: Path | str | None = DEFAULT_DEV_ENV_FILE,
    overrides: dict[str, Any] | None = None,
) -> Settings:
    """Load and validate application settings without exposing credentials."""
    effective_env = (
        (overrides or {}).get("app_env")
        or (overrides or {}).get("APP_ENV")
        or os.environ.get("APP_ENV", "development")
    ).strip().lower()

    resolved_env_file: Path | str | None = None
    if env_file is not None and effective_env == "development":
        candidate = Path(env_file)
        if candidate.is_file():
            resolved_env_file = candidate

    kwargs: dict[str, Any] = {}
    if resolved_env_file is not None:
        kwargs["_env_file"] = str(resolved_env_file)
        kwargs["_env_file_encoding"] = "utf-8"
    else:
        kwargs["_env_file"] = None

    if overrides:
        kwargs.update(overrides)

    return Settings(**kwargs)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached runtime settings for the FastAPI application."""
    return load_settings()


def clear_settings_cache() -> None:
    """Clear the cached settings instance (used in automated tests)."""
    get_settings.cache_clear()
