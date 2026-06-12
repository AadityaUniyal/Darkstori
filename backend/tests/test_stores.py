import pytest
from backend.database.connection import get_db

def test_get_stores_empty(test_client):
    # Mock database to return empty list of dark stores
    class MockResult:
        def scalars(self):
            class ScalarsResult:
                def all(self):
                    return []
            return ScalarsResult()

    class MockSession:
        async def execute(self, *args, **kwargs):
            return MockResult()
        async def commit(self):
            pass
        async def close(self):
            pass

    async def override_db():
        yield MockSession()

    from backend.app import app
    app.dependency_overrides[get_db] = override_db

    response = test_client.get("/api/stores/")
    app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json() == []
