"""Identity domain service: local user resolution, provisioning, and context projection."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.identity.models import ALLOWED_GLOBAL_USER_ROLES, GlobalUserRole, User, UserRoleGrant
from app.identity.schemas import (
    PortalContextName,
    StudentProfileProjectDTO,
    StudentProfileRead,
    StudentProfileUpsert,
    StudentSelfReportedSkillDTO,
    UserSelf,
)

logger = logging.getLogger("experiencebridge.api")

STUDENT_PROFILE_AUDIT_EVENT = "student_profile.updated"


def get_active_role_grants(user: User) -> list[GlobalUserRole]:
    """Return active (non-revoked) global role grants for a user."""
    roles: list[GlobalUserRole] = []
    seen: set[str] = set()
    for grant in user.role_grants:
        if (
            isinstance(grant, UserRoleGrant)
            and grant.revoked_at is None
            and grant.role in ALLOWED_GLOBAL_USER_ROLES
            and grant.role not in seen
        ):
            seen.add(grant.role)
            roles.append(grant.role)  # type: ignore[arg-type]
    return roles


def compute_effective_contexts(
    active_roles: list[GlobalUserRole],
    *,
    db: Session | None = None,
    user: User | None = None,
) -> list[PortalContextName]:
    """Compute effective portal contexts from server-verified role grants and active domain records."""
    has_student_record = False
    has_mentor_record = False
    has_active_org_membership = False

    if db is not None and user is not None:
        from app.applications.models import Application, Participation
        from app.core.commands import AuditEvent
        from app.mentorship.models import MentorAssignment, MentorProfile
        from app.organizations.models import OrganizationMembership

        has_student_record = bool(
            db.scalar(select(Application.id).where(Application.student_user_id == user.id).limit(1))
            or db.scalar(select(Participation.id).where(Participation.student_user_id == user.id).limit(1))
            or db.scalar(
                select(AuditEvent.id)
                .where(
                    AuditEvent.entity_id == user.id,
                    AuditEvent.event_type == STUDENT_PROFILE_AUDIT_EVENT,
                )
                .limit(1)
            )
        )
        has_mentor_record = bool(
            db.scalar(select(MentorProfile.user_id).where(MentorProfile.user_id == user.id).limit(1))
            or db.scalar(select(MentorAssignment.id).where(MentorAssignment.mentor_user_id == user.id).limit(1))
        )
        has_active_org_membership = bool(
            db.scalar(
                select(OrganizationMembership.id)
                .where(
                    OrganizationMembership.user_id == user.id,
                    OrganizationMembership.status == "active",
                )
                .limit(1)
            )
        )

    contexts: list[PortalContextName] = []
    if "student" in active_roles or has_student_record:
        contexts.append("student")
    if "mentor_candidate" in active_roles or has_mentor_record:
        contexts.append("mentor")
    if has_active_org_membership:
        contexts.append("organization")
    if "platform_admin" in active_roles:
        contexts.append("admin")
    return contexts


def build_user_self_dto(user: User, db: Session | None = None) -> UserSelf:
    """Project an internal User ORM instance into the canonical UserSelf response DTO."""
    active_roles = get_active_role_grants(user)
    effective_contexts = compute_effective_contexts(active_roles, db=db, user=user)
    return UserSelf(
        id=user.id,
        identity_issuer=user.identity_issuer,
        identity_subject=user.identity_subject,
        display_name=user.display_name,
        email=user.email,
        email_verified_at=user.email_verified_at,
        account_status=user.account_status,  # type: ignore[arg-type]
        role_grants=active_roles,
        effective_contexts=effective_contexts,
        created_at=user.created_at,
        updated_at=user.updated_at,
        row_version=user.row_version,
    )


def build_student_profile_dto(user: User, db: Session) -> StudentProfileRead:
    """Resolve the authenticated student's persisted profile details alongside identity fields."""
    from app.core.commands import AuditEvent

    latest_event = db.scalar(
        select(AuditEvent)
        .where(
            AuditEvent.entity_id == user.id,
            AuditEvent.actor_user_id == user.id,
            AuditEvent.event_type == STUDENT_PROFILE_AUDIT_EVENT,
        )
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(1)
    )
    saved: dict = {}
    if latest_event and isinstance(latest_event.details, dict):
        raw_profile = latest_event.details.get("profile")
        if isinstance(raw_profile, dict):
            saved = raw_profile

    skills: list[StudentSelfReportedSkillDTO] = []
    for item in saved.get("self_reported_skills") or []:
        if isinstance(item, dict):
            try:
                skills.append(StudentSelfReportedSkillDTO.model_validate(item))
            except Exception:
                continue

    projects: list[StudentProfileProjectDTO] = []
    for item in saved.get("top_projects") or []:
        if isinstance(item, dict):
            try:
                projects.append(StudentProfileProjectDTO.model_validate(item))
            except Exception:
                continue

    preferred_domains = [
        str(d).strip()
        for d in (saved.get("preferred_domains") or [])
        if str(d).strip()
    ]

    graduation_year = saved.get("graduation_year")
    if not isinstance(graduation_year, int) or not (1950 <= graduation_year <= 2100):
        graduation_year = 2026

    weekly_hours = saved.get("weekly_hours_available")
    if not isinstance(weekly_hours, int) or not (1 <= weekly_hours <= 80):
        weekly_hours = 10

    return StudentProfileRead(
        user_id=user.id,
        identity_issuer=user.identity_issuer,
        identity_subject=user.identity_subject,
        display_name=user.display_name,
        email=user.email,
        headline=str(saved.get("headline") or ""),
        bio=str(saved.get("bio") or ""),
        institution=str(saved.get("institution") or ""),
        program_of_study=str(saved.get("program_of_study") or ""),
        graduation_year=graduation_year,
        weekly_hours_available=weekly_hours,
        preferred_domains=preferred_domains,
        portfolio_url=saved.get("portfolio_url"),
        github_url=saved.get("github_url"),
        linkedin_url=saved.get("linkedin_url"),
        self_reported_skills=skills,
        top_projects=projects,
        updated_at=user.updated_at,
        row_version=user.row_version,
    )


def upsert_student_profile(
    db: Session,
    user: User,
    request: Request,
    payload: StudentProfileUpsert,
) -> StudentProfileRead:
    """Persist editable student profile fields for the authenticated user."""
    from app.core.commands import audit

    now = datetime.now(timezone.utc)
    user.display_name = payload.display_name
    user.updated_at = now
    user.row_version = (user.row_version or 1) + 1

    serialized = jsonable_encoder(payload)
    audit(
        db,
        user,
        request,
        STUDENT_PROFILE_AUDIT_EVENT,
        user,
        profile=serialized,
    )
    db.flush()
    return build_student_profile_dto(user, db)
