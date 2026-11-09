"""
Darkstor End-to-End Async API Integration Test Suite
Tests all flagship backend routers and logic against the live Neon PostgreSQL database.
"""

import os
import sys
import asyncio
import httpx

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

os.environ["ENVIRONMENT"] = "development"
from backend.app import app
from backend.core.security import create_access_token

AUTH_TOKEN = create_access_token({"sub": "executive@darkstor.com", "role": "executive", "organization_id": 1})
AUTH_HEADERS = {"Authorization": f"Bearer {AUTH_TOKEN}"}

async def run_suite():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", follow_redirects=True) as client:
        print("=" * 65)
        print("DARKSTORI FULL-STACK BACKEND LOGIC VERIFICATION SUITE")
        print("=" * 65)

        # 0. Health & Core Branding
        res = await client.get("/health/live")
        assert res.status_code == 200, f"Health check failed: {res.status_code}"
        print(f"[PASS] Health Liveness Check: {res.status_code}")

        res = await client.get("/")
        assert res.status_code == 200, f"Root API failed: {res.status_code}"
        assert "darkstori" in res.json().get("message", "").lower(), "Branding mismatch"
        print(f"[PASS] Root API Branding: {res.status_code} ({res.json().get('message')})")

        # 1. Feature 01: Expansion & Greenfield Site Selection (/expansion)
        res = await client.get("/api/v1/expansion/ledger", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Expansion Ledger failed: {res.status_code}"
        items_count = len(res.json()) if isinstance(res.json(), list) else len(res.json().get('items', []))
        print(f"[PASS] Feature 01 Expansion Decisions Ledger: {res.status_code} (Items: {items_count})")

        res = await client.get("/api/v1/expansion/opportunities", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Expansion Opportunities failed: {res.status_code}"
        print(f"[PASS] Feature 01 Greenfield Opportunities: {res.status_code}")

        # 2. Feature 02: Predictive Inventory & Stock Replenishment (/inventory)
        res = await client.get("/api/v1/recommendations/inventory?neighborhood_id=1", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Inventory Recommendations failed: {res.status_code}"
        print(f"[PASS] Feature 02 Predictive Stock Replenishment: {res.status_code}")

        # 3. Feature 03: Micro-Warehouse Floor Digital Twin & Slotting (/floor)
        res = await client.post(
            "/api/v1/autonomous-grid/slotting-optimize",
            json={"store_id": 1, "target_reduction_pct": 25.0},
            headers=AUTH_HEADERS
        )
        assert res.status_code == 200, f"Floor Slotting failed: {res.status_code}"
        print(f"[PASS] Feature 03 Micro-Warehouse Floor Slotting: {res.status_code}")

        # 4. Feature 04: Order Dispatch & Swarm Batching (/dispatch)
        res = await client.get("/api/v1/sla/metrics", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"SLA Metrics failed: {res.status_code}"
        print(f"[PASS] Feature 04 Dispatch & SLA Metrics: {res.status_code}")

        # 5. Feature 05: Competitor Radar & Market Intelligence (/competitor)
        res = await client.get("/api/v1/analytics/advanced/competitive-moves?city=Bangalore", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Competitor Moves failed: {res.status_code}"
        print(f"[PASS] Feature 05 Competitor Moves & Scraping Matrix: {res.status_code}")

        # 6. Feature 06: Automated Incident Playbooks & Resilience (/playbooks)
        res = await client.get("/api/v1/playbooks/", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Playbooks failed: {res.status_code}"
        print(f"[PASS] Feature 06 Disruption Response Playbooks: {res.status_code}")

        # 7. Feature 07: Unit Economics & EBITDA Simulator (/economics)
        res = await client.get("/api/v1/economics/projections", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Economics Projections failed: {res.status_code}"
        print(f"[PASS] Feature 07 Unit Economics & EBITDA Projections: {res.status_code}")

        # 8. Feature 08: Vision Packing Dock & Quality Passport (/vision)
        res = await client.get("/api/v1/vision-pack/recent", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Vision Packing Recent failed: {res.status_code}"
        print(f"[PASS] Feature 08 Vision Packing History & Passports: {res.status_code}")

        # 9. Advanced Extension: Metro Network Operations Center (/noc)
        res = await client.get("/api/v1/autonomous-grid/multi-hub-mesh?city=Bangalore", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Multi-Hub Mesh failed: {res.status_code}"
        print(f"[PASS] Metro NOC Multi-Hub Mesh: {res.status_code}")

        # 10. Advanced Extension: Pan-India Dark Stores Directory (/directory)
        res = await client.get("/api/v1/stores/?limit=20", headers=AUTH_HEADERS)
        assert res.status_code == 200, f"Pan-India Stores failed: {res.status_code}"
        print(f"[PASS] Pan-India Dark Stores Directory: {res.status_code} (Stores loaded: {len(res.json())})")

        print("=" * 65)
        print("[100% VERIFIED] ALL BACKEND FEATURE LOGIC PASSING CLEANLY (200 OK)!")
        print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_suite())
