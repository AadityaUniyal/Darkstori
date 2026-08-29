"""Authentication routes — real DB-backed login/register with refresh token rotation."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr, field_validator, model_validator
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
    hash_password,
    verify_password,
)

from backend.database.connection import get_db
from backend.database.models.models import ApiKey, RefreshToken, User
from backend.utils.email import send_welcome_email
from backend.core.audit import log_audit_action

from backend.core.cache import cache

router = APIRouter()

# ── Request/Response Schemas ──────────────────────────────────────────────────


class UserLogin(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

    @model_validator(mode="before")
    @classmethod
    def normalize_login(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("email"):
                data["email"] = data.get("username") or ""
        return data


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""
    username: str = ""

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


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


async def _make_token(user: User, db: AsyncSession) -> dict:
    """Create token pair and persist refresh token to DB."""
    access_expire = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expire = timedelta(days=7)
    uid = user.id if getattr(user, "id", None) is not None else 1
    token_data = {"sub": user.email, "role": user.role, "user_id": str(uid)}
    access_token = create_access_token(token_data, expires_delta=access_expire)
    refresh_token_str, jti = create_refresh_token(token_data, expires_delta=refresh_expire)
    # Persist refresh token JTI to DB
    expires_at = datetime.now(timezone.utc) + refresh_expire
    # the internal naive datetime storage might complain if we give it tz-aware, 
    # but sqlalchemy usually handles it. If it doesn't, we might need .replace(tzinfo=None)
    # Actually, the python 3.11 warning suggests we just use .now(timezone.utc). 
    # Let's strip tzinfo for SQLAlchemy's default DateTime column.
    expires_at = expires_at.replace(tzinfo=None)
    await store_refresh_token(db, int(uid), jti, expires_at)  # type: ignore
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user_id": str(uid),
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
        hashed_password=hash_password(user.password),
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
    login_id = credentials.email or credentials.username or ""
    result = await db.execute(select(User).where((User.email == login_id) | (User.username == login_id)))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, str(user.hashed_password)):  # type: ignore
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


# ── Password Reset & Email Verification Flows ─────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initiate password reset. Generates a token and logs/emails reset instructions."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        # Prevent user enumeration: return success even if email doesn't exist
        return {"message": "If this email exists, instructions have been sent."}

    import secrets
    reset_token = secrets.token_urlsafe(32)
    # Store token in Redis cache with 15-minute expiration
    cache_key = f"reset_token:{reset_token}"
    await cache.set(cache_key, str(user.email), ttl=15 * 60)

    # Log reset instructions (in production, this would send an email via SMTP/Resend)
    logger.info(f"[AUTH] Password reset requested for {body.email}. Token: {reset_token}")
    return {"message": "If this email exists, instructions have been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Complete password reset using verification token."""
    cache_key = f"reset_token:{body.token}"
    email = await cache.get(cache_key)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.email == str(email)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.hashed_password = hash_password(body.new_password)  # type: ignore
    
    # Revoke token
    await cache.delete(cache_key)

    # Invalidate all current sessions for security
    session_result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == int(user.id),
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    tokens = session_result.scalars().all()
    for rt in tokens:
        rt.revoked = True  # type: ignore
        if rt.token_jti:
            await cache.set(f"revoked_jti:{rt.token_jti}", "1", ttl=7 * 24 * 60 * 60)

    await db.commit()
    logger.info(f"Password reset successfully for user: {email}")
    return {"message": "Password reset successfully. All active sessions revoked."}


@router.post("/verify-email")
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify user email address using verification token."""
    cache_key = f"verify_token:{body.token}"
    email = await cache.get(cache_key)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    result = await db.execute(select(User).where(User.email == str(email)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True  # type: ignore
    await cache.delete(cache_key)
    await db.commit()

    logger.info(f"Email verified successfully for: {email}")
    return {"message": "Email verified successfully."}

