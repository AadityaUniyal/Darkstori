"""Install PostgreSQL order change notifications.

Revision ID: 004_order_events
Revises: 003_tenant_ownership
Create Date: 2026-10-24
"""

from alembic import context, op
import sqlalchemy as sa


revision = "004_order_events"
down_revision = "003_tenant_ownership"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if context.is_offline_mode():
        return
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    tables = set(sa.inspect(bind).get_table_names())
    if "store_simulations" in tables:
        op.execute("ALTER TABLE store_simulations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'proposed'")
        op.execute("ALTER TABLE store_simulations ADD COLUMN IF NOT EXISTS comments TEXT")
    event_tables = ("orders_synthetic", "product_batches", "dark_stores", "competitor_stores", "stock_ledger")
    present_event_tables = [table for table in event_tables if table in tables]
    if not present_event_tables:
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    if "pincode_coverage" in tables:
        op.execute("ALTER TABLE pincode_coverage DROP CONSTRAINT IF EXISTS check_coverage")
    op.execute("""
        CREATE OR REPLACE FUNCTION notify_table_change()
        RETURNS trigger AS $$
        DECLARE payload JSON;
        BEGIN
          payload = json_build_object('table', TG_TABLE_NAME, 'action', TG_OP, 'data', row_to_json(NEW));
          PERFORM pg_notify('darkstori_events', payload::text);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    trigger_names = {
        "orders_synthetic": "trigger_order_changes",
        "product_batches": "trigger_batch_changes",
        "dark_stores": "trigger_store_changes",
        "competitor_stores": "trigger_competitor_changes",
        "stock_ledger": "trigger_stock_ledger_changes",
    }
    for table in present_event_tables:
        trigger = trigger_names[table]
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {table}")
        op.execute(f"""
            CREATE TRIGGER {trigger}
            AFTER INSERT OR UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION notify_table_change()
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        trigger_names = {
            "orders_synthetic": "trigger_order_changes",
            "product_batches": "trigger_batch_changes",
            "dark_stores": "trigger_store_changes",
            "competitor_stores": "trigger_competitor_changes",
            "stock_ledger": "trigger_stock_ledger_changes",
        }
        tables = set(sa.inspect(bind).get_table_names())
        for table, trigger in trigger_names.items():
            if table in tables:
                op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {table}")
        op.execute("DROP FUNCTION IF EXISTS notify_table_change()")
