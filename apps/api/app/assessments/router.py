"""Assessments router: submissions, artifacts, and independent mentor/organization reviews."""

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.applications.models import Participation
from app.assessments.models import Artifact, MentorReview, OrganizationReview, Submission
from app.assessments.schemas import (
    ArtifactCreate,
    ArtifactRead,
    MentorReviewCreate,
    MentorReviewPage,
    MentorReviewView,
    OrganizationReviewCreate,
    OrganizationReviewPage,
    OrganizationReviewRead,
    SubmissionCreate,
    SubmissionPage,
    SubmissionPatch,
    SubmissionRead,
)
from app.core.commands import audit, ensure_utc, execute, fail, precondition
from app.database.session import get_db
from app.identity.dependencies import get_current_user
from app.identity.models import User
from app.mentorship.models import MentorAssignment
from app.projects.models import Project
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

router = APIRouter(tags=["Assessments & Reviews"], dependencies=[Depends(demonstration_environment)])
DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]


def serialize_submission(db: Session, sub: Submission) -> dict:
    data = serialize(sub)
    artifacts = db.scalars(select(Artifact).where(Artifact.submission_id == sub.id).order_by(Artifact.created_at.asc())).all()
    data["artifacts"] = [serialize(a) for a in artifacts]
    return data


def require_workspace(db: Session, part: Participation, user: User) -> tuple[Project, MentorAssignment | None]:
    project = read_record(db, Project, part.project_id)
    assignment = db.scalar(
        select(MentorAssignment).where(
            MentorAssignment.participation_id == part.id,
            MentorAssignment.status == "accepted",
        )
    )
    is_student = part.student_user_id == user.id
    is_mentor = assignment and assignment.mentor_user_id == user.id
    is_manager = project.project_manager_user_id == user.id
    is_reviewer = project.org_reviewer_user_id == user.id
    is_owner = bool(membership(db, project.organization_id, user.id, ["owner"]))

    if not (is_student or is_mentor or is_manager or is_reviewer or is_owner):
        fail("NOT_FOUND", "Submission unavailable.", 404)
    return project, assignment


# ==================== SUBMISSIONS ====================


@router.post("/participations/{participation_id}/submissions", status_code=201, response_model=SubmissionRead)
def create_submission(
    participation_id: UUID,
    body: SubmissionCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        part = read_record(db, Participation, participation_id)
        if part.student_user_id != user.id:
            fail("FORBIDDEN", "Only the participant can create submissions.", 403)

    def action():
        part = read_record(db, Participation, participation_id, lock=True)
        project = read_record(db, Project, part.project_id)
        precondition(request, part)
        if part.status != "active":
            fail("INVALID_STATE", "Submissions can only be created for active participations.")
        if project.status != "in_progress":
            fail("INVALID_STATE", "Project must be in progress to create submissions.")
        assignment = db.scalar(
            select(MentorAssignment).where(
                MentorAssignment.participation_id == part.id,
                MentorAssignment.status == "accepted",
            )
        )
        if not assignment:
            fail("MENTOR_REQUIRED", "Submissions require an accepted mentor assignment.")
        milestones = project.scope.get("milestones", [])
        if body.milestone_index < 0 or body.milestone_index >= len(milestones):
            fail("VALIDATION_ERROR", f"Invalid milestone index {body.milestone_index}.", 422)

        existing_draft = db.scalar(
            select(Submission).where(
                Submission.participation_id == part.id,
                Submission.milestone_index == body.milestone_index,
                Submission.status == "draft",
            )
        )
        if existing_draft:
            fail("INVALID_STATE", "A draft submission already exists for this milestone.")

        max_rev = db.scalar(
            select(func.max(Submission.revision_no)).where(
                Submission.participation_id == part.id,
                Submission.milestone_index == body.milestone_index,
            )
        ) or 0

        submission = Submission(
            participation_id=part.id,
            milestone_index=body.milestone_index,
            revision_no=max_rev + 1,
            student_user_id=user.id,
            summary=body.summary,
            contribution_statement=body.contribution_statement,
            status="draft",
        )
        db.add(submission)
        db.flush()
        audit(db, user, request, "submission.created", submission, milestone_index=body.milestone_index)
        return serialize_submission(db, submission)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.get("/participations/{participation_id}/submissions", response_model=SubmissionPage)
def list_participation_submissions(participation_id: UUID, response: Response, db: DB, user: Actor):
    part = read_record(db, Participation, participation_id)
    require_workspace(db, part, user)
    response.headers["Cache-Control"] = "no-store, private"
    subs = db.scalars(
        select(Submission).where(Submission.participation_id == participation_id).order_by(Submission.milestone_index.asc(), Submission.revision_no.asc())
    ).all()
    return {"items": [serialize_submission(db, s) for s in subs], "next_offset": None}


@router.get("/submissions/{submission_id}", response_model=SubmissionRead)
def get_submission(submission_id: UUID, response: Response, db: DB, user: Actor):
    sub = read_record(db, Submission, submission_id)
    part = read_record(db, Participation, sub.participation_id)
    require_workspace(db, part, user)
    headers(response, sub)
    return serialize_submission(db, sub)


@router.patch("/submissions/{submission_id}", response_model=SubmissionRead)
def patch_submission(
    submission_id: UUID,
    body: SubmissionPatch,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    sub = read_record(db, Submission, submission_id)
    if sub.student_user_id != user.id:
        fail("FORBIDDEN", "Only the author can edit this submission draft.", 403)
    sub = read_record(db, Submission, submission_id, lock=True)
    precondition(request, sub)
    if sub.status != "draft":
        fail("INVALID_STATE", "Only draft submissions can be edited.")
    if body.summary is not None:
        sub.summary = body.summary
    if body.contribution_statement is not None:
        sub.contribution_statement = body.contribution_statement
    sub.row_version += 1
    db.commit()
    audit(db, user, request, "submission.draft_updated", sub)
    headers(response, sub)
    return serialize_submission(db, sub)


@router.post("/submissions/{submission_id}/external-artifacts", status_code=201, response_model=ArtifactRead)
def add_artifact(
    submission_id: UUID,
    body: ArtifactCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        sub = read_record(db, Submission, submission_id)
        if sub.student_user_id != user.id:
            fail("FORBIDDEN", "Only the author can add artifacts.", 403)

    def action():
        sub = read_record(db, Submission, submission_id, lock=True)
        if sub.status != "draft":
            fail("INVALID_STATE", "Artifacts can only be added to draft submissions.")
        artifact = Artifact(
            submission_id=sub.id,
            creator_user_id=user.id,
            kind=body.kind,
            label=body.label,
            url=str(body.url) if body.url else None,
            excerpt=body.excerpt,
        )
        db.add(artifact)
        db.flush()
        audit(db, user, request, "artifact.created", artifact, submission_id=str(sub.id))
        return serialize(artifact)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.delete("/submissions/{submission_id}/external-artifacts/{artifact_id}", status_code=204)
def delete_artifact(
    submission_id: UUID,
    artifact_id: UUID,
    request: Request,
    db: DB,
    user: Actor,
):
    sub = read_record(db, Submission, submission_id, lock=True)
    if sub.student_user_id != user.id:
        fail("FORBIDDEN", "Only the author can remove artifacts.", 403)
    if sub.status != "draft":
        fail("INVALID_STATE", "Artifacts can only be removed from draft submissions.")
    artifact = read_record(db, Artifact, artifact_id)
    if artifact.submission_id != sub.id:
        fail("NOT_FOUND", "Artifact does not belong to this submission.", 404)
    db.delete(artifact)
    db.commit()
    return Response(status_code=204)


@router.post("/submissions/{submission_id}/submit", response_model=SubmissionRead)
def submit_submission(
    submission_id: UUID,
    body: Empty,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        sub = read_record(db, Submission, submission_id)
        if sub.student_user_id != user.id:
            fail("FORBIDDEN", "Only the author can submit.", 403)

    def action():
        sub = read_record(db, Submission, submission_id, lock=True)
        precondition(request, sub)
        if sub.status != "draft":
            fail("INVALID_STATE", "Only draft submissions can be submitted.")
        artifact_count = db.scalar(select(func.count(Artifact.id)).where(Artifact.submission_id == sub.id)) or 0
        if artifact_count == 0:
            fail("VALIDATION_ERROR", "Submission must include at least one external artifact or text excerpt.", 422)
        sub.status = "submitted"
        sub.submitted_at = datetime.now(timezone.utc)
        sub.row_version += 1
        audit(db, user, request, "submission.submitted", sub)
        return serialize_submission(db, sub)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


# ==================== INDEPENDENT REVIEWS ====================


@router.post("/submissions/{submission_id}/mentor-reviews", status_code=201, response_model=MentorReviewView)
def create_mentor_review(
    submission_id: UUID,
    body: MentorReviewCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        sub = read_record(db, Submission, submission_id)
        part = read_record(db, Participation, sub.participation_id)
        assignment = db.scalar(
            select(MentorAssignment).where(
                MentorAssignment.participation_id == part.id,
                MentorAssignment.status == "accepted",
            )
        )
        if not assignment or assignment.mentor_user_id != user.id:
            fail("FORBIDDEN", "Only the accepted mentor for this participation can submit mentor reviews.", 403)

    def action():
        sub = read_record(db, Submission, submission_id, lock=True)
        part = read_record(db, Participation, sub.participation_id)
        assignment = db.scalar(
            select(MentorAssignment).where(
                MentorAssignment.participation_id == part.id,
                MentorAssignment.status == "accepted",
            )
        )
        precondition(request, sub)
        if sub.status not in {"submitted", "revision_requested"}:
            fail("INVALID_STATE", f"Cannot review a submission in status {sub.status}.")

        review = MentorReview(
            submission_id=sub.id,
            assignment_id=assignment.id,
            author_user_id=user.id,
            decision=body.decision,
            observations=[obs.model_dump(mode="json") for obs in body.observations],
            participant_feedback=body.participant_feedback,
            manager_summary=body.manager_summary,
        )
        db.add(review)
        if body.decision == "revision_requested":
            sub.status = "revision_requested"
        sub.row_version += 1
        db.flush()
        audit(db, user, request, "mentor_review.recorded", review, decision=body.decision)
        res = serialize(review)
        return res

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.get("/submissions/{submission_id}/mentor-reviews", response_model=MentorReviewPage)
def list_mentor_reviews(submission_id: UUID, response: Response, db: DB, user: Actor):
    sub = read_record(db, Submission, submission_id)
    part = read_record(db, Participation, sub.participation_id)
    project, assignment = require_workspace(db, part, user)

    is_student_or_author = part.student_user_id == user.id or (assignment and assignment.mentor_user_id == user.id)

    response.headers["Cache-Control"] = "no-store, private"
    reviews = db.scalars(select(MentorReview).where(MentorReview.submission_id == submission_id).order_by(MentorReview.created_at.desc())).all()

    items = []
    for r in reviews:
        data = serialize(r)
        if not is_student_or_author:
            data["participant_feedback"] = None  # Redacted from manager/reviewer
        items.append(data)
    return {"items": items, "next_offset": None}


@router.post("/submissions/{submission_id}/organization-reviews", status_code=201, response_model=OrganizationReviewRead)
def create_organization_review(
    submission_id: UUID,
    body: OrganizationReviewCreate,
    request: Request,
    response: Response,
    db: DB,
    user: Actor,
):
    def authorize():
        sub = read_record(db, Submission, submission_id)
        part = read_record(db, Participation, sub.participation_id)
        project = read_record(db, Project, part.project_id)
        if project.org_reviewer_user_id != user.id:
            fail("FORBIDDEN", "Only the assigned organization reviewer can review deliverables.", 403)

    def action():
        sub = read_record(db, Submission, submission_id, lock=True)
        part = read_record(db, Participation, sub.participation_id)
        project = read_record(db, Project, part.project_id)
        precondition(request, sub)
        if sub.status not in {"submitted", "revision_requested"}:
            fail("INVALID_STATE", f"Cannot review a submission in status {sub.status}.")

        if body.decision == "accepted":
            # Organization acceptance requires an existing current mentor decision on the same revision
            mentor_rev = db.scalar(select(MentorReview).where(MentorReview.submission_id == sub.id))
            if not mentor_rev:
                fail("INVALID_STATE", "Deliverable acceptance requires a prior mentor review on this submission.")

        review = OrganizationReview(
            submission_id=sub.id,
            project_id=project.id,
            reviewer_user_id=user.id,
            decision=body.decision,
            criteria_results=[c.model_dump(mode="json") for c in body.criteria_results],
            explanation=body.explanation,
        )
        db.add(review)
        if body.decision == "revisions_requested":
            sub.status = "revision_requested"
        sub.row_version += 1
        db.flush()
        audit(db, user, request, "organization_review.recorded", review, decision=body.decision)
        return serialize(review)

    return command_response(
        response,
        execute(db, user, request, body.model_dump(mode="json"), authorize, action),
    )


@router.get("/submissions/{submission_id}/organization-reviews", response_model=OrganizationReviewPage)
def list_organization_reviews(submission_id: UUID, response: Response, db: DB, user: Actor):
    sub = read_record(db, Submission, submission_id)
    part = read_record(db, Participation, sub.participation_id)
    require_workspace(db, part, user)

    response.headers["Cache-Control"] = "no-store, private"
    reviews = db.scalars(select(OrganizationReview).where(OrganizationReview.submission_id == submission_id).order_by(OrganizationReview.created_at.desc())).all()
    return {"items": [serialize(r) for r in reviews], "next_offset": None}
