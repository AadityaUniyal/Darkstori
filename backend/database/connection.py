"""Database connection management."""
from urllib.parse import urlparse, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool, StaticPool
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    """Compile PostgreSQL JSONB column type to JSON for SQLite dialect."""
    return "JSON"

from backend.core.config import settings
from backend.core.logger import logger

# Convert PostgreSQL URL to async format and handle SSL
def convert_to_async_url(url: str) -> str:
    """Convert database URL to async format, stripping sslmode param."""
    if not url:
        return "postgresql+asyncpg://"
    if url.startswith("sqlite"):
        if url.startswith("sqlite+aiosqlite://"):
            return url
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    parsed = urlparse(url)
    # Strip DSN params that asyncpg doesn't accept directly.
    if parsed.query:
        params = [
            p for p in parsed.query.split("&")
            if not p.startswith("sslmode=") and not p.startswith("channel_binding=")
        ]
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

if settings.ENVIRONMENT == "testing":
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
else:
    DATABASE_URL = convert_to_async_url(settings.DATABASE_URL)

# SSL required for Neon PostgreSQL
connect_args = {"ssl": True} if "neon.tech" in (settings.DATABASE_URL or "") else {}

# Configure connection pool arguments dynamically based on the database dialect
is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.DEBUG,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

class TenantScopedSession(AsyncSession):
    """Intercepts select, update, and delete queries to automatically apply tenant filters."""
    
    async def execute(self, statement, params=None, execution_options=None, bind_arguments=None, **kwargs):
        from backend.core.tenant import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        
        if tenant_id is not None:
            # Safely rewrite statements to inject organization_id filters
            try:
                # Handle selects / general statements
                if hasattr(statement, "froms"):
                    for from_clause in statement.froms:
                        entity = getattr(from_clause, "entity_namespace", None)
                        if entity and hasattr(entity, "organization_id"):
                            statement = statement.where(entity.organization_id == tenant_id)
            except Exception as e:
                logger.warning(f"Failed to auto-inject tenant scope: {e}")
                
        if params is not None:
            kwargs["params"] = params
        if execution_options is not None:
            kwargs["execution_options"] = execution_options
        if bind_arguments is not None:
            kwargs["bind_arguments"] = bind_arguments
        return await super().execute(statement, **kwargs)


# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=TenantScopedSession, expire_on_commit=False
)

async def init_db():
    """Initialize database connection (create tables and trigger registrations)."""
    from backend.database.models.models import Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully")
            
            # Setup real-time PostgreSQL triggers and migrations if using Postgres
            if engine.dialect.name == "postgresql":
                # Ensure PostGIS extension is enabled
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                logger.info("PostGIS extension ensured/created")
                
                # Auto-migrate store_simulations table with status and comments columns
                await conn.execute(text("ALTER TABLE store_simulations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'proposed';"))
                await conn.execute(text("ALTER TABLE store_simulations ADD COLUMN IF NOT EXISTS comments TEXT;"))
                
                # Drop incorrect legacy check constraint if exists
                await conn.execute(text("ALTER TABLE pincode_coverage DROP CONSTRAINT IF EXISTS check_coverage;"))
                trigger_statements = [
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
                    "DROP TRIGGER IF EXISTS trigger_order_changes ON orders_synthetic;",
                    """
                    CREATE TRIGGER trigger_order_changes
                    AFTER INSERT OR UPDATE ON orders_synthetic
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    "DROP TRIGGER IF EXISTS trigger_batch_changes ON product_batches;",
                    """
                    CREATE TRIGGER trigger_batch_changes
                    AFTER INSERT OR UPDATE ON product_batches
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    "DROP TRIGGER IF EXISTS trigger_store_changes ON dark_stores;",
                    """
                    CREATE TRIGGER trigger_store_changes
                    AFTER INSERT OR UPDATE ON dark_stores
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    "DROP TRIGGER IF EXISTS trigger_competitor_changes ON competitor_stores;",
                    """
                    CREATE TRIGGER trigger_competitor_changes
                    AFTER INSERT OR UPDATE ON competitor_stores
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                    "DROP TRIGGER IF EXISTS trigger_stock_ledger_changes ON stock_ledger;",
                    """
                    CREATE TRIGGER trigger_stock_ledger_changes
                    AFTER INSERT OR UPDATE ON stock_ledger
                    FOR EACH ROW EXECUTE FUNCTION notify_table_change();
                    """,
                ]
                for stmt in trigger_statements:
                    await conn.execute(text(stmt))
                logger.info("Real-time PostgreSQL triggers registered successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


async def close_db():
    """Close database connection."""
    if not (engine.dialect.name == "sqlite" and ":memory:" in str(engine.url)):
        await engine.dispose()
    logger.info("Database connection closed")

async def get_db():
    """Dependency to get a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Alias for compatibility
def get_async_session():
    """Get async database session (context manager)."""
    return AsyncSessionLocal()
