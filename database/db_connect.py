"""Database connection and session management."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from contextlib import contextmanager
from sqlalchemy.orm import Session
from src.database.models import engine, get_session


@contextmanager
def get_db_session():
    """Context manager for database sessions."""
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def test_connection():
    """Test database connection."""
    try:
        from sqlalchemy import text
        with get_db_session() as session:
            result = session.execute(text("SELECT 1"))
            print("✓ Database connection successful!")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
