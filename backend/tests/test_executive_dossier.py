"""Test suite for Investor & Executive Dossier Generation."""

import pytest
from fastapi.testclient import TestClient


def test_executive_dossier_json_export(test_client: TestClient):
    """Verify that executive dossier returns comprehensive unit economics, SLA, and algorithmic moat JSON."""
    response = test_client.get("/api/v1/economics/dossier/executive-summary?city=Bangalore&format=json")
    assert response.status_code == 200
    data = response.json()

    assert "meta" in data
    assert data["meta"]["target_city"] == "Bangalore"
    assert "executive_highlights" in data
    assert data["executive_highlights"]["avg_sla_mins"] <= 10.0
    assert data["executive_highlights"]["drops_per_rider_per_hour"] > 3.0
    assert "unit_economics_monthly" in data
    assert data["unit_economics_monthly"]["monthly_gross_revenue_inr"] > 0
    assert "technology_and_moat" in data


def test_executive_dossier_html_export(test_client: TestClient):
    """Verify that executive dossier returns print-ready HTML/PDF styling document."""
    response = test_client.get("/api/v1/economics/dossier/executive-summary?city=Mumbai&format=html")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "DARKSTORI APEX OS" in response.text
    assert "Mumbai Urban Cluster" in response.text
    assert "Print / Save as PDF" in response.text
