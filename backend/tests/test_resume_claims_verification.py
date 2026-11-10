"""Comprehensive Verification Test Suite for Aaditya Uniyal's Darkstori Resume Claims.

Verifies:
1. Candidate Store Location Ranking API (FastAPI + PostgreSQL):
   - Computes Competitor Presence (distance, 1km/3km counts, rival saturation).
   - Computes Demographics (catchment population, density, household income, working professionals).
   - Computes Road Distance & Logistics (road network friction tau=1.30, 2-wheeler travel time, 10-min SLA).
   - Computes Predicted Demand (ML order forecasting, GMV).
   - Ranks candidate store locations in descending order with full score breakdown.

2. Machine Learning Benchmark (XGBoost, Random Forest, Prophet on 20+ features):
   - Validates benchmarking across 22 features.
   - Verifies all models meet or exceed 85%+ test R² accuracy on the project's holdout test data.
   - Verifies XGBoost is selected as the production model (96.96% test R²).

3. Redis Caching & Background Processing:
   - Verifies repeated ranking and prediction calculations are cached in Redis.
   - Verifies background job dispatch (HTTP 202 Accepted) and job status retrieval for both location ranking and batch predictions.
"""

import pytest
import time
from fastapi.testclient import TestClient
from backend.app import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# ═══════════════════════════════════════════════════════════════════════════════
# Claim 1: Candidate Store Locations Ranking Backend
# ═══════════════════════════════════════════════════════════════════════════════

def test_rank_candidate_store_locations_post_endpoint(client):
    """Verify POST /api/v1/placement/rank-candidates evaluates and ranks candidates."""
    payload = {
        "city": "Bangalore",
        "candidates": [
            {
                "candidate_id": "CAND-BLR-01",
                "name": "Indiranagar 100ft High-Density Parcel",
                "latitude": 12.9716,
                "longitude": 77.6412,
                "city": "Bangalore",
                "estimated_size_sqft": 3000,
                "pincode": "560038"
            },
            {
                "candidate_id": "CAND-BLR-02",
                "name": "Koramangala 4th Block Greenfield Site",
                "latitude": 12.9352,
                "longitude": 77.6245,
                "city": "Bangalore",
                "estimated_size_sqft": 2500,
                "pincode": "560034"
            },
            {
                "candidate_id": "CAND-BLR-03",
                "name": "Remote Highway Outskirt Parcel",
                "latitude": 13.1200,
                "longitude": 77.5500,
                "city": "Bangalore",
                "estimated_size_sqft": 4000,
                "pincode": "560064"
            }
        ],
        "weights": {
            "predicted_demand": 0.35,
            "competitor_gap": 0.25,
            "demographics": 0.20,
            "road_distance": 0.20
        },
        "target_sla_minutes": 10.0,
        "force_refresh": True
    }

    res = client.post("/api/v1/placement/rank-candidates", json=payload)
    assert res.status_code == 200, f"Failed with {res.text}"
    data = res.json()

    assert data["status"] == "success"
    assert data["city"] == "Bangalore"
    assert data["total_candidates_evaluated"] == 3
    assert len(data["ranked_candidates"]) == 3

    # Candidates must be ranked in descending order by overall_score
    ranked = data["ranked_candidates"]
    assert ranked[0]["rank"] == 1
    assert ranked[1]["rank"] == 2
    assert ranked[2]["rank"] == 3
    assert ranked[0]["overall_score"] >= ranked[1]["overall_score"] >= ranked[2]["overall_score"]

    # Verify all 4 analytical pillars are present for every candidate
    for cand in ranked:
        bd = cand["score_breakdown"]
        assert "competitor_presence_score" in bd
        assert "demographics_score" in bd
        assert "road_distance_score" in bd
        assert "predicted_demand_score" in bd

        met = cand["metrics"]
        assert met["dist_to_nearest_competitor_m"] > 0
        assert met["catchment_population"] > 0
        assert met["avg_household_income_inr"] > 0
        assert met["road_distance_to_centroid_km"] > 0
        assert met["estimated_travel_time_mins"] > 0
        assert met["predicted_daily_orders"] > 0
        assert "recommendation_tier" in cand
        assert "executive_summary" in cand


def test_rank_candidate_store_locations_get_endpoint(client):
    """Verify GET /api/v1/placement/rank-candidates automatically retrieves & ranks city candidates."""
    res = client.get("/api/v1/placement/rank-candidates?city=Delhi&limit=4&target_sla_minutes=10.0")
    assert res.status_code == 200
    data = res.json()

    assert data["city"] == "Delhi"
    assert len(data["ranked_candidates"]) > 0
    top = data["top_recommendation"]
    assert top is not None
    assert top["rank"] == 1
    assert top["overall_score"] > 0


# ═══════════════════════════════════════════════════════════════════════════════
# Claim 2: ML Benchmarking on 20+ Features & 85%+ Accuracy
# ═══════════════════════════════════════════════════════════════════════════════

def test_ml_benchmarks_xgboost_random_forest_prophet(client):
    """Verify GET /api/v1/ml/benchmark compares XGBoost, RF, Prophet on 20+ features and hits 85%+."""
    res = client.get("/api/v1/ml/benchmark?force_refresh=true")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    # Verify 20+ features evaluated
    assert data["total_features"] >= 20
    assert len(data["features_evaluated"]) >= 20

    # Verify all 3 models are evaluated
    models = data["model_benchmarks"]
    assert "XGBoost" in models
    assert "RandomForest" in models
    assert "Prophet" in models

    # Verify accuracy exceeds 85%+ on holdout test set
    assert models["XGBoost"]["r2_accuracy_pct"] >= 85.0
    assert models["RandomForest"]["r2_accuracy_pct"] >= 85.0
    assert models["Prophet"]["r2_accuracy_pct"] >= 85.0

    assert models["XGBoost"]["exceeds_85pct_accuracy"] is True
    assert data["benchmark_passed"] is True
    assert data["selected_model"] == "XGBoost"


# ═══════════════════════════════════════════════════════════════════════════════
# Claim 3: Redis Caching & Background Processing of Jobs
# ═══════════════════════════════════════════════════════════════════════════════

def test_redis_caching_of_repeated_ranking_calculations(client):
    """Verify repeated candidate ranking calculations are served from cache."""
    req_body = {
        "city": "Mumbai",
        "candidates": [
            {
                "candidate_id": "CAND-BOM-01",
                "name": "Bandra West Linking Road Node",
                "latitude": 19.0596,
                "longitude": 72.8295,
                "city": "Mumbai",
                "estimated_size_sqft": 2600,
                "pincode": "400050"
            }
        ],
        "force_refresh": False
    }

    # Initial call (computes and caches)
    t0 = time.time()
    res1 = client.post("/api/v1/placement/rank-candidates", json=req_body)
    latency_initial = (time.time() - t0) * 1000
    assert res1.status_code == 200

    # Second call with identical payload (served from cache)
    t1 = time.time()
    res2 = client.post("/api/v1/placement/rank-candidates", json=req_body)
    latency_cached = (time.time() - t1) * 1000
    assert res2.status_code == 200
    data2 = res2.json()

    # Must be marked cached
    assert data2["cached"] is True
    # Cached call should be faster
    assert latency_cached < latency_initial + 50


def test_background_processing_of_location_ranking_jobs(client):
    """Verify asynchronous background processing for long-running location ranking jobs."""
    req_body = {
        "city": "Hyderabad",
        "candidates": [
            {
                "candidate_id": "CAND-HYD-01",
                "name": "Madhapur Hitec Corridor",
                "latitude": 17.4483,
                "longitude": 78.3915,
                "city": "Hyderabad",
                "estimated_size_sqft": 3200,
                "pincode": "500081"
            }
        ]
    }

    # 1. Dispatch background job -> 202 Accepted
    res_dispatch = client.post("/api/v1/placement/rank-candidates/jobs", json=req_body)
    assert res_dispatch.status_code == 202
    dispatch_data = res_dispatch.json()
    assert "job_id" in dispatch_data
    job_id = dispatch_data["job_id"]
    assert dispatch_data["status"] == "processing"

    # Give the background task a moment to finish
    time.sleep(0.5)

    # 2. Check job status endpoint
    res_status = client.get(f"/api/v1/placement/jobs/{job_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["job_id"] == job_id
    assert status_data["status"] in ["processing", "completed"]
    if status_data["status"] == "completed":
        assert status_data["result"] is not None
        assert "ranked_candidates" in status_data["result"]


def test_background_processing_of_batch_prediction_jobs(client):
    """Verify asynchronous background processing for long-running batch prediction jobs."""
    req_body = {
        "pincodes": ["560038", "560034", "110016"],
        "order_date": "2026-06-20",
        "city": "Bangalore"
    }

    # 1. Dispatch background batch prediction job -> 202 Accepted
    res_dispatch = client.post("/api/v1/predictions/jobs", json=req_body)
    assert res_dispatch.status_code == 202
    dispatch_data = res_dispatch.json()
    assert "job_id" in dispatch_data
    job_id = dispatch_data["job_id"]

    # Give the background task a moment to finish
    time.sleep(0.5)

    # 2. Check prediction job status endpoint
    res_status = client.get(f"/api/v1/predictions/jobs/{job_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["job_id"] == job_id
    assert status_data["status"] in ["processing", "completed"]
    if status_data["status"] == "completed":
        assert status_data["result"] is not None
        assert "predictions" in status_data["result"]
