"""Authentication and authorization module with JWT tokens."""

from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Optional

import bcrypt
import jwt

from backend.core.config import settings
from backend.core.logger import logger

SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRATION_HOURS = settings.JWT_EXPIRATION_HOURS


class AuthManager:
    """Handle user authentication and JWT token management."""

    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.expiration_hours = JWT_EXPIRATION_HOURS

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

    def create_token(self, user_id: str, role: str = "user") -> str:
        """Create JWT token for authenticated user."""
        payload = {
            "user_id": user_id,
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=self.expiration_hours),
            "iat": datetime.utcnow(),
        }
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        logger.info(f"Token created for user: {user_id}")
        return token

    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None

    def require_auth(self, required_role: str = "user"):
        """Decorator to require authentication for functions."""

        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract token from kwargs or environment
                token = kwargs.get("token") or kwargs.get("auth_token")

                if not token:
                    raise PermissionError("Authentication required")

                payload = self.verify_token(token)
                if not payload:
                    raise PermissionError("Invalid or expired token")

                # Check role
                if required_role == "admin" and payload.get("role") != "admin":
                    raise PermissionError("Admin access required")

                # Add user info to kwargs
                kwargs["user_id"] = payload.get("user_id")
                kwargs["user_role"] = payload.get("role")

                return func(*args, **kwargs)

            return wrapper

        return decorator


# Global auth manager instance
auth_manager = AuthManager()


def require_auth(role: str = "user"):
    """Convenience function for authentication decorator."""
    return auth_manager.require_auth(role)


# FastAPI dependency for getting current user
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
    """FastAPI dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        User payload from JWT token

    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    payload = auth_manager.verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_current_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """FastAPI dependency to require admin role.

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        User payload if user is admin

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    return current_user
