"""Authentication and authorization module with JWT tokens."""
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict
from functools import wraps
from src.utils.config import SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from src.utils.helpers import logger


class AuthManager:
    """Handle user authentication and JWT token management."""
    
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.expiration_hours = JWT_EXPIRATION_HOURS
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def create_token(self, user_id: str, role: str = "user") -> str:
        """Create JWT token for authenticated user."""
        payload = {
            "user_id": user_id,
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=self.expiration_hours),
            "iat": datetime.utcnow()
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
                token = kwargs.get('token') or kwargs.get('auth_token')
                
                if not token:
                    raise PermissionError("Authentication required")
                
                payload = self.verify_token(token)
                if not payload:
                    raise PermissionError("Invalid or expired token")
                
                # Check role
                if required_role == "admin" and payload.get("role") != "admin":
                    raise PermissionError("Admin access required")
                
                # Add user info to kwargs
                kwargs['user_id'] = payload.get('user_id')
                kwargs['user_role'] = payload.get('role')
                
                return func(*args, **kwargs)
            return wrapper
        return decorator


# Global auth manager instance
auth_manager = AuthManager()


def require_auth(role: str = "user"):
    """Convenience function for authentication decorator."""
    return auth_manager.require_auth(role)
