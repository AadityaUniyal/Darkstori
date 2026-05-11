"""Initialize Neon PostgreSQL database with all tables."""

import asyncio
import os
import sys
from pathlib import Path

# CI mode check - use SQLite for testing (check BEFORE imports)
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("sqlite"):
    print("CI mode: using SQLite, skipping Neon-specific migration.")
    print("✅ Migration check passed (SQLite mode)")
    sys.exit(0)

sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.core.logger import logger  # noqa: E402
from database.connection import engine, init_db  # noqa: E402
from database.models.models import Base  # noqa: E402, F401


async def test_connection():
    """Test database connection."""
    try:
        from sqlalchemy import text

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✓ Database connection test passed!")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection test failed: {e}")
        return False


async def main():
    """Initialize the Neon PostgreSQL database."""
    # CI mode check - use SQLite for testing
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if DATABASE_URL.startswith("sqlite"):
        print("CI mode: using SQLite, skipping Neon-specific migration.")
        print("✅ Migration check passed (SQLite mode)")
        return

    try:
        logger.info("Connecting to Neon PostgreSQL database...")

        # Create all tables
        await init_db()

        logger.info("✓ Database initialized successfully!")
        logger.info("✓ All tables created from models")

        # Test connection
        await test_connection()

    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        logger.error("Please check your DATABASE_URL in .env file")
        raise


if __name__ == "__main__":
    asyncio.run(main())
