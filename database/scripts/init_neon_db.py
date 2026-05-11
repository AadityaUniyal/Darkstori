"""Initialize Neon PostgreSQL database with all tables."""

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.core.logger import logger
from database.connection import engine, init_db
from database.models.models import Base


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
