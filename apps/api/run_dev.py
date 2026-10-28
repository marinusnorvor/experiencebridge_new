"""Start the local API with development-only Neon credentials."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

API_DIR = Path(__file__).resolve().parent
ENV_FILE = API_DIR / ".env.development.local"
EXPECTED_ROLE = "experiencebridge_development"
ALLOWED_SCHEMES = {"postgres", "postgresql", "postgresql+psycopg"}


def read_environment(env_file: Path = ENV_FILE) -> dict[str, str]:
    """Read and validate the local development-only Neon environment file."""
    if not env_file.is_file():
        raise SystemExit(
            "Missing apps/api/.env.development.local. Copy "
            ".env.development.example and fill it with the development branch URL."
        )

    values: dict[str, str] = {}
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator:
            raise SystemExit("Invalid line in .env.development.local.")
        values[key.strip()] = value.strip().strip('"').strip("'")

    if values.get("NEON_BRANCH") != "development":
        raise SystemExit("Local API startup requires NEON_BRANCH=development.")

    app_env = values.get("APP_ENV", "development").lower()
    if app_env != "development":
        raise SystemExit("Local API startup requires APP_ENV=development.")

    database_url = values.get("DATABASE_URL", "")
    parsed = urlsplit(database_url)
    role = unquote(parsed.username or "")
    if parsed.scheme.lower() not in ALLOWED_SCHEMES or role != EXPECTED_ROLE:
        raise SystemExit("Local API startup requires the development-only database role.")
    if not parsed.hostname or "-pooler." not in parsed.hostname:
        raise SystemExit("Local API startup requires the pooled development endpoint.")

    return values


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Start the local ExperienceBridge FastAPI server.")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate configuration and run a read-only Neon development connectivity check without starting Uvicorn.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Local Uvicorn port (default: 8000).",
    )
    args = parser.parse_args(argv)

    values = read_environment()
    environment = os.environ.copy()
    environment.update(values)
    environment["APP_ENV"] = "development"
    environment["NEON_BRANCH"] = "development"

    if args.check_only:
        sys.path.insert(0, str(API_DIR))
        os.environ.update(
            {
                "APP_ENV": "development",
                "NEON_BRANCH": "development",
                "DATABASE_URL": values["DATABASE_URL"],
            }
        )
        from app.core.config import clear_settings_cache, load_settings
        from app.database.connectivity import verify_database_connectivity

        clear_settings_cache()
        settings = load_settings(env_file=ENV_FILE)
        result = verify_database_connectivity(settings=settings)
        if not result.ok:
            print(
                f"Database connectivity check failed [env={result.environment}, branch={result.neon_branch}]: {result.error}",
                file=sys.stderr,
            )
            return 1
        print(
            f"Database connectivity verified: env={result.environment} "
            f"branch={result.neon_branch} db={result.database_name} "
            f"role={result.database_role} read_only={result.read_only} "
            f"pool={result.pool_class} latency_ms={result.latency_ms}"
        )
        return 0

    return subprocess.call(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--app-dir",
            str(API_DIR),
            "--reload",
            "--port",
            str(args.port),
        ],
        cwd=API_DIR,
        env=environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
