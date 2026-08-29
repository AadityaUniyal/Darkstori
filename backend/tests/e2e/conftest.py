"""Shared fixtures for Darkstori E2E Test Suite."""

import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
PROJECT_ROOT = str(Path(__file__).parent.parent.parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

os.environ["MLFLOW_ENABLE_TRACKING"] = "False"
os.environ["ENVIRONMENT"] = "testing"

from backend.app import app
from backend.database.connection import get_db
from backend.core.security import verify_token
from backend.core.circuit_breaker import CircuitBreaker


class DummyAsyncSession:
    """Mock async DB session providing predictable empty/dummy results for E2E tests."""
    async def execute(self, *args, **kwargs):
        class ScalarsResult:
            def all(self):
                return []
            def first(self):
                return None
            def one_or_none(self):
                return None
            def scalar_one_or_none(self):
                return None
            def unique(self):
                return self

        class Result:
            def one_or_none(self):
                return None
            def scalars(self):
                return ScalarsResult()
            def scalar(self):
                return None
            def scalar_one_or_none(self):
                return None
            def all(self):
                return []
            def first(self):
                return None
            def fetchall(self):
                return []
            def fetchone(self):
                return None
            def mappings(self):
                return ScalarsResult()
            def unique(self):
                return self

        return Result()

    def add(self, instance):
        if hasattr(instance, "id") and not getattr(instance, "id", None):
            try:
                instance.id = 1
            except Exception:
                pass

    def add_all(self, instances):
        for inst in instances:
            self.add(inst)

    async def delete(self, instance):
        pass

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def close(self):
        pass

    async def refresh(self, obj):
        if hasattr(obj, "id") and not getattr(obj, "id", None):
            try:
                obj.id = 1
            except Exception:
                pass


async def override_e2e_get_db():
    yield DummyAsyncSession()


async def override_e2e_verify_token():
    return {
        "sub": "e2e_admin_user",
        "email": "admin@darkstori.io",
        "role": "admin",
        "org_id": 1,
        "organization_id": 1,
    }


@pytest.fixture(scope="function")
def e2e_client():
    """FastAPI TestClient fixture with overridden auth and db dependencies."""
    orig_get_db = app.dependency_overrides.get(get_db)
    orig_verify_token = app.dependency_overrides.get(verify_token)

    app.dependency_overrides[get_db] = override_e2e_get_db
    app.dependency_overrides[verify_token] = override_e2e_verify_token

    with TestClient(app) as client:
        yield client

    if orig_get_db is not None:
        app.dependency_overrides[get_db] = orig_get_db
    else:
        app.dependency_overrides.pop(get_db, None)

    if orig_verify_token is not None:
        app.dependency_overrides[verify_token] = orig_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)


@pytest.fixture(scope="function")
def unauthenticated_client():
    """FastAPI TestClient fixture without token override to test auth protection."""
    orig_get_db = app.dependency_overrides.get(get_db)
    orig_verify_token = app.dependency_overrides.get(verify_token)

    app.dependency_overrides[get_db] = override_e2e_get_db
    app.dependency_overrides.pop(verify_token, None)

    with TestClient(app) as client:
        yield client

    if orig_get_db is not None:
        app.dependency_overrides[get_db] = orig_get_db
    else:
        app.dependency_overrides.pop(get_db, None)

    if orig_verify_token is not None:
        app.dependency_overrides[verify_token] = orig_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)


@pytest.fixture(scope="function")
def fresh_circuit_breaker():
    """Fixture producing a clean CircuitBreaker instance."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=0.1)
    return cb
