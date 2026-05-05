"""Test script to verify Neon PostgreSQL connection."""
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from src.utils.config import DATABASE_URL

def test_connection():
    """Test the database connection."""
    print("=" * 60)
    print("Testing Neon PostgreSQL Connection")
    print("=" * 60)
    print()
    
    try:
        # Create engine
        print("1. Creating database engine...")
        engine = create_engine(DATABASE_URL, echo=False)
        print("   ✓ Engine created")
        
        # Test connection
        print("\n2. Testing connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"   ✓ Connected successfully!")
            print(f"   ✓ PostgreSQL version: {version[:50]}...")
        
        # Test database name
        print("\n3. Checking database...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database();"))
            db_name = result.fetchone()[0]
            print(f"   ✓ Database: {db_name}")
        
        # List existing tables
        print("\n4. Checking existing tables...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            if tables:
                print(f"   ✓ Found {len(tables)} existing tables:")
                for table in tables:
                    print(f"     - {table[0]}")
            else:
                print("   ℹ No tables found (database is empty)")
        
        print("\n" + "=" * 60)
        print("✓ Connection Test PASSED!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run: python src/database/models.py")
        print("   (This will create all 5 tables)")
        print("2. Run: python src/database/db_connect.py")
        print("   (This will verify the connection)")
        print()
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("✗ Connection Test FAILED!")
        print("=" * 60)
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Check if DATABASE_URL in .env is correct")
        print("2. Verify Neon database is active")
        print("3. Check network connectivity")
        print("4. Install psycopg2-binary: pip install psycopg2-binary")
        print()
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
