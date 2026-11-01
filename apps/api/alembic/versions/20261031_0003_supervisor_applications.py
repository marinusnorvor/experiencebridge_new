"""Supervisor checkpoint 2: applications, offers, explicit consent, and participations.

Prepared for development migration approval; never modifies existing rows.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261031_0003"
down_revision = "20261031_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('applications',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('student_user_id', sa.Uuid(), nullable=False),
    sa.Column('seen_terms_version_id', sa.Uuid(), nullable=False),
    sa.Column('motivation', sa.Text(), nullable=False),
    sa.Column('declared_skills', sa.JSON(), nullable=False),
    sa.Column('links', sa.JSON(), nullable=False),
    sa.Column('weekly_minutes_available', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('submitted','under_review','shortlisted','rejected','offered','withdrawn')", name=op.f('ck_applications_status')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_applications_project_id')),
    sa.ForeignKeyConstraint(['seen_terms_version_id'], ['project_terms_versions.id'], name=op.f('fk_applications_seen_terms_version_id')),
    sa.ForeignKeyConstraint(['student_user_id'], ['users.id'], name=op.f('fk_applications_student_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_applications')),
    sa.UniqueConstraint('project_id', 'student_user_id', name=op.f('uq_applications_project_id_student_user_id'))
    )
    op.create_index(op.f('ix_applications_project_id'), 'applications', ['project_id'], unique=False)
    op.create_index(op.f('ix_applications_status'), 'applications', ['status'], unique=False)
    op.create_index(op.f('ix_applications_student_user_id'), 'applications', ['student_user_id'], unique=False)

    op.create_table('offers',
    sa.Column('application_id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('student_user_id', sa.Uuid(), nullable=False),
    sa.Column('terms_version_id', sa.Uuid(), nullable=False),
    sa.Column('terms_hash', sa.String(length=64), nullable=False),
    sa.Column('issued_by_user_id', sa.Uuid(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('offered','accepted','declined','expired','revoked')", name=op.f('ck_offers_status')),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_offers_application_id')),
    sa.ForeignKeyConstraint(['issued_by_user_id'], ['users.id'], name=op.f('fk_offers_issued_by_user_id')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_offers_project_id')),
    sa.ForeignKeyConstraint(['student_user_id'], ['users.id'], name=op.f('fk_offers_student_user_id')),
    sa.ForeignKeyConstraint(['terms_version_id'], ['project_terms_versions.id'], name=op.f('fk_offers_terms_version_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_offers'))
    )
    op.create_index(op.f('ix_offers_application_id'), 'offers', ['application_id'], unique=False)
    op.create_index(op.f('ix_offers_project_id'), 'offers', ['project_id'], unique=False)
    op.create_index(op.f('ix_offers_student_user_id'), 'offers', ['student_user_id'], unique=False)
    op.create_index('uq_offers_live_application', 'offers', ['application_id'], unique=True,
                    postgresql_where=sa.text("status = 'offered'"), sqlite_where=sa.text("status = 'offered'"))
    op.create_index('uq_offers_accepted_application', 'offers', ['application_id'], unique=True,
                    postgresql_where=sa.text("status = 'accepted'"), sqlite_where=sa.text("status = 'accepted'"))

    op.create_table('participations',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('student_user_id', sa.Uuid(), nullable=False),
    sa.Column('offer_id', sa.Uuid(), nullable=False),
    sa.Column('accepted_terms_version_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('withdrawal_reason', sa.Text(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('active','under_review','completed','partially_completed','withdrawn','cancelled')", name=op.f('ck_participations_status')),
    sa.ForeignKeyConstraint(['accepted_terms_version_id'], ['project_terms_versions.id'], name=op.f('fk_participations_accepted_terms_version_id')),
    sa.ForeignKeyConstraint(['offer_id'], ['offers.id'], name=op.f('fk_participations_offer_id')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_participations_project_id')),
    sa.ForeignKeyConstraint(['student_user_id'], ['users.id'], name=op.f('fk_participations_student_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_participations')),
    sa.UniqueConstraint('offer_id', name=op.f('uq_participations_offer_id')),
    sa.UniqueConstraint('project_id', 'student_user_id', name=op.f('uq_participations_project_id_student_user_id'))
    )
    op.create_index(op.f('ix_participations_project_id'), 'participations', ['project_id'], unique=False)
    op.create_index(op.f('ix_participations_student_user_id'), 'participations', ['student_user_id'], unique=False)

    op.create_table('terms_acceptances',
    sa.Column('offer_id', sa.Uuid(), nullable=False),
    sa.Column('participation_id', sa.Uuid(), nullable=False),
    sa.Column('student_user_id', sa.Uuid(), nullable=False),
    sa.Column('terms_version_id', sa.Uuid(), nullable=False),
    sa.Column('terms_hash', sa.String(length=64), nullable=False),
    sa.Column('consent_statement_version', sa.String(length=40), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['offer_id'], ['offers.id'], name=op.f('fk_terms_acceptances_offer_id')),
    sa.ForeignKeyConstraint(['participation_id'], ['participations.id'], name=op.f('fk_terms_acceptances_participation_id')),
    sa.ForeignKeyConstraint(['student_user_id'], ['users.id'], name=op.f('fk_terms_acceptances_student_user_id')),
    sa.ForeignKeyConstraint(['terms_version_id'], ['project_terms_versions.id'], name=op.f('fk_terms_acceptances_terms_version_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_terms_acceptances')),
    sa.UniqueConstraint('offer_id', name=op.f('uq_terms_acceptances_offer_id')),
    sa.UniqueConstraint('participation_id', name=op.f('uq_terms_acceptances_participation_id'))
    )


def downgrade():
    op.drop_table('terms_acceptances')
    op.drop_index(op.f('ix_participations_student_user_id'), table_name='participations')
    op.drop_index(op.f('ix_participations_project_id'), table_name='participations')
    op.drop_table('participations')
    op.drop_index('uq_offers_accepted_application', table_name='offers')
    op.drop_index('uq_offers_live_application', table_name='offers')
    op.drop_index(op.f('ix_offers_student_user_id'), table_name='offers')
    op.drop_index(op.f('ix_offers_project_id'), table_name='offers')
    op.drop_index(op.f('ix_offers_application_id'), table_name='offers')
    op.drop_table('offers')
    op.drop_index(op.f('ix_applications_student_user_id'), table_name='applications')
    op.drop_index(op.f('ix_applications_status'), table_name='applications')
    op.drop_index(op.f('ix_applications_project_id'), table_name='applications')
    op.drop_table('applications')
