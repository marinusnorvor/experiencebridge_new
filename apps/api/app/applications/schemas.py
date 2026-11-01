"""Typed input and output contracts for explicit student consent."""

from datetime import datetime
from ipaddress import ip_address
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, HttpUrl, field_validator

from app.projects.schemas import Input, RecordRead, TermsRead

CONSENT_VERSION = "supervisor-v1"
CONSENT_TEXT = (
    "I have reviewed and explicitly accept this offer's exact scope, compensation, "
    "IP and confidentiality terms. This is synthetic demonstration work; acceptance "
    "does not claim payment, employment, mentor consent or verified completion."
)


class ApplicationLink(Input):
    label: str = Field(min_length=1, max_length=160)
    url: HttpUrl = Field(max_length=2048)

    @field_validator("url")
    @classmethod
    def safe_url(cls, value):
        host = (value.host or "").rstrip(".").lower()
        if value.scheme != "https" or value.username or value.password or host == "localhost" or host.endswith((".localhost", ".local")):
            raise ValueError("Use an HTTPS link without credentials or a local host")
        try:
            address = ip_address(host.strip("[]"))
        except ValueError:
            return value  # Metadata only: never resolve/fetch URLs on the server.
        if not address.is_global:
            raise ValueError("Private/reserved IP addresses are not allowed")
        return value


class ApplicationCreate(Input):
    seen_terms_version_id: UUID
    motivation: str = Field(min_length=20, max_length=5000)
    declared_skills: list[Annotated[str, Field(min_length=1, max_length=80)]] = Field(default_factory=list, max_length=30)
    links: list[ApplicationLink] = Field(default_factory=list, max_length=20)
    weekly_minutes_available: int = Field(gt=0, le=10080, strict=True)


class OfferCreate(Input):
    terms_version_id: UUID
    expires_at: AwareDatetime


class OfferAccept(Input):
    terms_version_id: UUID
    terms_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    consent_statement_version: Literal["supervisor-v1"]
    explicitly_accepted: bool = Field(strict=True)

    @field_validator("explicitly_accepted")
    @classmethod
    def must_accept(cls, value):
        if not value:
            raise ValueError("Explicit student acceptance is required")
        return value


class OptionalReason(Input):
    explanation: str | None = Field(default=None, min_length=10, max_length=2000)


class RequiredReason(Input):
    explanation: str = Field(min_length=10, max_length=2000)


class OfferRead(RecordRead):
    application_id: UUID
    project_id: UUID
    student_user_id: UUID
    terms_version_id: UUID
    issued_by_user_id: UUID
    expires_at: datetime
    status: Literal["offered", "accepted", "declined", "expired", "revoked"]
    reason: str | None
    terms_hash: str
    participation_id: UUID | None
    data_origin: Literal["synthetic"]


class ApplicationRead(RecordRead):
    project_id: UUID
    student_user_id: UUID
    seen_terms_version_id: UUID
    motivation: str
    declared_skills: list[str]
    links: list[ApplicationLink]
    weekly_minutes_available: int
    status: Literal["submitted", "under_review", "shortlisted", "rejected", "offered", "withdrawn"]
    reason: str | None
    latest_offer: OfferRead | None
    participation_id: UUID | None
    data_origin: Literal["synthetic"]


class ApplicationDetail(ApplicationRead):
    observed_terms: TermsRead


class OfferDetail(OfferRead):
    terms: TermsRead
    consent_statement_version: Literal["supervisor-v1"]
    consent_statement: str


class AcceptanceRead(RecordRead):
    offer_id: UUID
    participation_id: UUID
    student_user_id: UUID
    terms_version_id: UUID
    terms_hash: str
    consent_statement_version: str
    accepted_at: datetime
    data_origin: Literal["synthetic"]


class ParticipationRead(RecordRead):
    project_id: UUID
    student_user_id: UUID
    offer_id: UUID
    accepted_terms_version_id: UUID
    status: Literal["active", "under_review", "completed", "partially_completed", "withdrawn", "cancelled"]
    started_at: datetime | None
    withdrawn_at: datetime | None
    withdrawal_reason: str | None
    data_origin: Literal["synthetic"]
    terms_acceptance: AcceptanceRead


class ParticipationDetail(ParticipationRead):
    agreed_terms: TermsRead


class ApplicationPage(Input):
    items: list[ApplicationRead]
    next_offset: int | None = None
    next_cursor: str | None = None


class OfferPage(Input):
    items: list[OfferRead]
    next_offset: int | None = None
    next_cursor: str | None = None


class ParticipationPage(Input):
    items: list[ParticipationRead]
    next_offset: int | None = None
    next_cursor: str | None = None
