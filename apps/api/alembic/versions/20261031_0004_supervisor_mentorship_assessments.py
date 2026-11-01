"""Supervisor checkpoints 3 and 4: mentorship, submissions, and independent reviews.

Prepared for development migration approval; never modifies existing rows.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261031_0004"
down_revision = "20261031_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('mentor_profiles',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('bio', sa.Text(), nullable=False),
    sa.Column('skills', sa.JSON(), nullable=False),
    sa.Column('availability_text', sa.String(length=200), nullable=False),
    sa.Column('weekly_review_capacity', sa.Integer(), nullable=False),
    sa.Column('directory_opt_in', sa.Boolean(), nullable=False),
    sa.Column('eligibility_status', sa.String(length=30), nullable=False),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("eligibility_status IN ('pending','approved','rejected','suspended')", name=op.f('ck_mentor_profiles_eligibility_status')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_mentor_profiles_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_mentor_profiles'))
    )
    op.create_index(op.f('ix_mentor_profiles_eligibility_status'), 'mentor_profiles', ['eligibility_status'], unique=False)
    op.create_index(op.f('ix_mentor_profiles_user_id'), 'mentor_profiles', ['user_id'], unique=True)

    op.create_table('mentor_assignments',
    sa.Column('participation_id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('mentor_user_id', sa.Uuid(), nullable=False),
    sa.Column('proposer_user_id', sa.Uuid(), nullable=False),
    sa.Column('context', sa.Text(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('conflict_declared', sa.Boolean(), nullable=True),
    sa.Column('confidentiality_acknowledged', sa.Boolean(), nullable=True),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('end_reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('proposed','accepted','declined','expired','ended')", name=op.f('ck_mentor_assignments_status')),
    sa.ForeignKeyConstraint(['mentor_user_id'], ['users.id'], name=op.f('fk_mentor_assignments_mentor_user_id')),
    sa.ForeignKeyConstraint(['participation_id'], ['participations.id'], name=op.f('fk_mentor_assignments_participation_id')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_mentor_assignments_project_id')),
    sa.ForeignKeyConstraint(['proposer_user_id'], ['users.id'], name=op.f('fk_mentor_assignments_proposer_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_mentor_assignments'))
    )
    op.create_index(op.f('ix_mentor_assignments_mentor_user_id'), 'mentor_assignments', ['mentor_user_id'], unique=False)
    op.create_index(op.f('ix_mentor_assignments_participation_id'), 'mentor_assignments', ['participation_id'], unique=False)
    op.create_index(op.f('ix_mentor_assignments_project_id'), 'mentor_assignments', ['project_id'], unique=False)
    op.create_index(op.f('ix_mentor_assignments_status'), 'mentor_assignments', ['status'], unique=False)

    op.create_table('submissions',
    sa.Column('participation_id', sa.Uuid(), nullable=False),
    sa.Column('milestone_index', sa.Integer(), nullable=False),
    sa.Column('revision_no', sa.Integer(), nullable=False),
    sa.Column('student_user_id', sa.Uuid(), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('contribution_statement', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('supersedes_submission_id', sa.Uuid(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('draft','submitted','revision_requested','withdrawn')", name=op.f('ck_submissions_status')),
    sa.ForeignKeyConstraint(['participation_id'], ['participations.id'], name=op.f('fk_submissions_participation_id')),
    sa.ForeignKeyConstraint(['student_user_id'], ['users.id'], name=op.f('fk_submissions_student_user_id')),
    sa.ForeignKeyConstraint(['supersedes_submission_id'], ['submissions.id'], name=op.f('fk_submissions_supersedes_submission_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_submissions')),
    sa.UniqueConstraint('participation_id', 'milestone_index', 'revision_no', name=op.f('uq_submissions_participation_id_milestone_index_revision_no'))
    )
    op.create_index(op.f('ix_submissions_participation_id'), 'submissions', ['participation_id'], unique=False)
    op.create_index(op.f('ix_submissions_status'), 'submissions', ['status'], unique=False)

    op.create_table('artifacts',
    sa.Column('submission_id', sa.Uuid(), nullable=False),
    sa.Column('creator_user_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('label', sa.String(length=160), nullable=False),
    sa.Column('url', sa.String(length=2048), nullable=True),
    sa.Column('excerpt', sa.Text(), nullable=True),
    sa.Column('access_class', sa.String(length=20), nullable=False),
    sa.Column('safety_status', sa.String(length=20), nullable=False),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['creator_user_id'], ['users.id'], name=op.f('fk_artifacts_creator_user_id')),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], name=op.f('fk_artifacts_submission_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_artifacts'))
    )
    op.create_index(op.f('ix_artifacts_submission_id'), 'artifacts', ['submission_id'], unique=False)

    op.create_table('mentor_reviews',
    sa.Column('submission_id', sa.Uuid(), nullable=False),
    sa.Column('assignment_id', sa.Uuid(), nullable=False),
    sa.Column('author_user_id', sa.Uuid(), nullable=False),
    sa.Column('decision', sa.String(length=30), nullable=False),
    sa.Column('observations', sa.JSON(), nullable=False),
    sa.Column('participant_feedback', sa.Text(), nullable=False),
    sa.Column('manager_summary', sa.Text(), nullable=True),
    sa.Column('supersedes_review_id', sa.Uuid(), nullable=True),
    sa.Column('correction_reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("decision IN ('reviewed','revision_requested','unable_to_assess')", name=op.f('ck_mentor_reviews_decision')),
    sa.ForeignKeyConstraint(['assignment_id'], ['mentor_assignments.id'], name=op.f('fk_mentor_reviews_assignment_id')),
    sa.ForeignKeyConstraint(['author_user_id'], ['users.id'], name=op.f('fk_mentor_reviews_author_user_id')),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], name=op.f('fk_mentor_reviews_submission_id')),
    sa.ForeignKeyConstraint(['supersedes_review_id'], ['mentor_reviews.id'], name=op.f('fk_mentor_reviews_supersedes_review_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_mentor_reviews'))
    )
    op.create_index(op.f('ix_mentor_reviews_decision'), 'mentor_reviews', ['decision'], unique=False)
    op.create_index(op.f('ix_mentor_reviews_submission_id'), 'mentor_reviews', ['submission_id'], unique=False)

    op.create_table('organization_reviews',
    sa.Column('submission_id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('reviewer_user_id', sa.Uuid(), nullable=False),
    sa.Column('decision', sa.String(length=30), nullable=False),
    sa.Column('criteria_results', sa.JSON(), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=False),
    sa.Column('supersedes_review_id', sa.Uuid(), nullable=True),
    sa.Column('correction_reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("decision IN ('accepted','revisions_requested','rejected')", name=op.f('ck_organization_reviews_decision')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_organization_reviews_project_id')),
    sa.ForeignKeyConstraint(['reviewer_user_id'], ['users.id'], name=op.f('fk_organization_reviews_reviewer_user_id')),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], name=op.f('fk_organization_reviews_submission_id')),
    sa.ForeignKeyConstraint(['supersedes_review_id'], ['organization_reviews.id'], name=op.f('fk_organization_reviews_supersedes_review_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_organization_reviews'))
    )
    op.create_index(op.f('ix_organization_reviews_decision'), 'organization_reviews', ['decision'], unique=False)
    op.create_index(op.f('ix_organization_reviews_submission_id'), 'organization_reviews', ['submission_id'], unique=False)


def downgrade():
    op.drop_table('organization_reviews')
    op.drop_table('mentor_reviews')
    op.drop_table('artifacts')
    op.drop_table('submissions')
    op.drop_table('mentor_assignments')
    op.drop_table('mentor_profiles')
