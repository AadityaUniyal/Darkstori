"""Test suite for the Inbound Storefront Webhook Ingestion Engine."""

import json
import hmac
import hashlib
from fastapi.testclient import TestClient


def test_inbound_webhook_valid_signature_ingestion(test_client: TestClient):
    """Verify that inbound webhooks with valid HMAC-SHA256 signature are ingested and audit-logged."""
    payload = {
        "event": "order.created",
        "source": "Shopify_Production",
        "id": "SP-ORD-99124A",
        "data": {
            "store_id": 1,
            "pincode": "560038",
            "total_amount": 789.50,
            "items": [{"sku": "SKU-MILK-500", "qty": 2}]
        }
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    secret = "darkstor_webhook_secret_key".encode("utf-8")
    signature = hmac.new(secret, raw_bytes, hashlib.sha256).hexdigest()

    response = test_client.post(
        "/api/v1/ingestion/storefront/webhook/receive",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Darkstor-Signature": f"sha256={signature}"
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["source_event_id"] == "SP-ORD-99124A"
    assert res_data["verified_hmac"] is True
    assert res_data["audit_logged"] is True


def test_inbound_webhook_invalid_signature_rejection(test_client: TestClient):
    """Verify that inbound webhooks with forged/mismatched HMAC signatures are rejected with HTTP 401."""
    payload = {"event": "order.created", "id": "SP-ORD-FORGED"}
    raw_bytes = json.dumps(payload).encode("utf-8")

    response = test_client.post(
        "/api/v1/ingestion/storefront/webhook/receive",
        content=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Darkstor-Signature": "sha256=invalid_forged_signature_hex"
        }
    )
    assert response.status_code == 401
    res_json = response.json()
    err_msg = res_json.get("error") or res_json.get("detail") or ""
    assert "Invalid HMAC signature" in err_msg


def test_inbound_webhook_idempotency_duplicate_handling(test_client: TestClient):
    """Verify that resending the same webhook ID ignores duplicates idempotently."""
    payload = {
        "event": "order.created",
        "source": "Shopify_Idempotent",
        "id": "SP-ORD-IDEM-01",
        "data": {"store_id": 1, "pincode": "560038", "total_amount": 320.0}
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    secret = "darkstor_webhook_secret_key".encode("utf-8")
    signature = hmac.new(secret, raw_bytes, hashlib.sha256).hexdigest()
    headers = {"Content-Type": "application/json", "X-Darkstor-Signature": f"sha256={signature}"}

    # 1. First delivery
    res1 = test_client.post("/api/v1/ingestion/storefront/webhook/receive", content=raw_bytes, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    # 2. Resend same event
    res2 = test_client.post("/api/v1/ingestion/storefront/webhook/receive", content=raw_bytes, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "duplicate_ignored"
