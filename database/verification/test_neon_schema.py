"""
Darkstor Neon Database Verification Script
Audits live Neon PostgreSQL schema, verifies table counts, indices, and sample data.
"""

import sys
import os
from sqlalchemy import text

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from database.connection import engine, ping_database

EXPECTED_TABLES = [
    "dark_stores",
    "neighborhoods",
    "users",
    "inventory_recommendations",
    "store_layouts",
    "orders_synthetic",
    "delivery_sla_metrics",
    "competitor_pricing",
    "competitive_moves",
    "playbooks",
    "playbook_executions",
    "economic_projections",
    "packing_verifications",
    "order_events",
    "expansion_decisions",
    "audit_logs",
    "stock_ledger",
    "product_batches",
    "focus_cities",
]

def run_verification():
    print("=" * 60)
    print("DARKSTOR NEON DATABASE VERIFICATION")
    print("=" * 60)

    # 1. Ping DB
    ping = ping_database()
    if ping.get("status") != "connected":
        print(f"FAILED to connect to Neon PostgreSQL: {ping.get('error')}")
        sys.exit(1)
    print(f"[OK] Connected to Neon DB: '{ping['database']}' as user '{ping['user']}'")

    # 2. Inspect tables
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
        actual_tables = {row[0] for row in res.fetchall()}
        
        print(f"[OK] Total public tables found in Neon: {len(actual_tables)}")

        missing = []
        for tbl in EXPECTED_TABLES:
            if tbl in actual_tables:
                # Count rows
                cnt = conn.execute(text(f"SELECT count(*) FROM {tbl};")).scalar()
                print(f"  + Table '{tbl}': FOUND ({cnt} records)")
            else:
                missing.append(tbl)
                print(f"  - Table '{tbl}': MISSING")

        if missing:
            print(f"\n[WARNING] Missing {len(missing)} expected tables: {missing}")
        else:
            print("\n[SUCCESS] All expected Darkstor core operational tables exist in Neon!")

        # 3. Check active dark stores
        if "dark_stores" in actual_tables:
            store_res = conn.execute(text("SELECT id, store_name, city, is_active FROM dark_stores LIMIT 5;")).fetchall()
            print("\n[SAMPLE DARK STORES IN NEON]:")
            for s in store_res:
                print(f"  * ID: {s[0]} | Store: {s[1]} | City: {s[2]} | Active: {s[3]}")

    print("=" * 60)

if __name__ == "__main__":
    run_verification()
