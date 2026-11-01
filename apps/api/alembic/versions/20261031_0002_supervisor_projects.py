"""Supervisor checkpoint 1: synthetic organization/project persistence.

Prepared for development migration approval; never modifies existing identity rows.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261031_0002"
down_revision = "20261026_0001"
branch_labels = None
depends_on = None


def upgrade():
    # Additive supervisor schema; no identity data or schema modifications.
    op.create_table('audit_events',
    sa.Column('actor_user_id', sa.Uuid(), nullable=False),
    sa.Column('event_type', sa.String(length=80), nullable=False),
    sa.Column('entity_id', sa.Uuid(), nullable=False),
    sa.Column('request_id', sa.String(length=64), nullable=False),
    sa.Column('details', sa.JSON(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name=op.f('fk_audit_events_actor_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_events'))
    )
    op.create_table('idempotency_records',
    sa.Column('actor_user_id', sa.Uuid(), nullable=False),
    sa.Column('path', sa.String(length=240), nullable=False),
    sa.Column('key_hash', sa.String(length=64), nullable=False),
    sa.Column('request_hash', sa.String(length=64), nullable=False),
    sa.Column('response_body', sa.JSON(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name=op.f('fk_idempotency_records_actor_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_idempotency_records')),
    sa.UniqueConstraint('actor_user_id', 'path', 'key_hash', name=op.f('uq_idempotency_records_actor_user_id_path_key_hash'))
    )
    op.create_table('organizations',
    sa.Column('display_name', sa.String(length=160), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('created_by_user_id', sa.Uuid(), nullable=False),
    sa.Column('verification_status', sa.String(length=30), nullable=False),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("verification_status IN ('draft','submitted','verified','changes_requested','rejected')", name=op.f('ck_organizations_verification_status')),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name=op.f('fk_organizations_created_by_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_organizations'))
    )
    op.create_table('organization_memberships',
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('role', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("role IN ('owner','project_manager','reviewer')", name=op.f('ck_organization_memberships_role')),
    sa.CheckConstraint("status IN ('active','removed')", name=op.f('ck_organization_memberships_status')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_organization_memberships_organization_id')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_organization_memberships_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_organization_memberships')),
    sa.UniqueConstraint('organization_id', 'user_id', 'role', name=op.f('uq_organization_memberships_organization_id_user_id_role'))
    )
    op.create_index(op.f('ix_organization_memberships_organization_id'), 'organization_memberships', ['organization_id'], unique=False)
    op.create_index(op.f('ix_organization_memberships_user_id'), 'organization_memberships', ['user_id'], unique=False)
    op.create_table('projects',
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('project_manager_user_id', sa.Uuid(), nullable=False),
    sa.Column('org_reviewer_user_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=180), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('capacity', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('scope', sa.JSON(), nullable=False),
    sa.Column('submitted_terms_version', sa.Integer(), nullable=True),
    sa.Column('published_terms_version', sa.Integer(), nullable=True),
    sa.Column('data_origin', sa.String(length=20), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('draft','pending_review','changes_requested','rejected','open','in_progress','completed','cancelled')", name=op.f('ck_projects_status')),
    sa.CheckConstraint('capacity > 0 AND capacity <= 100', name=op.f('ck_projects_capacity')),
    sa.ForeignKeyConstraint(['org_reviewer_user_id'], ['users.id'], name=op.f('fk_projects_org_reviewer_user_id')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_projects_organization_id')),
    sa.ForeignKeyConstraint(['project_manager_user_id'], ['users.id'], name=op.f('fk_projects_project_manager_user_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_projects'))
    )
    op.create_index(op.f('ix_projects_organization_id'), 'projects', ['organization_id'], unique=False)
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False)
    op.create_table('project_terms_versions',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('version_no', sa.Integer(), nullable=False),
    sa.Column('snapshot', sa.JSON(), nullable=False),
    sa.Column('content_hash', sa.String(length=64), nullable=False),
    sa.Column('created_by_user_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name=op.f('fk_project_terms_versions_created_by_user_id')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_project_terms_versions_project_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_project_terms_versions')),
    sa.UniqueConstraint('project_id', 'version_no', name=op.f('uq_project_terms_versions_project_id_version_no'))
    )
    op.create_index(op.f('ix_project_terms_versions_project_id'), 'project_terms_versions', ['project_id'], unique=False)
    op.create_table('moderation_decisions',
    sa.Column('organization_id', sa.Uuid(), nullable=True),
    sa.Column('project_id', sa.Uuid(), nullable=True),
    sa.Column('terms_version_id', sa.Uuid(), nullable=True),
    sa.Column('admin_user_id', sa.Uuid(), nullable=False),
    sa.Column('decision', sa.String(length=30), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('row_version', sa.Integer(), nullable=False),
    sa.CheckConstraint('(organization_id IS NOT NULL AND project_id IS NULL) OR (organization_id IS NULL AND project_id IS NOT NULL)', name=op.f('ck_moderation_decisions_one_target')),
    sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], name=op.f('fk_moderation_decisions_admin_user_id')),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name=op.f('fk_moderation_decisions_organization_id')),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name=op.f('fk_moderation_decisions_project_id')),
    sa.ForeignKeyConstraint(['terms_version_id'], ['project_terms_versions.id'], name=op.f('fk_moderation_decisions_terms_version_id')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_moderation_decisions'))
    )


def downgrade():
    # Destructive rollback: requires separate approval once real records exist.
    op.drop_table('moderation_decisions')
    op.drop_index(op.f('ix_project_terms_versions_project_id'), table_name='project_terms_versions')
    op.drop_table('project_terms_versions')
    op.drop_index(op.f('ix_projects_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_organization_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_index(op.f('ix_organization_memberships_user_id'), table_name='organization_memberships')
    op.drop_index(op.f('ix_organization_memberships_organization_id'), table_name='organization_memberships')
    op.drop_table('organization_memberships')
    op.drop_table('organizations')
    op.drop_table('idempotency_records')
    op.drop_table('audit_events')
