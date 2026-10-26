"""Compatibility entry point for local Uvicorn startup and Vercel serverless deployment."""

from __future__ import annotations

from app.main import app, create_app, health_check

__all__ = ["app", "create_app", "health_check"]
