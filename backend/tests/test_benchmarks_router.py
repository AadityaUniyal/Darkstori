"""Test suite verifying the live algorithmic engine benchmarks router."""

import pytest
from fastapi.testclient import TestClient


def test_benchmarks_summary_endpoint(test_client: TestClient):
    """Verify that /api/v1/benchmarks/summary profiles all core algorithms."""
    response = test_client.get("/api/v1/benchmarks/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["platform_version"] == "DarkStori 3.0 Enterprise"
    assert "benchmarks" in data
    
    b = data["benchmarks"]
    assert "spatial_database" in b
    assert "thermodynamic_slotting" in b
    assert "vrp_swarm_intercept" in b
    assert "ml_demand_models" in b
    
    assert b["thermodynamic_slotting"]["iterations_executed"] == 120
    assert b["thermodynamic_slotting"]["transit_reduction_pct"] > 0
    assert b["ml_demand_models"]["production_champion"] == "XGBoost Regressor"
    assert b["ml_demand_models"]["r2_score_pct"] >= 85.0


def test_benchmarks_stress_test_endpoint(test_client: TestClient):
    """Verify that /api/v1/benchmarks/run-stress-test computes real latency percentiles."""
    response = test_client.post("/api/v1/benchmarks/run-stress-test?sample_size=100")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PASSING_HIGH_THROUGHPUT"
    assert "latency_percentiles_ms" in data
    pct = data["latency_percentiles_ms"]
    assert "p50" in pct
    assert "p95" in pct
    assert "p99" in pct
    assert pct["p50"] <= pct["p99"]
    assert data["throughput_ops_per_second"] > 0
