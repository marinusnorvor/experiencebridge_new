"""Evidence checks shared by completion request and finalization."""
from sqlalchemy import select
from app.assessments.models import Submission, MentorReview, OrganizationReview
from app.core.commands import fail


def require_complete_evidence(db, part, project):
    for index in range(len(project.scope.get("milestones", []))):
        submission = db.scalar(select(Submission).where(Submission.participation_id == part.id, Submission.milestone_index == index).order_by(Submission.revision_no.desc()).limit(1))
        mentor = organization = None
        if submission and submission.status == "submitted":
            mentor = db.scalar(select(MentorReview).where(MentorReview.submission_id == submission.id).order_by(MentorReview.created_at.desc(), MentorReview.id.desc()).limit(1))
            organization = db.scalar(select(OrganizationReview).where(OrganizationReview.submission_id == submission.id).order_by(OrganizationReview.created_at.desc(), OrganizationReview.id.desc()).limit(1))
        if not mentor or mentor.decision != "reviewed" or not organization or organization.decision != "accepted":
            fail("COMPLETION_BLOCKED", f"Milestone {index + 1} needs current mentor review and organization acceptance on its latest submitted revision.")
