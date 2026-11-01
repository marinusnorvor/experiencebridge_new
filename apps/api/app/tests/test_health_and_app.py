"""Automated tests for /health, Swagger docs, error handling, CORS, and domain modules."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy.exc import OperationalError

from app.api.router import DOMAIN_MODULES
from app.core.config import Settings
from app.core.errors import AppError
from app.database.base import Base
from app.main import create_app


class SampleInput(BaseModel):
    estimated_minutes: int = Field(gt=0)


def _make_test_settings() -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        neon_branch="test",
        cors_allowed_origins=["http://localhost:3000"],
        docs_enabled=True,
    )


def test_health_endpoint_preserves_contract() -> None:
    app = create_app(_make_test_settings())
    with TestClient(app) as client:
        response = client.get("/health", headers={"X-Request-ID": "req_custom_health"})
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "service": "experiencebridge-api",
            "version": "0.1.0",
        }
        assert response.headers.get("X-Request-ID") == "req_custom_health"


def test_swagger_and_openapi_documentation_preserved() -> None:
    app = create_app(_make_test_settings())
    with TestClient(app) as client:
        docs_response = client.get("/docs")
        assert docs_response.status_code == 200
        assert "Swagger UI" in docs_response.text

        openapi_response = client.get("/openapi.json")
        assert openapi_response.status_code == 200
        schema = openapi_response.json()
        assert schema["info"]["title"] == "ExperienceBridge API"
        assert schema["info"]["version"] == "0.1.0"
        assert "/health" in schema["paths"]
        assert "/api/v1/me" in schema["paths"]


def test_no_public_database_diagnostic_endpoint_exposed() -> None:
    app = create_app(_make_test_settings())
    with TestClient(app) as client:
        for path in ("/ready", "/health/db", "/db-health", "/api/v1/health/db", "/diagnostics"):
            response = client.get(path)
            assert response.status_code == 404
            payload = response.json()
            assert payload["error"]["code"] == "NOT_FOUND"
            assert "request_id" in payload


def test_standardized_error_envelope_and_credential_redaction() -> None:
    app = create_app(_make_test_settings())
    test_router = APIRouter()

    @test_router.post("/_test/validate")
    def validate_endpoint(body: SampleInput) -> dict[str, int]:
        return {"estimated_minutes": body.estimated_minutes}

    @test_router.get("/_test/domain-error")
    def domain_error_endpoint() -> None:
        raise AppError(
            status_code=409,
            code="TERMS_CHANGED",
            message="The project terms changed.",
            field_errors={"seen_terms_version_id": ["Latest terms required."]},
        )

    @test_router.get("/_test/db-error")
    def db_error_endpoint() -> None:
        raise OperationalError(
            "SELECT 1",
            {},
            Exception("postgresql://user:leakedPass123@host/db connection refused"),
        )

    app.include_router(test_router)

    with TestClient(app, raise_server_exceptions=False) as client:
        val_resp = client.post("/_test/validate", json={"estimated_minutes": 0})
        assert val_resp.status_code == 422
        val_json = val_resp.json()
        assert val_json["error"]["code"] == "VALIDATION_ERROR"
        assert "estimated_minutes" in val_json["error"]["field_errors"]

        dom_resp = client.get("/_test/domain-error")
        assert dom_resp.status_code == 409
        dom_json = dom_resp.json()
        assert dom_json["error"]["code"] == "TERMS_CHANGED"
        assert dom_json["error"]["field_errors"] == {
            "seen_terms_version_id": ["Latest terms required."]
        }

        db_resp = client.get("/_test/db-error")
        assert db_resp.status_code == 503
        db_json = db_resp.json()
        assert db_json["error"]["code"] == "TEMPORARY_UNAVAILABLE"
        assert "leakedPass123" not in db_resp.text


def test_cors_preflight_allows_configured_origin_and_blocks_unknown() -> None:
    app = create_app(_make_test_settings())
    with TestClient(app) as client:
        allowed = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert allowed.status_code == 200
        assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"

        disallowed = client.options(
            "/health",
            headers={
                "Origin": "https://malicious.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert disallowed.headers.get("access-control-allow-origin") is None


def test_domain_modules_and_supervisor_checkpoint_tables_registered() -> None:
    keys = [spec.key for spec in DOMAIN_MODULES]
    assert keys == [
        "identity",
        "organizations",
        "projects",
        "applications",
        "mentorship",
        "assessments",
        "passports",
    ]
    for spec in DOMAIN_MODULES:
        assert spec.owner_lane in {"D1", "D2", "D3", "D4"}
        assert len(spec.proposed_tables) > 0
        assert len(spec.blocking_decisions) > 0
        assert len(spec.invariants) > 0

    # Identity is preserved; the explicitly assigned supervisor slice adds its own tables.
    expected_tables = {
        "users", "user_role_grants", "organizations", "organization_memberships",
        "projects", "project_terms_versions", "moderation_decisions",
        "audit_events", "idempotency_records",
    }
    assert expected_tables.issubset(set(Base.metadata.tables.keys()))
