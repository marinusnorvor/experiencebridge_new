"""Mentorship router: mentor profiles, eligibility, and participation-scoped assignments."""

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.applications.models import Participation
from app.applications.schemas import OptionalReason, RequiredReason
from app.core.commands import audit, ensure_utc, execute, fail, precondition
from app.database.session import get_db
from app.identity.dependencies import get_current_user
from app.identity.models import User
from app.mentorship.models import MentorAssignment, MentorProfile
from app.mentorship.schemas import (
    AssignmentAccept,
    AssignmentCreate,
    AssignmentPage,
    AssignmentRead,
    MentorEligibilityInput,
    MentorProfileRead,
    MentorProfilePage,
    MentorProfileWrite,
)
from app.projects.models import Project
from app.projects.router import (
    command_response,
    demonstration_environment,
    headers,
    membership,
    read_record,
    require_admin,
    require_manager,
    require_member,
    serialize,
)

router = APIRouter(tags=["Mentorship"], dependencies=[Depends(demonstration_environment)])
DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]


def serialize_assignment(assignment: MentorAssignment) -> dict:
    data = serialize(assignment)
    if assignment.status == "proposed" and ensure_utc(assignment.expires_at) <= datetime.now(timezone.utc):
        data["status"] = "expired"
    return data


# ==================== MENTOR PROFILES ====================


@router.get("/me/mentor-profile", response_model=MentorProfileRead)
def get_my_mentor_profile(response: Response, db: DB, user: Actor):
    profile = db.scalar(select(MentorProfile).where(MentorProfile.user_id == user.id))
    if not profile:
        fail("NOT_FOUND", "Mentor profile not initialized.", 404)
    headers(response, profile)
    return serialize(profile)


@router.put("/me/mentor-profile", response_model=MentorProfileRead)
def put_my_mentor_profile(
    body: MentorProfileWrite,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    profile = db.scalar(select(MentorProfile).where(MentorProfile.user_id == user.id))
    if not profile:
        profile = MentorProfile(
            user_id=user.id,
            bio=body.bio,
            skills=body.skills,
            availability_text=body.availability_text,
            weekly_review_capacity=body.weekly_review_capacity,
            directory_opt_in=body.directory_opt_in,
            eligibility_status="pending",
        )
        db.add(profile)
        db.flush()
        audit(db, user, request, "mentor.profile_created", profile, directory_opt_in=body.directory_opt_in)
        db.commit()
        response.status_code = 201
        headers(response, profile)
        return serialize(profile)

    precondition(request, profile)
    profile.bio = body.bio
    profile.skills = body.skills
    profile.availability_text = body.availability_text
    profile.weekly_review_capacity = body.weekly_review_capacity
    profile.directory_opt_in = body.directory_opt_in
    profile.row_version += 1
    audit(db, user, request, "mentor.profile_updated", profile, directory_opt_in=body.directory_opt_in)
    db.commit()
    headers(response, profile)
    return serialize(profile)


@router.post("/admin/mentors/{mentor_user_id}/eligibility", response_model=MentorProfileRead)
def decide_mentor_eligibility(
    mentor_user_id: UUID,
    body: MentorEligibilityInput,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    require_admin(user)

    def action():
        profile = db.scalar(select(MentorProfile).where(MentorProfile.user_id == mentor_user_id))
        if not profile:
            fail("NOT_FOUND", "Mentor must create their own profile before eligibility review.", 404)
        precondition(request, profile)
        profile.eligibility_status = {"approve": "approved", "reject": "rejected", "suspend": "suspended"}[body.decision]
        profile.row_version += 1
        audit(db, user, request, "mentor.eligibility_decided", profile, decision=body.decision)
        return serialize(profile)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), lambda: None, action),
    )


# ==================== MENTOR ASSIGNMENTS ====================


@router.post("/participations/{participation_id}/mentor-assignments", status_code=201, response_model=AssignmentRead)
def propose_mentor_assignment(
    participation_id: UUID,
    body: AssignmentCreate,
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
        if part.status not in {"active", "under_review"}:
            fail("INVALID_STATE", f"Cannot assign mentor to participation in status {part.status}.")
        if (
            body.mentor_user_id in {part.student_user_id, project.project_manager_user_id, project.org_reviewer_user_id}
            or membership(db, project.organization_id, body.mentor_user_id)
        ):
            fail("FORBIDDEN", "Mentor must be independent from the host organization and participant.", 403)

        mentor_profile = db.scalar(select(MentorProfile).where(MentorProfile.user_id == body.mentor_user_id))
        if not mentor_profile or mentor_profile.eligibility_status != "approved":
            fail("MENTOR_NOT_ELIGIBLE", "Mentor candidate is not approved for supervision.")

        existing = db.scalar(
            select(MentorAssignment).where(
                MentorAssignment.participation_id == part.id,
                MentorAssignment.status.in_(["proposed", "accepted"]),
            )
        )
        if existing and existing.status == "proposed" and ensure_utc(existing.expires_at) <= datetime.now(timezone.utc):
            existing.status = "expired"
            existing.row_version += 1
            audit(db, user, request, "mentor.expired", existing)
        elif existing:
            fail("INVALID_STATE", "Participation already has an active or proposed mentor assignment.")

        now = datetime.now(timezone.utc)
        if body.expires_at <= now:
            fail("VALIDATION_ERROR", "Assignment proposal expires_at must be in the future.", 422)

        assignment = MentorAssignment(
            participation_id=part.id,
            project_id=project.id,
            mentor_user_id=body.mentor_user_id,
            proposer_user_id=user.id,
            context=body.context,
            expires_at=body.expires_at,
            status="proposed",
        )
        db.add(assignment)
        db.flush()
        audit(db, user, request, "mentor.proposed", assignment, participation_id=str(part.id))
        return serialize_assignment(assignment)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.get("/me/mentor-assignments", response_model=AssignmentPage)
def my_mentor_assignments(response: Response, db: DB, user: Actor):
    response.headers["Cache-Control"] = "no-store, private"
    assignments = db.scalars(
        select(MentorAssignment).where(MentorAssignment.mentor_user_id == user.id).order_by(MentorAssignment.created_at.desc())
    ).all()
    return {"items": [serialize_assignment(a) for a in assignments], "next_offset": None}


@router.get("/mentor-assignments/{assignment_id}", response_model=AssignmentRead)
def get_mentor_assignment(assignment_id: UUID, response: Response, db: DB, user: Actor):
    assignment = read_record(db, MentorAssignment, assignment_id)
    part = read_record(db, Participation, assignment.participation_id)
    project = read_record(db, Project, assignment.project_id)
    if user.id not in {assignment.mentor_user_id, part.student_user_id}:
        require_member(db, project.organization_id, user, ["owner", "project_manager", "reviewer"])
    headers(response, assignment)
    return serialize_assignment(assignment)


@router.post("/mentor-assignments/{assignment_id}/accept", response_model=AssignmentRead)
def accept_mentor_assignment(
    assignment_id: UUID,
    body: AssignmentAccept,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        assignment = read_record(db, MentorAssignment, assignment_id)
        if assignment.mentor_user_id != user.id:
            fail("FORBIDDEN", "Only the assigned mentor can accept.", 403)

    def action():
        assignment = read_record(db, MentorAssignment, assignment_id, lock=True)
        precondition(request, assignment)
        if assignment.status != "proposed":
            fail("INVALID_STATE", "Only proposed assignments can be accepted.")
        now = datetime.now(timezone.utc)
        if ensure_utc(assignment.expires_at) <= now:
            assignment.status = "expired"
            assignment.row_version += 1
            fail("ASSIGNMENT_EXPIRED", "Assignment proposal has expired.")
        if body.conflict_declared:
            fail("VALIDATION_ERROR", "Cannot accept assignment with a disqualifying conflict of interest.", 422)
        if not body.confidentiality_acknowledged:
            fail("VALIDATION_ERROR", "Must acknowledge confidentiality obligations.", 422)

        part = read_record(db, Participation, assignment.participation_id)
        project = read_record(db, Project, part.project_id)
        require_eligible_mentor(db, project, part.student_user_id, user.id)
        if part.status not in {"active", "under_review"}:
            fail("INVALID_STATE", "This participation no longer accepts mentor assignments.")
        assignment.status = "accepted"
        assignment.conflict_declared = False
        assignment.confidentiality_acknowledged = True
        assignment.accepted_at = now
        assignment.row_version += 1
        audit(db, user, request, "mentor.accepted", assignment)
        return serialize_assignment(assignment)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/mentor-assignments/{assignment_id}/decline", response_model=AssignmentRead)
def decline_mentor_assignment(
    assignment_id: UUID,
    body: OptionalReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        assignment = read_record(db, MentorAssignment, assignment_id)
        if assignment.mentor_user_id != user.id:
            fail("FORBIDDEN", "Only the assigned mentor can decline.", 403)

    def action():
        assignment = read_record(db, MentorAssignment, assignment_id, lock=True)
        precondition(request, assignment)
        if assignment.status != "proposed":
            fail("INVALID_STATE", "Only proposed assignments can be declined.")
        assignment.status = "declined"
        assignment.end_reason = body.explanation
        assignment.row_version += 1
        audit(db, user, request, "mentor.declined", assignment)
        return serialize_assignment(assignment)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.post("/mentor-assignments/{assignment_id}/end", response_model=AssignmentRead)
def end_mentor_assignment(
    assignment_id: UUID,
    body: RequiredReason,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        assignment = read_record(db, MentorAssignment, assignment_id)
        project = read_record(db, Project, assignment.project_id)
        if assignment.mentor_user_id != user.id:
            require_manager(db, project, user)

    def action():
        assignment = read_record(db, MentorAssignment, assignment_id, lock=True)
        precondition(request, assignment)
        if assignment.status != "accepted":
            fail("INVALID_STATE", "Only active accepted assignments can be ended.")
        assignment.status = "ended"
        assignment.end_reason = body.explanation
        assignment.row_version += 1
        audit(db, user, request, "mentor.ended", assignment)
        return serialize_assignment(assignment)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


def require_eligible_mentor(db, project, student_id, mentor_id):
    profile = db.scalar(select(MentorProfile).where(MentorProfile.user_id == mentor_id))
    mentor = db.get(User, mentor_id)
    if not profile or profile.eligibility_status != "approved" or not mentor or mentor.account_status != "active":
        fail("MENTOR_NOT_ELIGIBLE", "Mentor must have current approved eligibility.", 403)
    if mentor_id in {student_id, project.project_manager_user_id, project.org_reviewer_user_id} or membership(db, project.organization_id, mentor_id):
        fail("FORBIDDEN", "Mentor must remain independent of the organization and participant.", 403)


@router.get("/admin/mentors", response_model=MentorProfilePage)
def mentor_eligibility_queue(response: Response, db: DB, user: Actor):
    require_admin(user)
    response.headers["Cache-Control"] = "no-store, private"
    profiles = db.scalars(select(MentorProfile).order_by(MentorProfile.created_at.desc())).all()
    return {"items": [serialize(p) for p in profiles]}


@router.get("/organizations/{org_id}/mentors", response_model=MentorProfilePage)
def organization_mentor_directory(org_id: UUID, response: Response, db: DB, user: Actor):
    require_member(db, org_id, user, ["owner", "project_manager"])
    response.headers["Cache-Control"] = "no-store, private"
    profiles = db.scalars(select(MentorProfile).join(User, User.id == MentorProfile.user_id).where(
        MentorProfile.eligibility_status == "approved", MentorProfile.directory_opt_in.is_(True), User.account_status == "active",
    ).order_by(MentorProfile.created_at.desc())).all()
    return {"items": [serialize(p) for p in profiles if not membership(db, org_id, p.user_id)]}


@router.get("/participations/{participation_id}/mentor-assignments", response_model=AssignmentPage)
def participation_mentor_assignments(participation_id: UUID, response: Response, db: DB, user: Actor):
    part = read_record(db, Participation, participation_id)
    project = read_record(db, Project, part.project_id)
    if user.id != part.student_user_id:
        if user.id in {project.project_manager_user_id, project.org_reviewer_user_id}:
            require_member(db, project.organization_id, user, ["owner", "project_manager", "reviewer"])
        else:
            require_member(db, project.organization_id, user, ["owner"])
    response.headers["Cache-Control"] = "no-store, private"
    assignments = db.scalars(select(MentorAssignment).where(MentorAssignment.participation_id == part.id).order_by(MentorAssignment.created_at.desc())).all()
    return {"items": [serialize_assignment(a) for a in assignments], "next_offset": None}
