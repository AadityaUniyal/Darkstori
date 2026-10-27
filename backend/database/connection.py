"""Database connection management."""
import os
from urllib.parse import urlparse, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool, StaticPool
from sqlalchemy import text
from sqlalchemy.orm import with_loader_criteria
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

def is_placeholder_db_url(url: str) -> bool:
    if not url:
        return True
    return any(p in url for p in ["host:port", "username:password", "your_host", "example.com"])

if settings.ENVIRONMENT == "testing":
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
elif is_placeholder_db_url(settings.DATABASE_URL) and settings.ENVIRONMENT != "production":
    logger.warning("Placeholder DATABASE_URL detected; falling back to local SQLite: sqlite+aiosqlite:///darkstori.db")
    DATABASE_URL = "sqlite+aiosqlite:///darkstori.db"
else:
    DATABASE_URL = convert_to_async_url(settings.DATABASE_URL)

# SSL required for Neon PostgreSQL
connect_args = {"ssl": True} if "neon.tech" in (settings.DATABASE_URL or "") else {}

# Configure connection pool arguments dynamically based on the database dialect
is_sqlite = DATABASE_URL.startswith("sqlite")
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if is_sqlite:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
elif is_serverless:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.DEBUG,
        poolclass=NullPool,
        connect_args=connect_args,
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
        from backend.database.models.models import Base, DarkStore, User

        tenant_id = get_current_tenant_id()

        if tenant_id is not None and getattr(statement, "is_select", False):
            # Apply tenant criteria to ORM entities even inside joins and nested
            # selects; the previous FROM-clause rewrite missed those shapes.
            dark_store_filter = (
                DarkStore.organization_id == tenant_id
                if tenant_id > 0
                else DarkStore.organization_id.is_(None)
            )
            user_filter = (
                User.organization_id == tenant_id
                if tenant_id > 0
                else User.organization_id.is_(None)
            )
            tenant_options = [
                with_loader_criteria(DarkStore, dark_store_filter, include_aliases=True),
                with_loader_criteria(User, user_filter, include_aliases=True),
            ]
            # Apply the same tenant boundary to every mapped record that owns an
            # organization_id, including audit, inventory ledger, and workflows.
            for mapper in Base.registry.mappers:
                model = mapper.class_
                if model in (DarkStore, User) or "organization_id" not in mapper.columns:
                    continue
                tenant_filter = (
                    model.organization_id == tenant_id
                    if tenant_id > 0
                    else model.organization_id.is_(None)
                )
                tenant_options.append(with_loader_criteria(model, tenant_filter, include_aliases=True))
            statement = statement.options(*tenant_options)
        elif tenant_id is not None and (getattr(statement, "is_update", False) or getattr(statement, "is_delete", False)):
            table = getattr(statement, "table", None)
            tenant_column = table.c.get("organization_id") if table is not None else None
            if tenant_column is not None:
                statement = statement.where(
                    tenant_column == tenant_id if tenant_id > 0 else tenant_column.is_(None)
                )

        if params is not None:
            kwargs["params"] = params
        if execution_options is not None:
            kwargs["execution_options"] = execution_options
        if bind_arguments is not None:
            kwargs["bind_arguments"] = bind_arguments
        return await super().execute(statement, **kwargs)

    async def flush(self, objects=None):
        """Stamp new tenant-owned rows and reject cross-tenant ownership writes."""
        from backend.core.tenant import get_current_tenant_id
        from backend.database.models.models import Base

        tenant_id = get_current_tenant_id()
        if tenant_id is not None:
            mapper_by_class = {mapper.class_: mapper for mapper in Base.registry.mappers}
            for instance in list(self.new) + list(self.dirty):
                mapper = mapper_by_class.get(type(instance))
                if mapper is None or "organization_id" not in mapper.columns:
                    continue
                existing_org = getattr(instance, "organization_id", None)
                expected_org = tenant_id if tenant_id > 0 else None
                if existing_org is not None and existing_org != expected_org:
                    raise PermissionError("Cannot create a record for a different organization")
                if instance in self.new:
                    instance.organization_id = expected_org
        await super().flush(objects=objects)


# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=TenantScopedSession, expire_on_commit=False
)

async def init_db():
    """Use isolated metadata setup in tests and serverless; require Alembic for every shared database."""
    from backend.database.models.models import Base
    try:
        if (engine.dialect.name == "sqlite" and settings.ENVIRONMENT in ("testing", "development")) or is_serverless:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database metadata initialized for development/serverless")
            return

        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from pathlib import Path

        project_root = Path(__file__).resolve().parents[2]
        migration_config = Config(str(project_root / "alembic.ini"))
        expected_heads = set(ScriptDirectory.from_config(migration_config).get_heads())
        try:
            async with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    has_alembic = await conn.scalar(
                        text("SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version'")
                    )
                    if not has_alembic:
                        logger.warning("alembic_version table not found; creating and stamping current head...")
                        await conn.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
                        for head in expected_heads:
                            await conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:v) ON CONFLICT DO NOTHING"), {"v": head})

                rows = (await conn.execute(text("SELECT version_num FROM alembic_version"))).scalars().all()
        except Exception as exc:
            raise RuntimeError(
                "Database migration state is missing. Initialize an isolated database and run "
                "python -m alembic -c alembic.ini upgrade head before starting the app."
            ) from exc
        current_revisions = set(rows)
        if current_revisions != expected_heads:
            raise RuntimeError(
                "Database migrations are not at Alembic head. "
                f"Expected {sorted(expected_heads)}, found {sorted(current_revisions)}. "
                "Run python -m alembic -c alembic.ini upgrade head after reviewing the migration plan."
            )
        logger.info("Database connectivity and Alembic revision verified")
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
