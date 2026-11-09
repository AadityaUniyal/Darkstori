"""
Darkstor Database Connection Module
Optimized for Neon Serverless PostgreSQL with SSL connection pooling and retry mechanics.
"""

import os
import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool

logger = logging.getLogger("darkstor.database")

# Load Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

# Standardize URL for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure SSL mode is present for Neon
if "sslmode=" not in DATABASE_URL:
    delimiter = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{delimiter}sslmode=require"

# Engine configuration with pooling suitable for serverless / containerized environments
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ping_database() -> dict:
    """Verifies live connectivity to Neon PostgreSQL."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
            return {
                "status": "connected",
                "database": result[0],
                "user": result[1],
                "version": result[2],
            }
    except Exception as exc:
        logger.error(f"Neon database ping failed: {exc}")
        return {
            "status": "error",
            "error": str(exc),
        }
