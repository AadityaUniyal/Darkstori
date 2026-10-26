"""Cross-tenant negative authorization and isolation verification tests."""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient, ASGITransport

from sqlalchemy import select

from backend.app import app
from backend.core.security import create_access_token
from backend.database.connection import AsyncSessionLocal, init_db
from backend.database.models.models import DarkStore, Organization, ProductBatch, StockLedger, User


@pytest.mark.asyncio
async def test_cross_tenant_isolation_and_negative_permissions():
    """Verify Organization A cannot read, mutate, or ingest against Organization B's resources."""
    await init_db()
    async with AsyncSessionLocal() as db:
        # 1. Create Organization Alpha
        org_a = Organization(name="Tenant Alpha QuickComm", subscription_tier="Enterprise")
        db.add(org_a)
        await db.flush()

        user_a = User(
            email="manager@alpha.io",
            username="manager_alpha",
            hashed_password="pw_alpha_hashed",
            full_name="Alpha Manager",
            role="store-gm",
            organization_id=org_a.id,
        )
        db.add(user_a)
        await db.flush()

        store_a = DarkStore(
            store_name="Alpha Koramangala Hub",
            store_code="ALPHA-KOR-01",
            city="Bangalore",
            latitude=12.9352,
            longitude=77.6245,
            platform="Darkstori",
            organization_id=org_a.id,
            is_active=True,
        )
        db.add(store_a)
        await db.flush()

        batch_a = ProductBatch(
            product_name="Alpha Organic Milk 1L",
            category="Dairy",
            store_id=store_a.id,
            quantity=30,
            base_price=70.0,
            current_price=70.0,
            discount_rate=0.0,
            freshness_score=0.75,
            expiry_time=datetime.now(timezone.utc) + timedelta(hours=10),
            qr_code_hash="ALPHA-BATCH-MILK-01",
        )
        db.add(batch_a)

        # 2. Create Organization Beta
        org_b = Organization(name="Tenant Beta Retail", subscription_tier="Growth")
        db.add(org_b)
        await db.flush()

        user_b = User(
            email="lead@beta.io",
            username="lead_beta",
            hashed_password="pw_beta_hashed",
            full_name="Beta Lead",
            role="store-gm",
            organization_id=org_b.id,
        )
        db.add(user_b)
        await db.flush()

        store_b = DarkStore(
            store_name="Beta Indiranagar Hub",
            store_code="BETA-IND-01",
            city="Bangalore",
            latitude=12.9719,
            longitude=77.6412,
            platform="Darkstori",
            organization_id=org_b.id,
            is_active=True,
        )
        db.add(store_b)
        await db.flush()

        batch_b = ProductBatch(
            product_name="Beta Sourdough Loaf",
            category="Bakery",
            store_id=store_b.id,
            quantity=15,
            base_price=120.0,
            current_price=120.0,
            discount_rate=0.0,
            freshness_score=0.60,
            expiry_time=datetime.now(timezone.utc) + timedelta(hours=8),
            qr_code_hash="BETA-BATCH-BREAD-01",
        )
        db.add(batch_b)
        await db.commit()

        # Capture identifiers
        store_a_id = store_a.id
        store_b_id = store_b.id
        batch_a_id = batch_a.id
        batch_b_id = batch_b.id
        org_a_id = org_a.id
        org_b_id = org_b.id

    # Create token for User A
    token_a = create_access_token({
        "sub": "user_a",
        "email": "manager@alpha.io",
        "role": "store-gm",
        "org_id": org_a_id,
        "organization_id": org_a_id,
    })
    headers_a = {"Authorization": f"Bearer {token_a}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # TEST 1: Tenant Alpha cannot see Tenant Beta's store in stores list
        res_stores = await client.get("/api/v1/stores?city=Bangalore", headers=headers_a)
        assert res_stores.status_code == 200
        stores_data = res_stores.json()
        assert isinstance(stores_data, list)
        visible_store_ids = [s["id"] for s in stores_data]
        assert store_a_id in visible_store_ids
        assert store_b_id not in visible_store_ids

        # TEST 2: Tenant Alpha direct lookup of Tenant Beta's store returns 404
        res_store_b = await client.get(f"/api/v1/stores/{store_b_id}", headers=headers_a)
        assert res_store_b.status_code == 404

        # TEST 3: Tenant Alpha decision loop does NOT show Tenant Beta's near-expiry batch
        res_decisions = await client.get("/api/v1/decision-loop?city=Bangalore", headers=headers_a)
        assert res_decisions.status_code == 200
        recs = res_decisions.json().get("recommendations", [])
        rec_batch_ids = [r["batch_id"] for r in recs]
        assert batch_b_id not in rec_batch_ids

        # TEST 4: Tenant Alpha attempting to apply a markdown on Tenant Beta's batch returns 404
        beta_rec_key = f"batch-{batch_b_id}-999999"
        res_apply_beta = await client.post(f"/api/v1/decision-loop/{beta_rec_key}/apply", headers=headers_a)
        assert res_apply_beta.status_code == 404

        # TEST 5: Tenant Alpha attempting to ingest an OMS order for Tenant Beta's store returns 404
        order_payload_b = {
            "source": "hostile_injection",
            "source_event_id": "CROSS-TENANT-001",
            "store_id": store_b_id,
            "event_type": "created",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "order_value": 500.0,
        }
        res_inj_order = await client.post("/api/v1/ingestion/orders", json=order_payload_b, headers=headers_a)
        assert res_inj_order.status_code == 404

        # TEST 6: Tenant Alpha attempting to ingest/overwrite inventory on Tenant Beta's store returns 404
        batch_payload_b = {
            "source": "hostile_wms",
            "batch_code": "BETA-POISON-SKU",
            "store_id": store_b_id,
            "product_name": "Poison Pill SKU",
            "category": "Produce",
            "quantity": 100,
            "base_price": 50.0,
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=20)).isoformat(),
        }
        res_inj_batch = await client.post("/api/v1/ingestion/inventory/batches", json=batch_payload_b, headers=headers_a)
        assert res_inj_batch.status_code == 404


@pytest.mark.asyncio
async def test_decision_loop_backtest_and_catalog_webhook():
    """Verify decision loop policy backtesting endpoint and catalog webhook dispatch."""
    token = create_access_token({
        "sub": "test_operator",
        "email": "op@darkstori.io",
        "role": "admin",
        "org_id": 1,
        "organization_id": 1,
    })
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Run empirical policy comparison against simple baselines
        res_backtest = await client.get("/api/v1/decision-loop/backtest?sample_size=15", headers=headers)
        assert res_backtest.status_code == 200
        data = res_backtest.json()
        assert data["batch_count"] == 15
        assert "policies" in data
        assert "fifo_status_quo" in data["policies"]
        assert "darkstori_dynamic" in data["policies"]
        assert "measured_uplift" in data
        assert data["measured_uplift"]["waste_reduction_pct"] > 0


@pytest.mark.asyncio
async def test_apply_markdown_with_physical_shrinkage_reconciliation():
    """Verify floor variance reconciliation creates a StockLedger shrinkage entry on markdown apply."""
    await init_db()
    async with AsyncSessionLocal() as db:
        org = Organization(name="Tenant Pilot Fresh", subscription_tier="Enterprise")
        db.add(org)
        await db.flush()

        store = DarkStore(
            store_name="Pilot Dark Store 1",
            store_code="PILOT-01",
            city="Bangalore",
            latitude=12.93,
            longitude=77.62,
            organization_id=org.id,
            is_active=True,
        )
        db.add(store)
        await db.flush()

        batch = ProductBatch(
            product_name="Organic Greek Yogurt 500g",
            category="Dairy",
            store_id=store.id,
            quantity=30,
            base_price=100.0,
            current_price=100.0,
            discount_rate=0.0,
            freshness_score=0.70,
            expiry_time=datetime.now(timezone.utc) + timedelta(hours=8),
            qr_code_hash="YOGURT-BATCH-PILOT-01",
        )
        db.add(batch)
        await db.commit()

        batch_id = batch.id
        org_id = org.id
        store_id = store.id

    token = create_access_token({
        "sub": "store_lead",
        "email": "lead@pilot.io",
        "role": "store-gm",
        "org_id": org_id,
        "organization_id": org_id,
    })
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Get recommendation queue to retrieve exact recommendation key
        res_queue = await client.get("/api/v1/decision-loop/?city=Bangalore", headers=headers)
        assert res_queue.status_code == 200
        recs = [r for r in res_queue.json().get("recommendations", []) if r["batch_id"] == batch_id]
        assert len(recs) == 1
        rec_id = recs[0]["id"]

        # Apply markdown with physical count of 26 (4 damaged units detected on shelf)
        apply_payload = {
            "physical_count": 26,
            "shrinkage_reason": "4 damaged seals identified on floor review",
        }
        res_apply = await client.post(f"/api/v1/decision-loop/{rec_id}/apply", json=apply_payload, headers=headers)
        assert res_apply.status_code == 200
        data = res_apply.json()
        assert data["status"] == "applied"
        assert data["after"]["quantity"] == 26
        assert data["after"]["physical_variance"] == -4

        # Verify double-entry StockLedger record was created
        async with AsyncSessionLocal() as db:
            ledger_rows = await db.execute(
                select(StockLedger).where(
                    StockLedger.store_id == store_id,
                    StockLedger.sku_name == "Organic Greek Yogurt 500g",
                )
            )
            entries = ledger_rows.scalars().all()
            assert len(entries) >= 1
            shrinkage_entry = [e for e in entries if "SHRINKAGE_DAMAGE_ADJUSTMENT" in (e.reason or "")][0]
            assert shrinkage_entry.quantity_changed == -4
            assert shrinkage_entry.organization_id == org_id
