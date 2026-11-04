"""Standardized API error envelope, request correlation IDs, and safe exception handlers."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import scrub_sensitive_text

logger = logging.getLogger("experiencebridge.api")

STATUS_CODE_TO_ERROR_CODE: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "AUTH_REQUIRED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "INVALID_STATE",
    status.HTTP_412_PRECONDITION_FAILED: "STALE_VERSION",
    status.HTTP_413_CONTENT_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    status.HTTP_422_UNPROCESSABLE_CONTENT: "VALIDATION_ERROR",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
    status.HTTP_503_SERVICE_UNAVAILABLE: "TEMPORARY_UNAVAILABLE",
}


class AppError(Exception):
    """Domain/application exception mapped to the standard ExperienceBridge error envelope."""

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        field_errors: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = field_errors


def get_request_id(request: Request) -> str:
    """Return the correlation ID attached to the current request."""
    existing = getattr(request.state, "request_id", None)
    if isinstance(existing, str) and existing:
        return existing
    header_id = request.headers.get("X-Request-ID", "").strip()
    if header_id and len(header_id) <= 64 and header_id.isprintable():
        request_id = header_id
    else:
        request_id = f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    return request_id


def build_error_response(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    field_errors: dict[str, list[str]] | None = None,
) -> JSONResponse:
    """Build a JSONResponse adhering to docs/03-database-api.md §1.2 and §9."""
    request_id = get_request_id(request)
    error_body: dict[str, Any] = {
        "code": code,
        "message": scrub_sensitive_text(message),
    }
    if field_errors:
        error_body["field_errors"] = field_errors

    headers: dict[str, str] = {"X-Request-ID": request_id}
    if status_code == status.HTTP_401_UNAUTHORIZED:
        headers["WWW-Authenticate"] = "Bearer"

    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_body,
            "request_id": request_id,
        },
        headers=headers,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register request-ID middleware and safe exception handlers on the FastAPI app."""

    @app.middleware("http")
    async def request_correlation_middleware(request: Request, call_next):
        request_id = get_request_id(request)
        response = await call_next(request)
        response.headers.setdefault("X-Request-ID", request_id)
        return response

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return build_error_response(
            request=request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            field_errors=exc.field_errors,
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = STATUS_CODE_TO_ERROR_CODE.get(exc.status_code, "HTTP_ERROR")
        detail = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."
        return build_error_response(
            request=request,
            status_code=exc.status_code,
            code=code,
            message=detail,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        field_errors: dict[str, list[str]] = {}
        for err in exc.errors():
            loc_parts = [str(part) for part in err.get("loc", ()) if part != "body"]
            field_key = ".".join(loc_parts) if loc_parts else "request"
            msg = scrub_sensitive_text(str(err.get("msg", "Invalid value.")))
            field_errors.setdefault(field_key, []).append(msg)

        return build_error_response(
            request=request,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="VALIDATION_ERROR",
            message="Submitted request data failed validation.",
            field_errors=field_errors,
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(
        request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        request_id = get_request_id(request)
        orig_err = getattr(exc, "orig", None)
        orig_msg = str(orig_err) if orig_err is not None else ""
        err_msg = str(exc)
        logger.error(
            "Database operation failed [request_id=%s]: %s: %s (driver: %s)",
            request_id,
            exc.__class__.__name__,
            scrub_sensitive_text(err_msg),
            scrub_sensitive_text(orig_msg),
        )
        return build_error_response(
            request=request,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="TEMPORARY_UNAVAILABLE",
            message="A database service error occurred. Please retry later.",
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        request_id = get_request_id(request)
        logger.error(
            "Unhandled application error [request_id=%s]: %s",
            request_id,
            scrub_sensitive_text(str(exc.__class__.__name__)),
        )
        return build_error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="An unexpected internal error occurred.",
        )
