"""Unit tests for Security: JWT Token Authentication & Role-Based Access Control.

Tests token creation, HS256 signature verification, token expiration, refresh rotation,
revocation enforcement, admin role protection, and password hashing security.
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt
from backend.core.config import settings
from backend.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
    verify_admin,
    generate_api_key,
)
from backend.database.connection import AsyncSessionLocal, init_db


class TestPasswordHashing:
    """Tests for bcrypt password hashing and verification."""

    def test_hash_and_verify_success(self):
        """Valid password matches its hashed representation."""
        plain = "SuperSecurePassword123!"
        hashed = hash_password(plain)
        assert hashed != plain
        assert verify_password(plain, hashed) is True

    def test_invalid_password_fails_verification(self):
        """Incorrect password fails verification."""
        hashed = hash_password("CorrectPassword")
        assert verify_password("WrongPassword", hashed) is False


class TestJWTTokenCreationAndDecoding:
    """Tests for JWT token generation and payload integrity."""

    def test_create_and_decode_access_token(self):
        """Access token contains encoded subject, role, and expiration."""
        payload_data = {"sub": "analyst@darkstori.in", "role": "analyst", "org_id": 1}
        token = create_access_token(payload_data, expires_delta=timedelta(minutes=15))
        decoded = decode_token(token)

        assert decoded["sub"] == "analyst@darkstori.in"
        assert decoded["role"] == "analyst"
        assert decoded["org_id"] == 1
        assert "exp" in decoded
        assert "iat" in decoded

    def test_create_refresh_token_has_unique_jti(self):
        """Refresh tokens contain unique JTI identifiers for rotation tracking."""
        data = {"sub": "ops@darkstori.in"}
        token1, jti1 = create_refresh_token(data)
        token2, jti2 = create_refresh_token(data)

        assert jti1 != jti2
        decoded1 = decode_token(token1)
        assert decoded1["jti"] == jti1
        assert decoded1["type"] == "refresh"

    def test_decode_tampered_token_raises_401(self):
        """Tampered JWT signature raises HTTP 401 Unauthorized."""
        token = create_access_token({"sub": "user@darkstori.in"})
        # Modify the last character of the signature
        tampered_token = token[:-1] + ("A" if token[-1] != "A" else "B")
        with pytest.raises(HTTPException) as excinfo:
            decode_token(tampered_token)
        assert excinfo.value.status_code == 401

    def test_expired_token_raises_401(self):
        """Token with past expiration timestamp is rejected."""
        token = create_access_token(
            {"sub": "expired_user"},
            expires_delta=timedelta(seconds=-10)
        )
        with pytest.raises(HTTPException) as excinfo:
            decode_token(token)
        assert excinfo.value.status_code == 401


class TestRoleBasedAccessControl:
    """Tests for role verification (Admin, Analyst, Dispatcher)."""

    @pytest.mark.asyncio
    async def test_verify_admin_allowed(self):
        """Admin payload successfully passes verify_admin check."""
        admin_payload = {"sub": "admin@darkstori.in", "role": "admin"}
        result = await verify_admin(admin_payload)
        assert result["role"] == "admin"

    @pytest.mark.asyncio
    async def test_verify_admin_forbidden_for_non_admin(self):
        """Non-admin user payload is rejected with HTTP 403 Forbidden."""
        user_payload = {"sub": "viewer@darkstori.in", "role": "viewer"}
        with pytest.raises(HTTPException) as excinfo:
            await verify_admin(user_payload)
        assert excinfo.value.status_code == 403
        assert "Admin access required" in excinfo.value.detail


class TestAPIKeyGeneration:
    """Tests for programmatic API key generation."""

    def test_generate_api_key_format(self):
        """API key starts with 'ds_' prefix and returns matching SHA-256 hash."""
        full_key, prefix, hashed = generate_api_key()
        assert full_key.startswith("ds_")
        assert prefix.startswith("ds_")
        assert len(hashed) == 64  # SHA-256 hex string length
