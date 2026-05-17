"""Database connection management."""

from typing import Optional
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
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Could not create tables (likely already exist): {e}")


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
