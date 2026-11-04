"""Offline preflight using the runtime Settings contract; never connects to a database."""

from __future__ import annotations

import argparse
from pathlib import Path

from pydantic import ValidationError

from app.core.config import Settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, help="Explicit ignored environment file; process environment takes precedence.")
    args = parser.parse_args(argv)
    if args.env_file is not None and not args.env_file.is_file():
        print("Configuration check failed: environment file does not exist.")
        return 1
    try:
        settings = Settings(_env_file=args.env_file, _env_file_encoding="utf-8")
    except ValidationError as exc:
        # Pydantic's normal exception representation can contain raw input values.
        fields = sorted({".".join(map(str, item["loc"])) or "settings" for item in exc.errors(include_input=False)})
        print("Configuration check failed: invalid " + ", ".join(fields) + ". Values withheld.")
        return 1
    missing = [name for name, value in (
        ("DATABASE_URL", settings.database_url),
        ("CLERK_ISSUER_URL", settings.clerk_issuer_url),
        ("CLERK_JWKS_URL", settings.clerk_jwks_url),
        ("CLERK_AUTHORIZED_PARTIES", settings.effective_clerk_authorized_parties),
    ) if not value]
    if missing:
        print("Configuration check failed: missing " + ", ".join(missing) + ".")
        return 1
    print(f"Configuration valid: APP_ENV={settings.app_env}, NEON_BRANCH={settings.neon_branch}. No network or database checks performed.")
    if settings.app_env not in {"development", "test"}:
        print("Synthetic supervisor workflows remain disabled in this environment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
