"""
Basic health check tests to ensure the API is running.
"""

import pytest
from fastapi import status


def test_health_check_endpoint_exists(client):
    """Test that the health check endpoint exists and returns 200."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK


def test_health_check_response_format(client):
    """Test that the health check returns proper JSON format."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "status" in data
    # In test environment, status may be degraded due to missing MLflow/models
    assert data["status"] in ["ok", "healthy", "up", "degraded"]


def test_root_endpoint(client):
    """Test that the root endpoint is accessible."""
    response = client.get("/")
    # Should either return 200 or redirect (3xx)
    assert response.status_code in [200, 307, 308]


def test_api_docs_accessible(client):
    """Test that API documentation is accessible."""
    response = client.get("/api/docs")
    assert response.status_code == status.HTTP_200_OK


def test_openapi_schema_accessible(client):
    """Test that OpenAPI schema is accessible."""
    response = client.get("/openapi.json")
    assert response.status_code == status.HTTP_200_OK

    schema = response.json()
    assert "openapi" in schema
    assert "info" in schema
    assert "paths" in schema
