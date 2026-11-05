"""Offline preflight using the runtime Settings contract; never connects to a database."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import dotenv_values
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
    ) if not value]
    if missing:
        print("Configuration check failed: missing " + ", ".join(missing) + ".")
        return 1
    from app.identity.auth_config import AuthConfig
    file_values = dotenv_values(args.env_file) if args.env_file is not None else {}
    for key, value in file_values.items():
        if value is not None and key not in os.environ:
            os.environ[key] = value
    try:
        AuthConfig.from_environment(settings.app_env)
    except ValueError as exc:
        print("Configuration check failed: " + str(exc))
        return 1
    print(f"Configuration valid: APP_ENV={settings.app_env}, NEON_BRANCH={settings.neon_branch}. No network or database checks performed.")
    if settings.build_demo_workflows:
        print("EB_BUILD_DEMO_WORKFLOWS=true: synthetic demo workflows are ENABLED in this environment.")
    elif settings.app_env not in {"development", "test"}:
        print("Synthetic supervisor workflows remain disabled in this environment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
