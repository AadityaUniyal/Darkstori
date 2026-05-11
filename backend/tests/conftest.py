"""
Pytest configuration and fixtures for backend tests.
"""

import asyncio
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Set test environment variables before importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-ci-minimum-32-characters-long"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["DEBUG"] = "True"
os.environ["MLFLOW_ENABLE_TRACKING"] = "False"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-minimum-32-characters-long"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

# Import Base from the correct location
import sys
from pathlib import Path

# Import after setting env vars
from backend.app import app
from backend.database.connection import get_db

sys.path.append(str(Path(__file__).parent.parent.parent))
from database.models.models import Base

# Create async test engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client():
    """Create a test client with database dependency override."""
    # Create tables before starting the app
    import asyncio

    async def setup_db():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(setup_db())

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Cleanup
    async def teardown_db():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    asyncio.run(teardown_db())
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def test_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User",
    }


@pytest.fixture(scope="session")
def test_store_data():
    """Sample store data for testing."""
    return {
        "name": "Test Dark Store",
        "address": "123 Test Street, Mumbai",
        "pincode": "400001",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "capacity": 1000,
        "operational_hours": "24/7",
    }
