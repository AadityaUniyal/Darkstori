"""Tests for authenticated operational event & inventory batch ingestion."""

from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from backend.app import app
from backend.core.security import create_access_token
from backend.database.connection import AsyncSessionLocal, init_db
from backend.database.models.models import AuditLog, DarkStore, OrderEvent, Organization, ProductBatch, StockLedger, User


@pytest.mark.asyncio
async def test_order_and_batch_ingestion_end_to_end():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Create dedicated organization, store and user
        org = Organization(name="Ingestion Test Org", subscription_tier="Enterprise")
        db.add(org)
        await db.flush()

        user = User(
            email="operator_ingest@darkstori.io",
            username="operator_ingest",
            hashed_password="hashed_test_password",
            full_name="Operations Ingest Lead",
            role="store-gm",
            organization_id=org.id,
        )
        db.add(user)
        await db.flush()

        store = DarkStore(
            store_name="Indiranagar Dark Store 1",
            store_code="IND-001",
            city="Bangalore",
            latitude=12.9716,
            longitude=77.5946,
            platform="Darkstori",
            organization_id=org.id,
            is_active=True,
        )
        db.add(store)
        await db.commit()
        await db.refresh(store)
        await db.refresh(user)

        store_id = store.id
        user_id = user.id
        org_id = org.id

    token = create_access_token({
        "sub": str(user_id),
        "user_id": user_id,
        "email": "operator_ingest@darkstori.io",
        "role": "store-gm",
        "org_id": org_id,
        "organization_id": org_id,
    })
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest an order event
        order_payload = {
            "source": "increff_oms",
            "source_event_id": "ORD-BLR-90214",
            "store_id": store_id,
            "event_type": "created",
            "occurred_at": datetime.utcnow().isoformat(),
            "order_value": 480.0,
            "delivery_mins": 11.5,
            "pincode": "560038",
        }
        res_order = await client.post("/api/v1/ingestion/orders", json=order_payload, headers=headers)
        assert res_order.status_code == 201
        order_data = res_order.json()
        assert order_data["status"] == "accepted"

        # 2. Test idempotency replay
        res_dup = await client.post("/api/v1/ingestion/orders", json=order_payload, headers=headers)
        assert res_dup.status_code == 201
        dup_data = res_dup.json()
        assert dup_data["status"] == "duplicate"
        assert dup_data["id"] == order_data["id"]

        # 3. Ingest an inventory batch (WMS initial restock)
        expiry_dt = (datetime.utcnow() + timedelta(hours=14)).isoformat()
        batch_payload = {
            "source": "sap_wms",
            "batch_code": "BATCH-BUTTER-500G-01",
            "store_id": store_id,
            "product_name": "Amul Butter 500g",
            "category": "Dairy",
            "quantity": 25,
            "base_price": 275.0,
            "current_price": 275.0,
            "expiry_time": expiry_dt,
            "freshness_score": 0.82,
        }
        res_batch = await client.post("/api/v1/ingestion/inventory/batches", json=batch_payload, headers=headers)
        assert res_batch.status_code == 200
        batch_data = res_batch.json()
        assert batch_data["status"] == "created"
        assert batch_data["quantity"] == 25
        batch_id = batch_data["id"]

        # 4. Update the batch (WMS cycle count or sales delta adjustment)
        batch_payload["quantity"] = 20  # 5 units sold
        res_update = await client.post("/api/v1/ingestion/inventory/batches", json=batch_payload, headers=headers)
        assert res_update.status_code == 200
        update_data = res_update.json()
        assert update_data["status"] == "updated"
        assert update_data["quantity"] == 20
        assert update_data["id"] == batch_id

        # 5. Verify database ledger and audit trail
        async with AsyncSessionLocal() as db:
            # Check StockLedger entries
            ledger_entries = list(
                (await db.execute(select(StockLedger).where(StockLedger.organization_id == org_id))).scalars().all()
            )
            assert len(ledger_entries) >= 2
            reasons = [le.reason for le in ledger_entries]
            assert "WMS_INITIAL_RESTOCK" in reasons
            assert "WMS_SYNC_ADJUSTMENT" in reasons

            # Check AuditLog
            audits = list(
                (await db.execute(select(AuditLog).where(AuditLog.organization_id == org_id))).scalars().all()
            )
            actions = [a.action for a in audits]
            assert "WMS_BATCH_CREATE" in actions
            assert "WMS_BATCH_UPDATE" in actions
