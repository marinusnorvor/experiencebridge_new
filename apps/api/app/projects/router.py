"""Checkpoint 1: real persistence and authorization, synthetic non-production records."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.commands import audit, digest, execute, fail, precondition
from app.database.session import get_db
from app.identity.dependencies import get_active_settings, get_current_user
from app.identity.models import User
from app.identity.service import get_active_role_grants
from app.organizations.models import Organization, OrganizationMembership
from app.projects.models import ModerationDecision, Project, TermsVersion
from app.projects.schemas import (
    DecisionInput, Empty, OrganizationCreate, ProjectCreate, RequiredReason, SubmitProject, TermsCreate,
    OrganizationRead, OrganizationPage, ProjectRead, ProjectPage, TermsRead, ProjectReviewPage,
)


def demonstration_environment(settings=Depends(get_active_settings)):
    if settings.app_env not in {"development", "test"} or settings.neon_branch not in {"development", "test"}:
        fail("FORBIDDEN", "This synthetic supervisor workflow is available only in development/test.", 403)


router = APIRouter(tags=["Supervisor workflow"], dependencies=[Depends(demonstration_environment)])
DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]


def read_record(db, model, record_id, lock=False):
    query = select(model).where(model.id == record_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    record = db.scalar(query)
    if not record:
        fail("NOT_FOUND", "Resource unavailable.", 404)
    return record


def membership(db, org_id, user_id, roles=None):
    query = select(OrganizationMembership).where(
        OrganizationMembership.organization_id == org_id,
        OrganizationMembership.user_id == user_id, OrganizationMembership.status == "active",
    )
    if roles:
        query = query.where(OrganizationMembership.role.in_(roles))
    return db.scalar(query)


def require_member(db, org_id, user, roles=None):
    if not membership(db, org_id, user.id, roles):
        fail("NOT_FOUND", "Organization unavailable.", 404)


def require_manager(db, project, user):
    require_member(db, project.organization_id, user, ["owner", "project_manager"])
    if project.project_manager_user_id != user.id:
        fail("FORBIDDEN", "This action requires the assigned project manager.", 403)


def require_admin(user):
    if "platform_admin" not in get_active_role_grants(user):
        fail("FORBIDDEN", "An active platform administrator is required.", 403)


def independent_admin(db, org, user):
    require_admin(user)
    if org.created_by_user_id == user.id or membership(db, org.id, user.id):
        fail("FORBIDDEN", "An independent administrator must moderate this organization.", 403)


def serialize(record):
    return jsonable_encoder({column.key: getattr(record, column.key) for column in record.__table__.columns})


def headers(response, record):
    response.headers["ETag"] = f'"{record.row_version}"'
    response.headers["Cache-Control"] = "no-store, private"


def command_response(response, result):
    response.headers["ETag"] = f'"{result["row_version"]}"'
    response.headers["Cache-Control"] = "no-store, private"
    return result


def page(records):
    return {"items": [serialize(r) for r in records], "next_cursor": None}


@router.post("/organizations", status_code=201, response_model=OrganizationRead)
def create_organization(body: OrganizationCreate, request: Request, response: Response, db: DB, user: Actor):
    def action():
        org = Organization(**body.model_dump(), created_by_user_id=user.id)
        db.add(org)
        db.flush()
        db.add(OrganizationMembership(organization_id=org.id, user_id=user.id, role="owner"))
        audit(db, user, request, "organization.created", org, data_origin="synthetic")
        return serialize(org)
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), lambda: None, action))


@router.get("/me/organizations", response_model=OrganizationPage)
def my_organizations(response: Response, db: DB, user: Actor):
    response.headers["Cache-Control"] = "no-store, private"
    return page(db.scalars(select(Organization).where(Organization.id.in_(
        select(OrganizationMembership.organization_id).where(
            OrganizationMembership.user_id == user.id, OrganizationMembership.status == "active"
        )
    )).order_by(Organization.created_at.desc())).all())


@router.get("/organizations/{org_id}", response_model=OrganizationRead)
def get_organization(org_id: UUID, response: Response, db: DB, user: Actor):
    require_member(db, org_id, user)
    org = read_record(db, Organization, org_id)
    headers(response, org)
    return serialize(org)


@router.post("/organizations/{org_id}/submit-verification", response_model=OrganizationRead)
def submit_organization(org_id: UUID, body: Empty, request: Request, response: Response, db: DB, user: Actor):
    def action():
        org = read_record(db, Organization, org_id, True)
        precondition(request, org)
        if org.verification_status not in {"draft", "changes_requested"}:
            fail("INVALID_STATE", "Only a draft or changes-requested organization can be submitted.")
        org.verification_status = "submitted"
        org.row_version += 1
        audit(db, user, request, "organization.verification_submitted", org)
        return serialize(org)
    return command_response(response, execute(db, user, request, {},
        lambda: require_member(db, org_id, user, ["owner"]), action))


@router.get("/admin/organizations/pending", response_model=OrganizationPage)
def organization_queue(response: Response, db: DB, user: Actor):
    require_admin(user)
    response.headers["Cache-Control"] = "no-store, private"
    return page(db.scalars(select(Organization).where(Organization.verification_status == "submitted")).all())


@router.post("/admin/organizations/{org_id}/decisions", response_model=OrganizationRead)
def organization_decision(org_id: UUID, body: DecisionInput, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        independent_admin(db, read_record(db, Organization, org_id), user)
    def action():
        org = read_record(db, Organization, org_id, True)
        precondition(request, org)
        if org.verification_status != "submitted" or body.decision not in {"verify", "request_changes", "reject"}:
            fail("INVALID_STATE", "A submitted organization and a valid moderation decision are required.")
        if body.terms_version_id or body.snapshot_hash:
            fail("VALIDATION_ERROR", "Organization decisions do not accept project terms.", 422)
        org.verification_status = {"verify": "verified", "request_changes": "changes_requested", "reject": "rejected"}[body.decision]
        org.row_version += 1
        db.add(ModerationDecision(organization_id=org.id, admin_user_id=user.id,
            decision=body.decision, explanation=body.explanation))
        audit(db, user, request, "organization.verification_decided", org, decision=body.decision)
        return serialize(org)
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))


def project_values(body):
    values = body.model_dump(mode="json")
    scope = {k: v for k, v in values.items() if k not in {"title", "description", "capacity", "org_reviewer_user_id"}}
    for milestone in scope["milestones"]:
        milestone["id"] = str(uuid4())
    return scope


def check_reviewer(db, org_id, reviewer_id):
    reviewer = db.get(User, reviewer_id)
    # For the narrow MVP, an owner/manager may review only when explicitly named on the project.
    if not reviewer or reviewer.account_status != "active" or not membership(
        db, org_id, reviewer_id, ["owner", "project_manager", "reviewer"]
    ):
        fail("VALIDATION_ERROR", "Select an active organization member as explicit reviewer.", 422)


@router.post("/organizations/{org_id}/projects", status_code=201, response_model=ProjectRead)
def create_project(org_id: UUID, body: ProjectCreate, request: Request, response: Response, db: DB, user: Actor):
    def action():
        org = read_record(db, Organization, org_id, True)
        precondition(request, org)
        check_reviewer(db, org_id, body.org_reviewer_user_id)
        project = Project(organization_id=org_id, project_manager_user_id=user.id,
            org_reviewer_user_id=body.org_reviewer_user_id, title=body.title,
            description=body.description, capacity=body.capacity, scope=project_values(body))
        db.add(project)
        db.flush()
        audit(db, user, request, "project.created", project, organization_id=str(org_id))
        return serialize(project)
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"),
        lambda: require_member(db, org_id, user, ["owner", "project_manager"]), action))


@router.patch("/projects/{project_id}", response_model=ProjectRead)
def edit_project(project_id: UUID, body: ProjectCreate, request: Request, response: Response, db: DB, user: Actor):
    project = read_record(db, Project, project_id)
    require_manager(db, project, user)
    project = read_record(db, Project, project_id, True)
    precondition(request, project)
    if project.status not in {"draft", "changes_requested"}:
        fail("INVALID_STATE", "Published/submitted scope cannot be edited.")
    check_reviewer(db, project.organization_id, body.org_reviewer_user_id)
    project.title, project.description, project.capacity = body.title, body.description, body.capacity
    project.org_reviewer_user_id = body.org_reviewer_user_id
    project.scope = project_values(body)
    project.row_version += 1
    audit(db, user, request, "project.draft_updated", project)
    db.commit()
    headers(response, project)
    return serialize(project)


@router.get("/organizations/{org_id}/projects", response_model=ProjectPage)
def organization_projects(org_id: UUID, response: Response, db: DB, user: Actor):
    require_member(db, org_id, user)
    response.headers["Cache-Control"] = "no-store, private"
    result = page(db.scalars(select(Project).where(Project.organization_id == org_id).order_by(Project.created_at.desc())).all())
    add_published_terms_ids(db, result["items"], include_submitted=True)
    return result


@router.get("/projects", response_model=ProjectPage, response_model_exclude_none=True)
def discover_projects(db: DB, q: str = Query(default="", max_length=100), limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0)):
    query = select(Project).join(Organization).where(Project.status == "open", Organization.verification_status == "verified")
    if q:
        query = query.where(Project.title.icontains(q, autoescape=True))
    records = db.scalars(query.order_by(Project.created_at.desc(), Project.id).limit(limit + 1).offset(offset)).all()
    items = [public_project(p) for p in records[:limit]]
    add_published_terms_ids(db, items)
    return {"items": items,
            "next_offset": offset + limit if len(records) > limit else None}


def add_published_terms_ids(db, items, include_submitted=False):
    """Expose the identifier of already-disclosed published terms (and submitted terms for org members)."""
    if not items:
        return
    ids = [UUID(str(item["id"])) for item in items]
    rows = db.execute(select(TermsVersion.project_id, TermsVersion.id).join(
        Project, (Project.id == TermsVersion.project_id) &
        (Project.published_terms_version == TermsVersion.version_no)
    ).where(Project.id.in_(ids))).all()
    terms = {str(project_id): str(version_id) for project_id, version_id in rows}
    for item in items:
        item["published_terms_version_id"] = terms.get(str(item["id"]))
    if include_submitted:
        sub_rows = db.execute(select(TermsVersion.project_id, TermsVersion.id).join(
            Project, (Project.id == TermsVersion.project_id) &
            (Project.submitted_terms_version == TermsVersion.version_no)
        ).where(Project.id.in_(ids))).all()
        sub_terms = {str(project_id): str(version_id) for project_id, version_id in sub_rows}
        for item in items:
            item["submitted_terms_version_id"] = sub_terms.get(str(item["id"]))


def public_project(project):
    return {k: v for k, v in serialize(project).items() if k not in {"project_manager_user_id", "org_reviewer_user_id"}}


@router.get("/projects/{project_id}", response_model=ProjectRead, response_model_exclude_none=True)
def get_project(project_id: UUID, response: Response, db: DB, user: Actor):
    project = read_record(db, Project, project_id)
    org = read_record(db, Organization, project.organization_id)
    is_org_member = bool(membership(db, org.id, user.id))
    if is_org_member:
        result = serialize(project)
    elif project.status == "open" and org.verification_status == "verified":
        result = public_project(project)
    else:
        fail("NOT_FOUND", "Project unavailable.", 404)
    add_published_terms_ids(db, [result], include_submitted=is_org_member)
    headers(response, project)
    return result


@router.post("/projects/{project_id}/terms-versions", status_code=201, response_model=TermsRead)
def create_terms(project_id: UUID, body: TermsCreate, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        require_manager(db, read_record(db, Project, project_id), user)
    def action():
        project = read_record(db, Project, project_id, True)
        precondition(request, project)
        if project.status not in {"draft", "changes_requested"}:
            fail("INVALID_STATE", "Terms can only be created before publication review.")
        snapshot = {"title": project.title, "description": project.description, "capacity": project.capacity,
                    "scope": project.scope, "terms": body.model_dump(mode="json"), "data_origin": "synthetic"}
        snapshot["terms"]["fee_amount"] = format(body.fee_amount, ".2f")
        version = (db.scalar(select(func.max(TermsVersion.version_no)).where(TermsVersion.project_id == project_id)) or 0) + 1
        terms = TermsVersion(project_id=project_id, version_no=version, snapshot=snapshot,
                             content_hash=digest(snapshot), created_by_user_id=user.id)
        db.add(terms)
        db.flush()
        project.row_version += 1
        audit(db, user, request, "project.terms_created", project, terms_version_id=str(terms.id), content_hash=terms.content_hash)
        result = serialize(terms)
        result["project_row_version"] = project.row_version
        return result
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))


@router.get("/projects/{project_id}/terms-versions/{version_id}", response_model=TermsRead)
def get_terms(project_id: UUID, version_id: UUID, response: Response, db: DB, user: Actor):
    project = read_record(db, Project, project_id)
    terms = read_record(db, TermsVersion, version_id)
    org = read_record(db, Organization, project.organization_id)
    if terms.project_id != project_id or not (membership(db, org.id, user.id) or (
        project.status == "open" and org.verification_status == "verified" and terms.version_no == project.published_terms_version
    )):
        fail("NOT_FOUND", "Terms unavailable.", 404)
    response.headers["Cache-Control"] = "no-store, private"
    return serialize(terms)


@router.post("/projects/{project_id}/submit-review", response_model=ProjectRead)
def submit_project(project_id: UUID, body: SubmitProject, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        require_manager(db, read_record(db, Project, project_id), user)
    def action():
        project = read_record(db, Project, project_id, True)
        precondition(request, project)
        if project.status not in {"draft", "changes_requested"}:
            fail("INVALID_STATE", "Only a draft can be submitted.")
        org = read_record(db, Organization, project.organization_id)
        if org.verification_status != "verified":
            fail("ORG_NOT_VERIFIED", "An independent administrator must review the synthetic organization first.")
        check_reviewer(db, org.id, project.org_reviewer_user_id)
        terms = read_record(db, TermsVersion, body.terms_version_id)
        if terms.project_id != project_id:
            fail("NOT_FOUND", "Terms unavailable.", 404)
        if any(terms.snapshot[k] != getattr(project, k) for k in ("title", "description", "capacity", "scope")):
            fail("TERMS_CHANGED", "Create a new terms snapshot for the edited draft.")
        project.submitted_terms_version = terms.version_no
        project.status = "pending_review"
        project.row_version += 1
        audit(db, user, request, "project.review_submitted", project, terms_version_id=str(terms.id))
        result = serialize(project)
        add_published_terms_ids(db, [result], include_submitted=True)
        return result
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))


@router.get("/admin/projects/pending", response_model=ProjectReviewPage)
def project_queue(response: Response, db: DB, user: Actor):
    require_admin(user)
    response.headers["Cache-Control"] = "no-store, private"
    records = db.scalars(select(Project).where(Project.status == "pending_review")).all()
    return {"items": [{"project": serialize(p), "terms": serialize(db.scalar(select(TermsVersion).where(
        TermsVersion.project_id == p.id, TermsVersion.version_no == p.submitted_terms_version
    )))} for p in records], "next_cursor": None}


@router.post("/admin/projects/{project_id}/decisions", response_model=ProjectRead)
def project_decision(project_id: UUID, body: DecisionInput, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        project = read_record(db, Project, project_id)
        independent_admin(db, read_record(db, Organization, project.organization_id), user)
    def action():
        project = read_record(db, Project, project_id, True)
        precondition(request, project)
        if project.status != "pending_review" or body.decision not in {"approve", "request_changes", "reject"}:
            fail("INVALID_STATE", "A pending project and valid moderation decision are required.")
        terms = db.scalar(select(TermsVersion).where(TermsVersion.project_id == project_id,
                         TermsVersion.version_no == project.submitted_terms_version))
        if not terms or terms.id != body.terms_version_id or terms.content_hash != body.snapshot_hash:
            fail("TERMS_CHANGED", "Review the exact submitted terms and hash.")
        org = read_record(db, Organization, project.organization_id)
        if org.verification_status != "verified":
            fail("ORG_NOT_VERIFIED", "Organization moderation is required.")
        check_reviewer(db, org.id, project.org_reviewer_user_id)
        if body.decision == "approve":
            project.published_terms_version = terms.version_no
        project.status = {"approve": "open", "request_changes": "changes_requested", "reject": "rejected"}[body.decision]
        project.row_version += 1
        db.add(ModerationDecision(project_id=project_id, terms_version_id=terms.id, admin_user_id=user.id,
                                 decision=body.decision, explanation=body.explanation))
        audit(db, user, request, "project.moderation_decided", project, decision=body.decision, terms_version_id=str(terms.id))
        result = serialize(project)
        add_published_terms_ids(db, [result], include_submitted=True)
        return result
    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))


@router.post("/projects/{project_id}/start", response_model=ProjectRead)
def start_project(project_id: UUID, body: Empty, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        require_manager(db, read_record(db, Project, project_id), user)

    def action():
        from datetime import datetime, timezone
        from app.applications.models import Offer, Participation
        from app.applications.router import ensure_utc
        from app.mentorship.models import MentorAssignment

        project = read_record(db, Project, project_id, lock=True)
        precondition(request, project)
        if project.status not in {"open", "closed_to_applications"}:
            fail("INVALID_STATE", f"Project in status {project.status} cannot be started.")

        now = datetime.now(timezone.utc)
        live_offers = db.scalars(
            select(Offer).where(
                Offer.project_id == project.id,
                Offer.status == "offered",
            )
        ).all()
        for off in live_offers:
            if ensure_utc(off.expires_at) <= now:
                off.status = "expired"
                off.row_version += 1
            else:
                fail("INVALID_STATE", "All outstanding offers must be resolved or expired before starting.")

        active_participations = db.scalars(
            select(Participation).where(
                Participation.project_id == project.id,
                Participation.status == "active",
            )
        ).all()
        if not active_participations:
            fail("INVALID_STATE", "Project requires at least one active participant to start.")

        for part in active_participations:
            accepted_assignment = db.scalar(
                select(MentorAssignment).where(
                    MentorAssignment.participation_id == part.id,
                    MentorAssignment.status == "accepted",
                )
            )
            if not accepted_assignment:
                fail("MENTOR_REQUIRED", f"Participant does not have an accepted mentor assignment.")
            from app.mentorship.router import require_eligible_mentor
            require_eligible_mentor(db, project, part.student_user_id, accepted_assignment.mentor_user_id)
            part.started_at = now
            part.row_version += 1

        project.status = "in_progress"
        project.row_version += 1
        audit(db, user, request, "project.started", project)
        return serialize(project)

    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))


@router.post("/projects/{project_id}/complete", response_model=ProjectRead)
def complete_project(project_id: UUID, body: RequiredReason, request: Request, response: Response, db: DB, user: Actor):
    def authorize():
        require_manager(db, read_record(db, Project, project_id), user)

    def action():
        from app.applications.models import Participation

        project = read_record(db, Project, project_id, lock=True)
        precondition(request, project)
        if project.status != "in_progress":
            fail("INVALID_STATE", "Only an in-progress project can be completed.")

        participations = db.scalars(select(Participation).where(Participation.project_id == project.id)).all()
        if not participations:
            fail("INVALID_STATE", "Project has no participations.")

        completed_count = sum(1 for p in participations if p.status == "completed")
        if completed_count == 0:
            fail("COMPLETION_BLOCKED", "At least one participant must have successfully completed.")

        unterminated = [p for p in participations if p.status in {"active", "under_review"}]
        if unterminated:
            fail("COMPLETION_BLOCKED", "All participations must be terminal (completed, partially_completed, withdrawn, or cancelled).")

        project.status = "completed"
        project.row_version += 1
        audit(db, user, request, "project.completed", project, reason=body.explanation)
        return serialize(project)

    return command_response(response, execute(db, user, request, body.model_dump(mode="json"), authorize, action))
