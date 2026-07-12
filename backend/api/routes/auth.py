"""Authentication routes — real DB-backed login/register with refresh token rotation."""

import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.logger import logger
from backend.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    store_refresh_token,
    revoke_refresh_token,
    verify_refresh_token,
    generate_api_key,
    verify_token,
)

from backend.database.connection import get_db
from backend.database.models.models import ApiKey, RefreshToken, User
from backend.utils.email import send_welcome_email
from backend.core.audit import log_audit_action

from backend.core.cache import cache

router = APIRouter()

# ── Request/Response Schemas ──────────────────────────────────────────────────


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""
    username: str = ""


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    email: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str = ""


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool

# ── Helpers ───────────────────────────────────────────────────────────────────


def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


async def _make_token(user: User, db: AsyncSession) -> dict:
    """Create token pair and persist refresh token to DB."""
    access_expire = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expire = timedelta(days=7)
    token_data = {"sub": user.email, "role": user.role, "user_id": str(user.id)}
    access_token = create_access_token(token_data, expires_delta=access_expire)
    refresh_token_str, jti = create_refresh_token(token_data, expires_delta=refresh_expire)
    # Persist refresh token JTI to DB
    expires_at = datetime.now(timezone.utc) + refresh_expire
    # the internal naive datetime storage might complain if we give it tz-aware, 
    # but sqlalchemy usually handles it. If it doesn't, we might need .replace(tzinfo=None)
    # Actually, the python 3.11 warning suggests we just use .now(timezone.utc). 
    # Let's strip tzinfo for SQLAlchemy's default DateTime column.
    expires_at = expires_at.replace(tzinfo=None)
    await store_refresh_token(db, int(user.id), jti, expires_at)  # type: ignore
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role,
        "email": user.email,
    }

# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserRegister,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    username = user.username or user.email.split("@")[0]
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        username = f"{username}_{user.email.split('@')[0][-4:]}"
    new_user = User(
        email=user.email,
        username=username,
        full_name=user.full_name,
        hashed_password=_hash_pw(user.password),
        role="user",
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    logger.info(f"New user registered: {user.email}")
    await log_audit_action(db, "USER_REGISTER", request=request, user_id=int(new_user.id), target_table="users", target_id=int(new_user.id))  # type: ignore
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    return await _make_token(new_user, db)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """Login with email + password → JWT pair."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if not user or not _verify_pw(credentials.password, str(user.hashed_password)):  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    logger.info(f"User logged in: {credentials.email}")
    await log_audit_action(db, "USER_LOGIN", request=request, user_id=int(user.id))  # type: ignore
    return await _make_token(user, db)


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token (token rotation with DB revocation)."""
    payload = await verify_refresh_token(body.refresh_token, db)
    jti = payload.get("jti")
    if jti:
        await revoke_refresh_token(db, jti)
    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    logger.info(f"Token rotated for: {user.email}")
    return await _make_token(user, db)


@router.post("/logout")
async def logout(
    body: LogoutRequest,
    request: Request,
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Logout — revoke refresh token in DB."""
    if body.refresh_token:
        try:
            rt_payload = decode_token(body.refresh_token)
            rjti = rt_payload.get("jti")
            if rjti:
                await revoke_refresh_token(db, rjti)
        except Exception:
            pass
    user_id = payload.get("user_id")
    await log_audit_action(db, "USER_LOGOUT", request=request, user_id=int(user_id) if user_id else None)
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Force logout — revoke all user's refresh tokens."""
    user_id = payload.get("user_id")
    if user_id:
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == int(user_id),
                RefreshToken.revoked == False,  # noqa: E712
            )
        )
        tokens = result.scalars().all()
        for rt in tokens:
            rt.revoked = True  # type: ignore
            if rt.token_jti:
                await cache.set(f"revoked_jti:{rt.token_jti}", "1", ttl=7 * 24 * 60 * 60)
        await db.commit()
    return {"message": "All sessions invalidated"}


@router.get("/me", response_model=UserOut)
async def get_me(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        id=int(user.id),  # type: ignore
        email=str(user.email),  # type: ignore
        username=str(user.username),  # type: ignore
        role=str(user.role),  # type: ignore
        is_active=bool(user.is_active),  # type: ignore
    )


@router.post("/api-key")
async def create_api_key(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Generate and persist an API key for programmatic access."""
    user_id = int(payload["user_id"])
    full_key, prefix, key_hash = generate_api_key()
    ak = ApiKey(user_id=user_id, key_prefix=prefix, key_hash=key_hash)
    db.add(ak)
    await db.commit()
    return {
        "api_key": full_key,
        "key_prefix": prefix,
        "message": "Store this key securely — it will not be shown again. Use it as X-API-Key header.",
    }


@router.get("/api-keys")
async def list_api_keys(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """List user's API keys (shows prefix and status only)."""
    user_id = int(payload["user_id"])
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.user_id == user_id,
            ApiKey.is_active == True,  # noqa: E712
        )
    )
    keys = result.scalars().all()
    return [
        {"id": k.id, "prefix": k.key_prefix, "name": k.name, "last_used": k.last_used_at, "created": k.created_at}
        for k in keys
    ]


@router.delete("/api-key/{key_id}")
async def revoke_api_key(
    key_id: int,
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key."""
    user_id = int(payload["user_id"])
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id))
    ak = result.scalar_one_or_none()
    if not ak:
        raise HTTPException(status_code=404, detail="API key not found")
    ak.is_active = False  # type: ignore
    await db.commit()
    return {"message": "API key revoked"}
