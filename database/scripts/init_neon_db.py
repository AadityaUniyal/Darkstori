"""Initialize Neon PostgreSQL database with all tables."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from src.database.models import Base, engine, init_database
from src.utils.helpers import logger


def main():
    """Initialize the Neon PostgreSQL database."""
    try:
        logger.info("Connecting to Neon PostgreSQL database...")
        
        # Create all tables
        init_database()
        
        logger.info("✓ Database initialized successfully!")
        logger.info("✓ All 5 tables created:")
        logger.info("  - dark_stores")
        logger.info("  - pincode_coverage")
        logger.info("  - orders_synthetic")
        logger.info("  - competitor_pricing")
        logger.info("  - user_reviews")
        
        # Test connection
        from src.database.db_connect import test_connection
        if test_connection():
            logger.info("✓ Database connection test passed!")
        else:
            logger.error("✗ Database connection test failed!")
            
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        logger.error("Please check your DATABASE_URL in .env file")
        raise


if __name__ == "__main__":
    main()
