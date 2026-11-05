"""Checkpoint 2: student applications, offers, explicit consent, and participation records."""

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.applications.models import Application, Offer, Participation, TermsAcceptance
from app.assessments.schemas import FinalizeRequest, ReadyRequest
from app.applications.schemas import (
    CONSENT_TEXT,
    CONSENT_VERSION,
    ApplicationCreate,
    ApplicationDetail,
    ApplicationPage,
    ApplicationRead,
    OfferAccept,
    OfferCreate,
    OfferDetail,
    OfferPage,
    OfferRead,
    OptionalReason,
    ParticipationDetail,
    ParticipationPage,
    ParticipationRead,
    RequiredReason,
)
from app.core.commands import audit, ensure_utc, execute, fail, precondition
from app.database.session import get_db
from app.identity.dependencies import get_current_user
from app.identity.models import User
from app.projects.models import Project, TermsVersion
from app.projects.router import (
    command_response,
    demonstration_environment,
    headers,
    membership,
    read_record,
    require_manager,
    require_member,
    serialize,
)
from app.projects.schemas import Empty

router = APIRouter(tags=["Applications & Participations"], dependencies=[Depends(demonstration_environment)])
DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]


def serialize_offer(db: Session, offer: Offer) -> dict:
    now = datetime.now(timezone.utc)
    if offer.status == "offered" and ensure_utc(offer.expires_at) <= now:
        offer.status = "expired"
    data = serialize(offer)
    part = db.scalar(select(Participation).where(Participation.offer_id == offer.id))
    data["participation_id"] = part.id if part else None
    return data


def serialize_application(db: Session, app: Application) -> dict:
    data = serialize(app)
    latest_offer = db.scalar(
        select(Offer).where(Offer.application_id == app.id).order_by(Offer.created_at.desc(), Offer.id.desc())
    )
    data["latest_offer"] = serialize_offer(db, latest_offer) if latest_offer else None
    part = db.scalar(
        select(Participation).where(
            Participation.project_id == app.project_id,
            Participation.student_user_id == app.student_user_id,
        )
    )
    data["participation_id"] = part.id if part else None
    return data


def serialize_participation(db: Session, part: Participation, acceptance: TermsAcceptance | None = None) -> dict:
    data = serialize(part)
    if acceptance is None:
        acceptance = db.scalar(select(TermsAcceptance).where(TermsAcceptance.participation_id == part.id))
    data["terms_acceptance"] = serialize(acceptance) if acceptance else None
    return data


def check_capacity(db: Session, project: Project) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    expired_offers = db.scalars(
        select(Offer).where(
            Offer.project_id == project.id,
            Offer.status == "offered",
            Offer.expires_at <= now,
        )
    ).all()
    for o in expired_offers:
        o.status = "expired"
    active_parts = (
        db.scalar(
            select(func.count(Participation.id)).where(
                Participation.project_id == project.id,
                Participation.status.not_in(["withdrawn", "cancelled"]),
            )
        )
        or 0
    )
    reserved_offers = (
        db.scalar(
            select(func.count(Offer.id)).where(
                Offer.project_id == project.id,
                Offer.status == "offered",
                Offer.expires_at > now,
            )
        )
        or 0
    )
    return active_parts, reserved_offers


# ==================== APPLICATIONS ====================


@router.post("/projects/{project_id}/applications", status_code=201, response_model=ApplicationRead)
def submit_application(
    project_id: UUID,
    body: ApplicationCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def action():
        project = read_record(db, Project, project_id)
        precondition(request, project)
        if project.status != "open":
            fail("INVALID_STATE", "Applications can only be submitted to open projects.")
        if user.id in {project.project_manager_user_id, project.org_reviewer_user_id}:
            fail("FORBIDDEN", "Managers and reviewers cannot apply to their own project.", 403)
        terms = read_record(db, TermsVersion, body.seen_terms_version_id)
        if terms.project_id != project_id or terms.version_no != project.published_terms_version:
            fail("TERMS_CHANGED", "You must review the current published terms before applying.")
        existing = db.scalar(
            select(Application).where(
                Application.project_id == project_id,
                Application.student_user_id == user.id,
            )
        )
        if existing:
            fail("DUPLICATE_APPLICATION", "Student has already applied to this project.")
        app = Application(
            project_id=project_id,
            student_user_id=user.id,
            seen_terms_version_id=body.seen_terms_version_id,
            motivation=body.motivation,
            declared_skills=body.declared_skills,
            links=[link.model_dump(mode="json") for link in body.links],
            weekly_minutes_available=body.weekly_minutes_available,
            status="submitted",
        )
        db.add(app)
        db.flush()
        audit(db, user, request, "application.submitted", app, project_id=str(project_id))
        return serialize_application(db, app)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), lambda: None, action),
    )


@router.get("/me/applications", response_model=ApplicationPage)
def my_applications(response: Response, db: DB, user: Actor):
    response.headers["Cache-Control"] = "no-store, private"
    apps = db.scalars(
        select(Application).where(Application.student_user_id == user.id).order_by(Application.created_at.desc())
    ).all()
    return {"items": [serialize_application(db, a) for a in apps], "next_offset": None}


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: UUID, response: Response, db: DB, user: Actor):
    app = read_record(db, Application, application_id)
    project = read_record(db, Project, app.project_id)
    if app.student_user_id != user.id:
        require_manager(db, project, user)
    data = serialize_application(db, app)
    terms = read_record(db, TermsVersion, app.seen_terms_version_id)
    data["observed_terms"] = serialize(terms)
    headers(response, app)
    return data


@router.get("/projects/{project_id}/applications", response_model=ApplicationPage)
def project_applications(project_id: UUID, response: Response, db: DB, user: Actor):
    project = read_record(db, Project, project_id)
    require_manager(db, project, user)
    response.headers["Cache-Control"] = "no-store, private"
    apps = db.scalars(
        select(Application).where(Application.project_id == project_id).order_by(Application.created_at.desc())
    ).all()
    return {"items": [serialize_application(db, a) for a in apps], "next_offset": None}


@router.post("/applications/{application_id}/start-review", response_model=ApplicationRead)
def start_application_review(
    application_id: UUID,
    body: Empty,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        app = read_record(db, Application, application_id)
        require_manager(db, read_record(db, Project, app.project_id), user)

    def action():
        app = read_record(db, Application, application_id, lock=True)
        precondition(request, app)
        if app.status != "submitted":
            fail("INVALID_STATE", "Only submitted applications can enter review.")
        app.status = "under_review"
        app.row_version += 1
        audit(db, user, request, "application.review_started", app)
        return serialize_application(db, app)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/applications/{application_id}/shortlist", response_model=ApplicationRead)
def shortlist_application(
    application_id: UUID,
    body: Empty,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        app = read_record(db, Application, application_id)
        require_manager(db, read_record(db, Project, app.project_id), user)

    def action():
        app = read_record(db, Application, application_id, lock=True)
        precondition(request, app)
        if app.status not in {"submitted", "under_review"}:
            fail("INVALID_STATE", "Only submitted or under-review applications can be shortlisted.")
        app.status = "shortlisted"
        app.row_version += 1
        audit(db, user, request, "application.shortlisted", app)
        return serialize_application(db, app)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/applications/{application_id}/reject", response_model=ApplicationRead)
def reject_application(
    application_id: UUID,
    body: RequiredReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        app = read_record(db, Application, application_id)
        require_manager(db, read_record(db, Project, app.project_id), user)

    def action():
        app = read_record(db, Application, application_id, lock=True)
        precondition(request, app)
        if app.status not in {"submitted", "under_review", "shortlisted"}:
            fail("INVALID_STATE", f"Cannot reject an application in status {app.status}.")
        app.status = "rejected"
        app.reason = body.explanation
        app.row_version += 1
        audit(db, user, request, "application.rejected", app)
        return serialize_application(db, app)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/applications/{application_id}/withdraw", response_model=ApplicationRead)
def withdraw_application(
    application_id: UUID,
    body: OptionalReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        app = read_record(db, Application, application_id)
        if app.student_user_id != user.id:
            fail("FORBIDDEN", "Only the applicant can withdraw this application.", 403)

    def action():
        app = read_record(db, Application, application_id, lock=True)
        precondition(request, app)
        if app.status in {"rejected", "withdrawn"}:
            fail("INVALID_STATE", "Application is already terminal.")
        part = db.scalar(
            select(Participation).where(
                Participation.project_id == app.project_id,
                Participation.student_user_id == app.student_user_id,
            )
        )
        if part:
            fail("INVALID_STATE", "Accepted application cannot be withdrawn; withdraw participation instead.")
        live_offer = db.scalar(
            select(Offer).where(Offer.application_id == app.id, Offer.status == "offered")
        )
        if live_offer:
            live_offer.status = "revoked"
            live_offer.reason = "Application withdrawn by student"
            live_offer.row_version += 1
        app.status = "withdrawn"
        app.reason = body.explanation
        app.row_version += 1
        audit(db, user, request, "application.withdrawn", app)
        return serialize_application(db, app)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


# ==================== OFFERS ====================


@router.post("/applications/{application_id}/offer", status_code=201, response_model=OfferRead)
def create_offer(
    application_id: UUID,
    body: OfferCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        app = read_record(db, Application, application_id)
        require_manager(db, read_record(db, Project, app.project_id), user)

    def action():
        app = read_record(db, Application, application_id, lock=True)
        project = read_record(db, Project, app.project_id, lock=True)
        precondition(request, app)
        if project.status not in {"open", "closed_to_applications"}:
            fail("INVALID_STATE", "Offers can only be issued for open projects.")
        if app.status not in {"submitted", "under_review", "shortlisted", "offered"}:
            fail("INVALID_STATE", f"Cannot issue an offer to an application in status {app.status}.")
        now = datetime.now(timezone.utc)
        existing_live = db.scalar(
            select(Offer).where(Offer.application_id == app.id, Offer.status == "offered")
        )
        if existing_live:
            if ensure_utc(existing_live.expires_at) <= now:
                existing_live.status = "expired"
                existing_live.row_version += 1
            else:
                fail("INVALID_STATE", "Application already has an active offer.")
        accepted = db.scalar(
            select(Offer).where(Offer.application_id == app.id, Offer.status == "accepted")
        )
        if accepted:
            fail("INVALID_STATE", "Application already has an accepted offer.")
        terms = read_record(db, TermsVersion, body.terms_version_id)
        if terms.project_id != project.id or terms.version_no != project.published_terms_version:
            fail("TERMS_CHANGED", "Offers must reference the current published project terms.")
        if body.expires_at <= now:
            fail("VALIDATION_ERROR", "Offer expires_at must be in the future.", 422)
        active_parts, reserved_offers = check_capacity(db, project)
        if active_parts + reserved_offers >= project.capacity:
            fail("CAPACITY_EXCEEDED", "Project capacity exceeded.")
        offer = Offer(
            application_id=app.id,
            project_id=project.id,
            student_user_id=app.student_user_id,
            terms_version_id=terms.id,
            terms_hash=terms.content_hash,
            issued_by_user_id=user.id,
            expires_at=body.expires_at,
            status="offered",
        )
        db.add(offer)
        app.status = "offered"
        app.row_version += 1
        db.flush()
        audit(db, user, request, "offer.issued", offer, application_id=str(app.id))
        return serialize_offer(db, offer)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.get("/me/offers", response_model=OfferPage)
def my_offers(response: Response, db: DB, user: Actor):
    response.headers["Cache-Control"] = "no-store, private"
    offers = db.scalars(
        select(Offer).where(Offer.student_user_id == user.id).order_by(Offer.created_at.desc())
    ).all()
    return {"items": [serialize_offer(db, o) for o in offers], "next_offset": None}


@router.get("/offers/{offer_id}", response_model=OfferDetail)
def get_offer(offer_id: UUID, response: Response, db: DB, user: Actor):
    offer = read_record(db, Offer, offer_id)
    project = read_record(db, Project, offer.project_id)
    if offer.student_user_id != user.id:
        require_manager(db, project, user)
    data = serialize_offer(db, offer)
    terms = read_record(db, TermsVersion, offer.terms_version_id)
    data["terms"] = serialize(terms)
    data["consent_statement_version"] = CONSENT_VERSION
    data["consent_statement"] = CONSENT_TEXT
    headers(response, offer)
    return data


@router.post("/offers/{offer_id}/revoke", response_model=OfferRead)
def revoke_offer(
    offer_id: UUID,
    body: RequiredReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        offer = read_record(db, Offer, offer_id)
        require_manager(db, read_record(db, Project, offer.project_id), user)

    def action():
        offer = read_record(db, Offer, offer_id, lock=True)
        precondition(request, offer)
        if offer.status != "offered":
            fail("INVALID_STATE", "Only active offers can be revoked.")
        offer.status = "revoked"
        offer.reason = body.explanation
        offer.row_version += 1
        audit(db, user, request, "offer.revoked", offer)
        return serialize_offer(db, offer)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/offers/{offer_id}/decline", response_model=OfferRead)
def decline_offer(
    offer_id: UUID,
    body: OptionalReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        offer = read_record(db, Offer, offer_id)
        if offer.student_user_id != user.id:
            fail("FORBIDDEN", "Only the offered student can decline this offer.", 403)

    def action():
        offer = read_record(db, Offer, offer_id, lock=True)
        precondition(request, offer)
        if offer.status != "offered":
            fail("INVALID_STATE", "Only active offers can be declined.")
        now = datetime.now(timezone.utc)
        if ensure_utc(offer.expires_at) <= now:
            offer.status = "expired"
            offer.row_version += 1
            fail("OFFER_EXPIRED", "Offer has expired.")
        offer.status = "declined"
        offer.reason = body.explanation
        offer.row_version += 1
        audit(db, user, request, "offer.declined", offer)
        return serialize_offer(db, offer)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/offers/{offer_id}/accept", status_code=201, response_model=ParticipationRead)
def accept_offer(
    offer_id: UUID,
    body: OfferAccept,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        offer = read_record(db, Offer, offer_id)
        if offer.student_user_id != user.id:
            fail("FORBIDDEN", "Only the offered student can accept this offer.", 403)

    def action():
        offer = read_record(db, Offer, offer_id, lock=True)
        precondition(request, offer)
        if offer.status != "offered":
            fail("INVALID_STATE", "Only active offers can be accepted.")
        now = datetime.now(timezone.utc)
        if ensure_utc(offer.expires_at) <= now:
            offer.status = "expired"
            offer.row_version += 1
            fail("OFFER_EXPIRED", "Offer has expired.")
        if body.terms_version_id != offer.terms_version_id:
            fail("TERMS_CHANGED", "Terms version mismatch.")
        if body.terms_hash != offer.terms_hash:
            fail("TERMS_CHANGED", "Terms hash mismatch.")
        if body.consent_statement_version != CONSENT_VERSION:
            fail("VALIDATION_ERROR", "Consent statement version mismatch.", 422)

        project = read_record(db, Project, offer.project_id, lock=True)
        active_parts, _ = check_capacity(db, project)
        if active_parts >= project.capacity:
            fail("CAPACITY_EXCEEDED", "Project capacity exceeded.")

        offer.status = "accepted"
        offer.row_version += 1
        part = Participation(
            project_id=offer.project_id,
            student_user_id=user.id,
            offer_id=offer.id,
            accepted_terms_version_id=offer.terms_version_id,
            status="active",
        )
        db.add(part)
        db.flush()
        acc = TermsAcceptance(
            offer_id=offer.id,
            participation_id=part.id,
            student_user_id=user.id,
            terms_version_id=offer.terms_version_id,
            terms_hash=offer.terms_hash,
            consent_statement_version=body.consent_statement_version,
            accepted_at=now,
        )
        db.add(acc)
        db.flush()
        audit(db, user, request, "offer.accepted", offer, participation_id=str(part.id))
        audit(db, user, request, "participation.created", part, offer_id=str(offer.id))
        return serialize_participation(db, part, acceptance=acc)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


# ==================== PARTICIPATIONS ====================


@router.get("/me/participations", response_model=ParticipationPage)
def my_participations(response: Response, db: DB, user: Actor):
    response.headers["Cache-Control"] = "no-store, private"
    parts = db.scalars(
        select(Participation).where(Participation.student_user_id == user.id).order_by(Participation.created_at.desc())
    ).all()
    return {"items": [serialize_participation(db, p) for p in parts], "next_offset": None}


@router.get("/projects/{project_id}/participations", response_model=ParticipationPage)
def project_participations(project_id: UUID, response: Response, db: DB, user: Actor):
    project = read_record(db, Project, project_id)
    require_member(db, project.organization_id, user, ["owner", "project_manager", "reviewer"])
    if user.id not in {project.project_manager_user_id, project.org_reviewer_user_id}:
        if not membership(db, project.organization_id, user.id, ["owner"]):
            fail("FORBIDDEN", "Must be assigned manager or reviewer.", 403)
    response.headers["Cache-Control"] = "no-store, private"
    parts = db.scalars(
        select(Participation).where(Participation.project_id == project_id).order_by(Participation.created_at.desc())
    ).all()
    return {"items": [serialize_participation(db, p) for p in parts], "next_offset": None}


@router.get("/participations/{participation_id}", response_model=ParticipationDetail)
def get_participation(participation_id: UUID, response: Response, db: DB, user: Actor):
    part = read_record(db, Participation, participation_id)
    from app.assessments.router import require_workspace
    require_workspace(db, part, user)
    data = serialize_participation(db, part)
    terms = read_record(db, TermsVersion, part.accepted_terms_version_id)
    data["agreed_terms"] = serialize(terms)
    headers(response, part)
    return data


@router.post("/participations/{participation_id}/withdraw", response_model=ParticipationRead)
def withdraw_participation(
    participation_id: UUID,
    body: OptionalReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        part = read_record(db, Participation, participation_id)
        if part.student_user_id != user.id:
            fail("FORBIDDEN", "Only the participant can withdraw.", 403)

    def action():
        part = read_record(db, Participation, participation_id, lock=True)
        precondition(request, part)
        if part.status not in {"active", "under_review"}:
            fail("INVALID_STATE", f"Cannot withdraw participation in status {part.status}.")
        now = datetime.now(timezone.utc)
        part.status = "withdrawn"
        part.withdrawn_at = now
        part.withdrawal_reason = body.explanation
        part.row_version += 1
        audit(db, user, request, "participation.withdrawn", part)
        return serialize_participation(db, part)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/participations/{participation_id}/mark-ready-for-review", response_model=ParticipationRead)
def mark_ready_for_review(
    participation_id: UUID,
    body: ReadyRequest,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        part = read_record(db, Participation, participation_id)
        if part.student_user_id != user.id:
            fail("FORBIDDEN", "Only the participant can mark work ready for review.", 403)

    def action():
        part = read_record(db, Participation, participation_id, lock=True)
        project = read_record(db, Project, part.project_id)
        precondition(request, part)
        if part.status != "active":
            fail("INVALID_STATE", f"Cannot mark ready for review when participation is in status {part.status}.")
        if project.status != "in_progress":
            fail("INVALID_STATE", "Project is not in progress.")
        if body.requested_outcome == "completed":
            from app.assessments.service import require_complete_evidence
            require_complete_evidence(db, part, project)
        part.status = "under_review"
        part.row_version += 1
        audit(db, user, request, "participation.ready_for_review", part, requested_outcome=body.requested_outcome)
        return serialize_participation(db, part)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/participations/{participation_id}/finalize", response_model=ParticipationRead)
def finalize_participation(
    participation_id: UUID,
    body: FinalizeRequest,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        part = read_record(db, Participation, participation_id)
        require_manager(db, read_record(db, Project, part.project_id), user)

    def action():
        part = read_record(db, Participation, participation_id, lock=True)
        project = read_record(db, Project, part.project_id)
        precondition(request, part)
        if part.status != "under_review":
            fail("INVALID_STATE", f"Only participations under review can be finalized (current: {part.status}).")

        if body.outcome == "completed":
            from app.assessments.service import require_complete_evidence
            require_complete_evidence(db, part, project)

        part.status = body.outcome
        part.row_version += 1
        audit(db, user, request, "participation.finalized", part, outcome=body.outcome)
        return serialize_participation(db, part)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )
