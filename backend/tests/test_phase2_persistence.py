import pytest


def test_cod_vault_ledger_get_and_deposit(test_client):
    # 1. GET /api/v1/sla/cod-vault
    res = test_client.get("/api/v1/sla/cod-vault")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "settlements" in data

    # 2. POST /api/v1/sla/cod-vault/deposit
    deposit_res = test_client.post(
        "/api/v1/sla/cod-vault/deposit",
        json={
            "rider_code": "RD-SURESH-08",
            "deposit_amount_inr": 250.0,
            "notes": "Test shift deposit"
        }
    )
    assert deposit_res.status_code == 200
    dep_data = deposit_res.json()
    assert dep_data["status"] == "success"
    assert dep_data["amount_deposited_inr"] == 250.0


def test_dynamic_markdown_apply_endpoint(test_client):
    # Apply dynamic salvage markdown to product catalog
    res = test_client.post(
        "/api/v1/resilience/dynamic-markdown/apply",
        json={
            "sku_name": "Amul Taaza Homogenised Milk 500ml",
            "discount_pct": 0.30,
            "arm_name": "30% Off (Targeted)",
            "projected_salvage_units": 45,
            "net_economic_gain_inr": 890.0
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "applied"
    assert data["discount_pct"] == 0.30
    assert data["new_price"] < data["old_price"]
