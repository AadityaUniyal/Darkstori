import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

os.environ["MLFLOW_ENABLE_TRACKING"] = "False"
os.environ["ENVIRONMENT"] = "testing"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app import app
from backend.database.connection import get_db
from backend.core.security import verify_token

# Mock dependency for db
class DummySession:
    async def execute(self, *args, **kwargs):
        class Result:
            def one_or_none(self):
                return None
            def scalars(self):
                class ScalarsResult:
                    def all(self):
                        return []
                return ScalarsResult()
            def scalar(self):
                return None
        return Result()

    async def commit(self):
        pass

    async def close(self):
        pass

async def override_get_db():
    yield DummySession()

# Mock dependency for auth token
async def override_verify_token():
    return {"sub": "test_user_id", "email": "test@example.com", "role": "admin"}

@pytest.fixture(scope="function")
def test_client():
    # Store original overrides
    orig_get_db = app.dependency_overrides.get(get_db)
    orig_verify_token = app.dependency_overrides.get(verify_token)
    
    # Set overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_token] = override_verify_token
    
    with TestClient(app) as client:
        yield client
        
    # Restore original overrides
    if orig_get_db:
        app.dependency_overrides[get_db] = orig_get_db
    else:
        app.dependency_overrides.pop(get_db, None)
        
    if orig_verify_token:
        app.dependency_overrides[verify_token] = orig_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)
