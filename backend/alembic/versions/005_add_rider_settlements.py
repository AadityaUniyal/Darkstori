"""Add rider settlements table for COD cash vault.

Revision ID: 005_rider_settlements
Revises: 004_order_events
Create Date: 2026-11-10
"""

from alembic import op
import sqlalchemy as sa


revision = "005_rider_settlements"
down_revision = "004_order_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "rider_settlements" not in tables:
        op.create_table(
            "rider_settlements",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=True),
            sa.Column("store_id", sa.Integer(), nullable=True),
            sa.Column("rider_code", sa.String(length=50), nullable=False),
            sa.Column("rider_name", sa.String(length=120), nullable=False),
            sa.Column("orders_completed", sa.Integer(), server_default="0", nullable=True),
            sa.Column("cash_due_inr", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("upi_collected_inr", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("cash_deposited_inr", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("variance_inr", sa.Float(), server_default="0.0", nullable=True),
            sa.Column("status", sa.String(length=30), server_default="SETTLED", nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("idx_rider_settlement_rider", "rider_settlements", ["rider_code"])
        op.create_index("idx_rider_settlement_store", "rider_settlements", ["store_id"])
        op.create_index("idx_rider_settlement_created", "rider_settlements", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "rider_settlements" in tables:
        op.drop_table("rider_settlements")
