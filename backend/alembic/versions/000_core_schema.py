"""Create core application tables before additive feature revisions.

This revision is the schema baseline for fresh installs. It uses current ORM
metadata for the legacy core schema because the project previously created
those tables at application startup without recording a baseline revision.
Feature tables owned by the following revisions are excluded so that those
revisions remain independently reviewable and reversible.

Revision ID: 000_core_schema
Revises: None
Create Date: 2026-10-24
"""

from alembic import op

from backend.database.models.models import Base


revision = "000_core_schema"
down_revision = None
branch_labels = None
depends_on = None

FEATURE_TABLES = {
    "ml_predictions",
    "ml_performance_metrics",
    "ml_feature_drift",
    "ml_training_jobs",
    "expansion_decisions",
}


def upgrade() -> None:
    bind = op.get_bind()
    core_metadata = Base.metadata
    core_metadata.create_all(bind=bind, tables=[table for table in core_metadata.sorted_tables if table.name not in FEATURE_TABLES], checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    core_metadata = Base.metadata
    core_metadata.drop_all(bind=bind, tables=[table for table in reversed(core_metadata.sorted_tables) if table.name not in FEATURE_TABLES], checkfirst=True)
