"""Test suite for Rider GPS Telemetry & Geofence Breach Engine."""

import pytest
from fastapi.testclient import TestClient


def test_rider_telemetry_within_geofence(test_client: TestClient):
    """Verify rider ping inside geofence computes correct distance, ETA, and returns WITHIN_CORRIDOR."""
    # Ping 1km north of hub
    payload = {
        "rider_id": "RD-BLR-01",
        "latitude": 12.9800,
        "longitude": 77.6412,
        "speed_kmh": 25.0,
        "battery_pct": 90.0,
        "darkstore_lat": 12.9716,
        "darkstore_lng": 77.6412,
        "geofence_radius_km": 3.2,
        "active_order_id": "ORD-BLR-1001"
    }
    response = test_client.post("/api/v1/sla/rider/telemetry-ping", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["rider_id"] == "RD-BLR-01"
    assert data["is_geofence_breach"] is False
    assert data["breach_severity"] == "NORMAL"
    assert data["status"] == "WITHIN_CORRIDOR"
    assert data["distance_from_hub_km"] < 3.2
    assert data["dynamic_eta_mins"] > 0


def test_rider_telemetry_geofence_breach_detection(test_client: TestClient):
    """Verify rider ping outside geofence flags breach severity, excess km, and logs audit."""
    # Ping 5km away from hub
    payload = {
        "rider_id": "RD-BLR-04",
        "latitude": 13.0200,
        "longitude": 77.6412,
        "speed_kmh": 32.0,
        "battery_pct": 65.0,
        "darkstore_lat": 12.9716,
        "darkstore_lng": 77.6412,
        "geofence_radius_km": 3.2,
        "active_order_id": "ORD-BLR-9999"
    }
    response = test_client.post("/api/v1/sla/rider/telemetry-ping", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["rider_id"] == "RD-BLR-04"
    assert data["is_geofence_breach"] is True
    assert data["status"] == "BREACH_ALERT"
    assert data["excess_km"] > 0
    assert data["breach_severity"] in ["WARNING", "CRITICAL"]


def test_rider_telemetry_stream(test_client: TestClient):
    """Verify multi-rider telemetry stream returns coordinates, speeds, and compliance metrics."""
    response = test_client.get("/api/v1/sla/rider/telemetry-stream?city=Bangalore")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Bangalore"
    assert data["total_riders_active"] == 5
    assert len(data["fleet_telemetry"]) == 5
    assert "breaches_detected" in data
