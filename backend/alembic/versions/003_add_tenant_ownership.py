"""Add explicit organization ownership to tenant-owned workflows.

Revision ID: 003_tenant_ownership
Revises: 002_expansion_decisions
Create Date: 2026-10-24
"""

from alembic import context, op
import sqlalchemy as sa


revision = "003_tenant_ownership"
down_revision = "002_expansion_decisions"
branch_labels = None
depends_on = None

TENANT_TABLES = (
    "store_simulations",
    "audit_logs",
    "stock_ledger",
    "playbooks",
    "playbook_executions",
    "cannibalization_simulations",
    "expansion_decisions",
)

# Backfill only where existing relational ownership is unambiguous. Historic
# simulations/expansion scenarios have no creator or owning store, so they stay
# unassigned and must not be exposed to any tenant by default.
OWNERSHIP_BACKFILLS = {
    "audit_logs": """
        UPDATE audit_logs
        SET organization_id = (SELECT users.organization_id FROM users WHERE users.id = audit_logs.user_id)
        WHERE organization_id IS NULL AND user_id IS NOT NULL
    """,
    "cannibalization_simulations": """
        UPDATE cannibalization_simulations
        SET organization_id = (SELECT users.organization_id FROM users WHERE users.id = cannibalization_simulations.created_by)
        WHERE organization_id IS NULL AND created_by IS NOT NULL
    """,
    "playbooks": """
        UPDATE playbooks
        SET organization_id = (SELECT users.organization_id FROM users WHERE users.id = playbooks.created_by)
        WHERE organization_id IS NULL AND created_by IS NOT NULL
    """,
    "playbook_executions": """
        UPDATE playbook_executions
        SET organization_id = (
            SELECT users.organization_id
            FROM playbooks
            JOIN users ON users.id = playbooks.created_by
            WHERE playbooks.id = playbook_executions.playbook_id
        )
        WHERE organization_id IS NULL AND playbook_id IS NOT NULL
    """,
    "stock_ledger": """
        UPDATE stock_ledger
        SET organization_id = (SELECT dark_stores.organization_id FROM dark_stores WHERE dark_stores.id = stock_ledger.store_id)
        WHERE organization_id IS NULL AND store_id IS NOT NULL
    """,
}


def upgrade() -> None:
    if context.is_offline_mode():
        for table in TENANT_TABLES:
            index_name = f"ix_{table}_organization_id"
            with op.batch_alter_table(table) as batch:
                batch.add_column(sa.Column("organization_id", sa.Integer(), nullable=True))
                batch.create_foreign_key(
                    f"fk_{table}_organization_id_organizations",
                    "organizations",
                    ["organization_id"],
                    ["id"],
                )
                batch.create_index(index_name, ["organization_id"])
        for table, statement in OWNERSHIP_BACKFILLS.items():
            op.execute(sa.text(statement))
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    for table in TENANT_TABLES:
        if table not in existing_tables:
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table)}
        index_name = f"ix_{table}_organization_id"
        existing_indexes = {index["name"] for index in inspector.get_indexes(table)}
        needs_column = "organization_id" not in existing_columns
        needs_index = index_name not in existing_indexes
        if not needs_column and not needs_index:
            continue
        with op.batch_alter_table(table, recreate="always" if bind.dialect.name == "sqlite" else "auto") as batch:
            if needs_column:
                batch.add_column(sa.Column("organization_id", sa.Integer(), nullable=True))
                batch.create_foreign_key(
                    f"fk_{table}_organization_id_organizations",
                    "organizations",
                    ["organization_id"],
                    ["id"],
                )
            if needs_index:
                batch.create_index(index_name, ["organization_id"])

    for table, statement in OWNERSHIP_BACKFILLS.items():
        if table in existing_tables:
            op.execute(sa.text(statement))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    for table in reversed(TENANT_TABLES):
        if table not in existing_tables:
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table)}
        if "organization_id" not in existing_columns:
            continue
        indexes = {index["name"] for index in inspector.get_indexes(table)}
        foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys(table) if fk["name"]}
        with op.batch_alter_table(table, recreate="always" if bind.dialect.name == "sqlite" else "auto") as batch:
            if f"ix_{table}_organization_id" in indexes:
                batch.drop_index(f"ix_{table}_organization_id")
            constraint = f"fk_{table}_organization_id_organizations"
            if constraint in foreign_keys:
                batch.drop_constraint(constraint, type_="foreignkey")
            batch.drop_column("organization_id")
