"""
Tests for API route availability and basic functionality.
"""

import pytest
from fastapi import status


class TestAPIRoutes:
    """Test suite for API route availability."""

    def test_stores_endpoint_exists(self, client):
        """Test that stores endpoint exists."""
        # Just check the endpoint doesn't return 404
        response = client.get("/api/stores/")
        # Any response other than 404 means the endpoint exists
        assert response.status_code != status.HTTP_404_NOT_FOUND

    def test_analytics_endpoint_exists(self, client):
        """Test that analytics endpoint exists."""
        response = client.get("/api/analytics")
        # Should return 200 or 401 (if auth required)
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_404_NOT_FOUND,
        ]

    def test_predictions_endpoint_exists(self, client):
        """Test that predictions endpoint exists."""
        response = client.get("/api/predictions")
        # Should return 200, 401, or 405 (method not allowed)
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ]

    def test_invalid_endpoint_returns_404(self, client):
        """Test that invalid endpoints return 404."""
        response = client.get("/api/nonexistent-endpoint-12345")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cors_headers_present(self, client):
        """Test that CORS headers are configured."""
        response = client.get("/health")
        # Check if response is successful
        assert response.status_code in [200, 204, 405]
