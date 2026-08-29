import pytest
from unittest.mock import MagicMock, AsyncMock
from backend.database.models.models import User
from backend.database.connection import get_db

def test_register_success(test_client, monkeypatch):
    # Mock database to return no user (email/username not registered)
    class MockResult:
        def scalar_one_or_none(self):
            return None
            
    async def mock_execute(*args, **kwargs):
        return MockResult()
        
    # Override get_db for this test
    class MockSession:
        async def execute(self, *args, **kwargs):
            return MockResult()
        async def commit(self):
            pass
        async def flush(self):
            pass
        async def close(self):
            pass
        def add(self, instance):
            instance.id = 1
        async def refresh(self, instance):
            pass
            
    async def override_db():
        yield MockSession()
        
    from backend.app import app
    app.dependency_overrides[get_db] = override_db
    
    # Mock password hashing and welcome email
    monkeypatch.setattr("backend.api.routes.auth.hash_password", lambda x: "hashed_pwd")
    monkeypatch.setattr("backend.utils.email.send_welcome_email", lambda *args, **kwargs: None)

    response = test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecurePassword123!",
            "full_name": "Test User",
            "username": "testuser"
        }
    )
    
    # Restore override
    app.dependency_overrides.pop(get_db, None)
    
    assert response.status_code == 201
    json_data = response.json()
    assert "access_token" in json_data
    assert "refresh_token" in json_data
    assert json_data["email"] == "test@example.com"
