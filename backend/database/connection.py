"""Database connection management."""

<<<<<<< HEAD
from typing import Optional
=======
>>>>>>> b93c871 (Cleanup: prepare for push, ensure no secret keys exposed)
from urllib.parse import urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.core.config import settings
from backend.core.logger import logger


# Convert PostgreSQL URL to async format and handle SSL
def convert_to_async_url(url: str) -> str:
    """Convert PostgreSQL URL to asyncpg format, stripping sslmode param."""
    parsed = urlparse(url)
    # Strip sslmode — asyncpg uses connect_args={"ssl": True} instead
    if parsed.query:
        params = [p for p in parsed.query.split("&") if not p.startswith("sslmode=")]
        new_query = "&".join(params)
    else:
        new_query = ""

    return urlunparse((
        "postgresql+asyncpg",
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment,
    ))


DATABASE_URL = convert_to_async_url(settings.DATABASE_URL)

# SSL required for Neon PostgreSQL
connect_args = {"ssl": True} if "neon.tech" in settings.DATABASE_URL else {}

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=False,
    poolclass=NullPool,
    connect_args=connect_args,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db():
    """Initialize database connection (no-op — tables created by seed script)."""
    from database.models.models import Base
<<<<<<< HEAD
=======
    from sqlalchemy import text
>>>>>>> b93c871 (Cleanup: prepare for push, ensure no secret keys exposed)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully")
<<<<<<< HEAD
    except Exception as e:
        logger.warning(f"Could not create tables (likely already exist): {e}")
=======

            # Setup real-time postgres notify triggers if using Postgres
            if engine.dialect.name == "postgresql":
                # Ensure organization_id columns exist in existing tables
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);"))
                await conn.execute(text("ALTER TABLE dark_stores ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);"))

                trigger_statements = [
                    # 1. Create the shared notify function
                    """
                    CREATE OR REPLACE FUNCTION notify_table_change()
                    RETURNS trigger AS $$
                    DECLARE
                      payload JSON;
                    BEGIN
                      payload = json_build_object(
                        'table', TG_TABLE_NAME,
                        'action', TG_OP,
                        'data', row_to_json(NEW)
                      );
                      PERFORM pg_notify('darkstori_events', payload::text);
                      RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                    """,
                    # 2. Orders trigger setup
                    "DROP TRIGGER IF EXISTS trigger_order_changes ON orders_synthetic;",
                    """
                    CREATE TRIGGER trigger_order_changes
                    AFTER INSERT OR UPDATE ON orders_synthetic
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    # 3. Product batches trigger setup
                    "DROP TRIGGER IF EXISTS trigger_batch_changes ON product_batches;",
                    """
                    CREATE TRIGGER trigger_batch_changes
                    AFTER INSERT OR UPDATE ON product_batches
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    # 4. Dark stores trigger setup
                    "DROP TRIGGER IF EXISTS trigger_store_changes ON dark_stores;",
                    """
                    CREATE TRIGGER trigger_store_changes
                    AFTER INSERT OR UPDATE ON dark_stores
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    # 5. Competitor stores trigger setup
                    "DROP TRIGGER IF EXISTS trigger_competitor_changes ON competitor_stores;",
                    """
                    CREATE TRIGGER trigger_competitor_changes
                    AFTER INSERT OR UPDATE ON competitor_stores
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    # 6. Stock ledger trigger setup
                    "DROP TRIGGER IF EXISTS trigger_stock_ledger_changes ON stock_ledger;",
                    """
                    CREATE TRIGGER trigger_stock_ledger_changes
                    AFTER INSERT OR UPDATE ON stock_ledger
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """
                ]
                for stmt in trigger_statements:
                    await conn.execute(text(stmt))
                logger.info("Real-time PostgreSQL triggers registered successfully")
    except Exception as e:
        logger.warning(f"Could not initialize database tables or triggers: {e}")
>>>>>>> b93c871 (Cleanup: prepare for push, ensure no secret keys exposed)


async def close_db():
    """Close database connection."""
    await engine.dispose()
    logger.info("Database connection closed")


async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Alias for compatibility
async def get_async_session():
    """Get async database session (context manager)."""
    return AsyncSessionLocal()
