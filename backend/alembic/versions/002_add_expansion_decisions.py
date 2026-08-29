"""add expansion decisions table

Revision ID: 002_expansion_decisions
Revises: 001_ml_tracking
Create Date: 2026-08-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "002_expansion_decisions"
down_revision = "001_ml_tracking"
branch_labels = None
depends_on = None


def get_json_type():
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return sa.JSON()
    return postgresql.JSONB()


def upgrade() -> None:
    op.create_table(
        "expansion_decisions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), sa.ForeignKey("neighborhoods.neighborhood_id"), nullable=True),
        sa.Column("neighborhood_name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("opportunity_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("demand_estimate", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("coverage_gain_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cannibalization_risk_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("roi_12_months_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("breakeven_months", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("capex", sa.Float(), nullable=False, server_default="0"),
        sa.Column("store_size_sqft", sa.Integer(), nullable=False, server_default="1500"),
        sa.Column("logistics_constraint_mins", sa.Float(), nullable=False, server_default="15"),
        sa.Column("simulation_id", sa.Integer(), sa.ForeignKey("store_simulations.simulation_id"), nullable=True),
        sa.Column("approved_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("decision_payload", get_json_type(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_expansion_decision_city_status", "expansion_decisions", ["city", "status"])
    op.create_index("idx_expansion_decision_created", "expansion_decisions", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_expansion_decision_created", table_name="expansion_decisions")
    op.drop_index("idx_expansion_decision_city_status", table_name="expansion_decisions")
    op.drop_table("expansion_decisions")
