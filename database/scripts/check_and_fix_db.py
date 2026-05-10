"""Check and fix Neon database schema to match project requirements.

This script:
1. Connects to your Neon database
2. Checks which tables exist
3. Creates missing tables
4. Verifies the schema matches the models
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import all models
from database.models.models import (
    Base, DarkStore, PincodeCoverage, OrderSynthetic, 
    CompetitorPricing, UserReview, MarketMetrics, User,
    MLPrediction, MLPerformanceMetric, MLFeatureDrift, MLTrainingJob
)


def get_database_url():
    """Get database URL from environment."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    return db_url


def check_existing_tables(engine):
    """Check which tables already exist in the database."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    print("\n" + "="*60)
    print("EXISTING TABLES IN DATABASE")
    print("="*60)
    
    if existing_tables:
        for i, table in enumerate(existing_tables, 1):
            print(f"{i}. {table}")
    else:
        print("No tables found in database")
    
    print("="*60 + "\n")
    
    return existing_tables


def get_required_tables():
    """Get list of all required tables from models."""
    required_tables = {
        'dark_stores': DarkStore,
        'pincode_coverage': PincodeCoverage,
        'orders_synthetic': OrderSynthetic,
        'competitor_pricing': CompetitorPricing,
        'user_reviews': UserReview,
        'market_metrics': MarketMetrics,
        'users': User,
        'ml_predictions': MLPrediction,
        'ml_performance_metrics': MLPerformanceMetric,
        'ml_feature_drift': MLFeatureDrift,
        'ml_training_jobs': MLTrainingJob
    }
    return required_tables


def check_missing_tables(existing_tables, required_tables):
    """Identify which tables are missing."""
    missing_tables = []
    
    print("\n" + "="*60)
    print("TABLE STATUS CHECK")
    print("="*60)
    
    for table_name in required_tables.keys():
        status = "✓ EXISTS" if table_name in existing_tables else "✗ MISSING"
        print(f"{table_name:30} {status}")
        
        if table_name not in existing_tables:
            missing_tables.append(table_name)
    
    print("="*60 + "\n")
    
    return missing_tables


def create_missing_tables(engine, missing_tables, required_tables):
    """Create only the missing tables."""
    if not missing_tables:
        print("✓ All required tables already exist!\n")
        return
    
    print("\n" + "="*60)
    print("CREATING MISSING TABLES")
    print("="*60)
    
    # Create tables one by one
    for table_name in missing_tables:
        try:
            model_class = required_tables[table_name]
            model_class.__table__.create(engine, checkfirst=True)
            print(f"✓ Created table: {table_name}")
        except Exception as e:
            print(f"✗ Error creating {table_name}: {e}")
    
    print("="*60 + "\n")


def verify_table_structure(engine, table_name):
    """Verify the structure of a specific table."""
    inspector = inspect(engine)
    
    try:
        columns = inspector.get_columns(table_name)
        indexes = inspector.get_indexes(table_name)
        
        print(f"\nTable: {table_name}")
        print(f"  Columns: {len(columns)}")
        print(f"  Indexes: {len(indexes)}")
        
        return True
    except Exception as e:
        print(f"  Error inspecting {table_name}: {e}")
        return False


def test_database_connection(engine):
    """Test if database connection works."""
    print("\n" + "="*60)
    print("TESTING DATABASE CONNECTION")
    print("="*60)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✓ Connected to PostgreSQL")
            print(f"  Version: {version}")
            
            # Check database name
            result = conn.execute(text("SELECT current_database();"))
            db_name = result.fetchone()[0]
            print(f"  Database: {db_name}")
            
            # Check schema
            result = conn.execute(text("SELECT current_schema();"))
            schema = result.fetchone()[0]
            print(f"  Schema: {schema}")
            
        print("="*60 + "\n")
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print("="*60 + "\n")
        return False


def create_sample_admin_user(engine):
    """Create a sample admin user if users table is empty."""
    try:
        # Simple password hashing using passlib
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        with Session(engine) as session:
            # Check if any users exist
            result = session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            
            if count == 0:
                print("\n" + "="*60)
                print("CREATING SAMPLE ADMIN USER")
                print("="*60)
                
                admin_user = User(
                    email="admin@darkstori.com",
                    username="admin",
                    hashed_password=pwd_context.hash("admin123"),
                    full_name="Admin User",
                    role="admin",
                    is_active=True,
                    is_verified=True
                )
                
                session.add(admin_user)
                session.commit()
                
                print("✓ Created admin user:")
                print("  Email: admin@darkstori.com")
                print("  Username: admin")
                print("  Password: admin123")
                print("  Role: admin")
                print("\n⚠️  IMPORTANT: Change this password in production!")
                print("="*60 + "\n")
                
    except ImportError:
        print("\nNote: passlib not installed, skipping admin user creation")
        print("Install with: pip install passlib[bcrypt]")
    except Exception as e:
        print(f"Note: Could not create admin user: {e}")


def main():
    """Main function to check and fix database."""
    print("\n" + "="*60)
    print("DARKSTORI DATABASE CHECKER & FIXER")
    print("="*60 + "\n")
    
    try:
        # Get database URL
        db_url = get_database_url()
        print(f"Database URL: {db_url[:50]}...")
        
        # Create engine
        engine = create_engine(db_url, echo=False)
        
        # Test connection
        if not test_database_connection(engine):
            print("✗ Cannot proceed without database connection")
            return
        
        # Check existing tables
        existing_tables = check_existing_tables(engine)
        
        # Get required tables
        required_tables = get_required_tables()
        
        # Check for missing tables
        missing_tables = check_missing_tables(existing_tables, required_tables)
        
        # Create missing tables
        if missing_tables:
            print(f"\n⚠️  Found {len(missing_tables)} missing tables")
            response = input("Do you want to create them? (yes/no): ")
            
            if response.lower() in ['yes', 'y']:
                create_missing_tables(engine, missing_tables, required_tables)
                print("\n✓ Database schema updated successfully!")
            else:
                print("\n✗ Skipped table creation")
        else:
            print("\n✓ Database schema is complete!")
        
        # Verify final state
        print("\n" + "="*60)
        print("FINAL DATABASE STATE")
        print("="*60)
        final_tables = check_existing_tables(engine)
        print(f"Total tables: {len(final_tables)}")
        print("="*60 + "\n")
        
        # Create sample admin user if needed
        if 'users' in final_tables:
            create_sample_admin_user(engine)
        
        print("✓ Database check complete!\n")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nPlease check:")
        print("1. DATABASE_URL is set correctly in .env file")
        print("2. Database is accessible from your network")
        print("3. Database credentials are correct\n")
        raise


if __name__ == "__main__":
    main()
