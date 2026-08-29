"""Security utilities — JWT with refresh rotation, API key auth, session management."""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Dict, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.logger import logger
from backend.core.cache import cache
from backend.database.connection import get_db
from backend.database.models.models import ApiKey, RefreshToken, User

import bcrypt

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token.

    Args:
        data: Data to encode in token
        expires_delta: Token expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> Tuple[str, str]:
    """Create JWT refresh token. Returns (refresh_token_str, jti_string)."""
    to_encode = data.copy()
    jti = secrets.token_hex(16)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": jti
    })
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt, jti


def decode_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"Token decode failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


async def store_refresh_token(db: AsyncSession, user_id: int, jti: str, expires_at: datetime) -> None:
    """Persist a refresh token JTI to the database."""
    rt = RefreshToken(user_id=user_id, token_jti=jti, expires_at=expires_at)
    db.add(rt)
    await db.commit()


async def revoke_refresh_token(db: AsyncSession, jti: str) -> None:
    """Mark a refresh token as revoked in the database and Redis blocklist."""
    # Add to Redis blocklist (TTL 7 days to match refresh token max lifespan)
    await cache.set(f"revoked_jti:{jti}", "1", ttl=7 * 24 * 60 * 60)
    
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_jti == jti))
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.commit()


async def is_token_revoked(db: AsyncSession, jti: str) -> bool:
    """Check if a refresh token JTI has been revoked via Redis or DB fallback."""
    if not jti:
        return False
        
    # Check Redis blocklist first (fast path)
    if await cache.get(f"revoked_jti:{jti}"):
        return True
        
    # Fallback to DB check
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_jti == jti,
            RefreshToken.revoked == True,  # noqa: E712
        )
    )
    return result.scalar_one_or_none() is not None


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """Verify access token and check revocation status."""
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    exp = payload.get("exp")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

    token_type = payload.get("type")
    jti = payload.get("jti")

    if token_type == "refresh" and jti:
        if await is_token_revoked(db, jti):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    return payload


async def verify_refresh_token(token_str: str, db: AsyncSession) -> Dict:
    """Verify a refresh token string. Used by /refresh endpoint."""
    payload = decode_token(token_str)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    exp = payload.get("exp")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")

    jti = payload.get("jti")
    if jti and await is_token_revoked(db, jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    return payload


async def verify_admin(payload: Dict = Depends(verify_token)) -> Dict:
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload


def generate_api_key() -> Tuple[str, str, str]:
    """Generate API key. Returns (full_key, prefix, hashed_key)."""
    full_key = f"ds_{secrets.token_urlsafe(32)}"
    prefix = full_key[:10]
    hashed = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, prefix, hashed


async def verify_api_key(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[str]:
    """Verify X-API-Key header against DB. Returns user email if valid."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,  # noqa: E712
        )
    )
    ak = result.scalar_one_or_none()
    if not ak:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or inactive API key")

    # Update last used
    ak.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    # Get user email
    user_result = await db.execute(select(User).where(User.id == ak.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key owner not found")

    return user.email
