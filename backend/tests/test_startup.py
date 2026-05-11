"""Minimal tests — just verify the app can boot without crashing."""

import os

import pytest


def test_environment_set():
    """Verify test env vars are loaded."""
    assert (
        os.getenv("DATABASE_URL") is not None
    ), "DATABASE_URL missing — add env block to ci.yml test job"


def test_app_imports():
    """Verify app.py can be imported in test environment."""
    try:
        from backend.app import app

        assert app is not None
    except Exception as e:
        pytest.fail(
            f"app.py failed to import: {e}\n"
            "Check that all required env vars are set in ci.yml"
        )


def test_health_endpoint():
    """Verify /health returns 200."""
    from fastapi.testclient import TestClient

    from backend.app import app

    client = TestClient(app)
    response = client.get("/health")
    assert (
        response.status_code == 200
    ), f"/health returned {response.status_code}, expected 200"
