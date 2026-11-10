import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.api.routes.ingestion import _is_safe_webhook_url
from backend.core.security import create_access_token

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "admin@darkstor.io", "role": "admin", "org_id": 1})
    return {"Authorization": f"Bearer {token}"}

def test_is_safe_webhook_url_blocks_internal_and_ssrf():
    # Loopback / local
    assert not _is_safe_webhook_url("http://localhost:8000/webhook")
    assert not _is_safe_webhook_url("http://127.0.0.1:8000/hook")
    assert not _is_safe_webhook_url("http://0.0.0.0:8000/hook")
    assert not _is_safe_webhook_url("http://[::1]:8000/hook")
    
    # Private IP ranges
    assert not _is_safe_webhook_url("http://10.0.0.1/api")
    assert not _is_safe_webhook_url("http://172.16.0.1/api")
    assert not _is_safe_webhook_url("http://192.168.1.1/api")
    
    # Cloud metadata
    assert not _is_safe_webhook_url("http://169.254.169.254/latest/meta-data")
    assert not _is_safe_webhook_url("http://metadata.google.internal/computeMetadata/v1")
    
    # Non-HTTP schemes
    assert not _is_safe_webhook_url("ftp://example.com/file")
    assert not _is_safe_webhook_url("file:///etc/passwd")
    
    # Valid public URL
    assert _is_safe_webhook_url("https://example.com/webhook")

def test_storefront_webhook_rejects_ssrf(auth_headers):
    client = TestClient(app)
    response = client.post(
        "/api/v1/ingestion/storefront/webhook/test",
        json={
            "webhook_url": "http://169.254.169.254/latest/meta-data",
            "event_type": "inventory.price_update",
            "payload": {}
        },
        headers=auth_headers
    )
    assert response.status_code == 400
    res_data = response.json()
    error_msg = res_data.get("error") or res_data.get("detail") or ""
    assert "Invalid webhook target URL" in error_msg

def test_storefront_webhook_exception_detail_is_sanitized(auth_headers):
    client = TestClient(app)
    # Using a non-routable public domain to trigger unreachable without exposing internal str(err)
    response = client.post(
        "/api/v1/ingestion/storefront/webhook/test",
        json={
            "webhook_url": "https://nonexistent-darkstori-endpoint-998877.com/webhook",
            "event_type": "inventory.price_update",
            "payload": {}
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("unreachable", "timeout", "http_error", "simulated")
    # Verify no raw python exception trace / internal error string is leaked
    assert "Traceback" not in data["detail"]
    assert "Exception" not in data["detail"]
    assert "Errno" not in data["detail"]
