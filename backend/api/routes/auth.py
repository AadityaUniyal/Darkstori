"""Authentication routes — real DB-backed login/register with refresh token rotation."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
from backend.database.models.models import ApiKey, Organization, RefreshToken, User
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
    organization: str = ""
    city: Optional[str] = "Bangalore"
    role: Optional[str] = "executive"
    pincode: Optional[str] = "560034"
    store_name: Optional[str] = None

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

    @field_validator("organization")
    @classmethod
    def normalize_organization(cls, value):
        value = " ".join(value.split())
        if len(value) > 200:
            raise ValueError("Workspace name must be 200 characters or fewer")
        return value


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    email: str
    organization_id: Optional[str] = None
    store_id: Optional[int] = None
    store_name: Optional[str] = None
    city: Optional[str] = None


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
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    store_id: Optional[int] = None
    store_name: Optional[str] = None
    city: Optional[str] = None


class DemoLoginRequest(BaseModel):
    role: str = "director"
    email: Optional[str] = None
    full_name: Optional[str] = None
    persona_id: Optional[str] = None

# ── Helpers ───────────────────────────────────────────────────────────────────


async def _make_token(user: User, db: AsyncSession) -> dict:
    """Create token pair and persist refresh token to DB."""
    access_expire = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expire = timedelta(days=7)
    uid = user.id if getattr(user, "id", None) is not None else 1
    token_data = {"sub": user.email, "role": user.role, "user_id": str(uid)}
    if user.organization_id is not None:
        token_data["organization_id"] = str(user.organization_id)
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
    store_info = {}
    if user.organization_id is not None:
        try:
            from backend.database.models.models import DarkStore
            st_res = await db.execute(select(DarkStore).where(DarkStore.organization_id == user.organization_id))
            st = st_res.scalars().first()
            if st:
                store_info = {
                    "store_id": st.id,
                    "store_name": st.store_name,
                    "city": st.city,
                    "organization_id": str(user.organization_id),
                }
        except Exception:
            pass

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user_id": str(uid),
        "role": user.role,
        "email": user.email,
        "organization_id": str(user.organization_id) if user.organization_id is not None else None,
        **store_info
    }

# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user: UserRegister,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a user into a newly created, isolated workspace."""
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    workspace_name = user.organization or f"{user.full_name.strip() or user.email.split('@')[0]}'s workspace"
    existing_workspace = await db.execute(
        select(Organization).where(Organization.name.ilike(workspace_name))
    )
    if existing_workspace.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That workspace name is already in use. Choose another name or ask a workspace admin for an invite.",
        )
    username = user.username or user.email.split("@")[0]
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        username = f"{username}_{user.email.split('@')[0][-4:]}"
    workspace = Organization(name=workspace_name)
    db.add(workspace)
    await db.flush()
    new_user = User(
        email=user.email,
        username=username,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
        role=user.role or "executive",
        is_active=True,
        organization_id=workspace.id,
    )
    db.add(new_user)

    # Immediately provision initial DarkStori Pod for this organization
    try:
        from backend.database.models.models import DarkStore
        city_coords = {
            "Bangalore": (12.9716, 77.5946, "560001"),
            "Mumbai": (19.0760, 72.8777, "400001"),
            "Delhi": (28.6139, 77.2090, "110001"),
            "Delhi NCR": (28.6139, 77.2090, "110001"),
            "Hyderabad": (17.3850, 78.4867, "500001"),
            "Chennai": (13.0827, 80.2707, "600001"),
            "Kolkata": (22.5726, 88.3639, "700001"),
            "Pune": (18.5204, 73.8567, "411001"),
            "Jaipur": (26.9124, 75.7873, "302001"),
            "Lucknow": (26.8467, 80.9462, "226001"),
            "Chandigarh": (30.7333, 76.7794, "160017"),
            "Kochi": (9.9312, 76.2673, "682001"),
        }
        chosen_city = user.city or "Bangalore"
        coords = city_coords.get(chosen_city, (12.9716, 77.5946, "560001"))
        store_title = user.store_name or f"DarkStori - {workspace_name} Pod 01"
        initial_store = DarkStore(
            platform="DarkStori",
            store_name=store_title,
            city=chosen_city,
            pincode=user.pincode or coords[2],
            latitude=coords[0],
            longitude=coords[1],
            city_tier="Tier-1",
            organization_id=workspace.id,
            is_active=True,
        )
        db.add(initial_store)
    except Exception as store_err:
        logger.warning(f"Could not provision initial store: {store_err}")

    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.info("Registration uniqueness conflict for %s", user.email)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email, username, or workspace is already registered.",
        ) from exc
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


@router.post("/demo-login", response_model=Token)
async def demo_login(
    request: Request,
    req: Optional[DemoLoginRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate or generate a sandbox demo persona with genuine signed tokens."""
    allow_demo = getattr(settings, "ALLOW_DEMO_LOGIN", True) or settings.ENVIRONMENT.strip().lower() in {"development", "test"}
    if not allow_demo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo login is unavailable")
    req = req or DemoLoginRequest()
    allowed_demo_roles = {"director", "executive", "store-gm", "store_gm", "gm", "fleet-commander", "fleet", "datascience", "franchise", "user", "admin"}
    requested_role = (req.role or "director").strip().lower()
    role_aliases = {
        "executive": "director",
        "fleet": "fleet-commander",
        "store_gm": "store-gm",
        "store-gm": "store-gm",
        "admin": "director"
    }
    requested_role = role_aliases.get(requested_role, requested_role)
    if requested_role not in allowed_demo_roles and req.role.strip().lower() not in allowed_demo_roles:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported demo persona")
    demo_email = req.email or f"{req.persona_id or req.role}@darkstor.demo"
    result = await db.execute(select(User).where(User.email == demo_email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=demo_email,
            username=demo_email.split("@")[0],
            full_name=req.full_name or f"Demo {req.role.capitalize()}",
            hashed_password=hash_password("DemoPassword123!"),
            role=requested_role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif user.role != requested_role:
        user.role = requested_role
        await db.commit()
        await db.refresh(user)

    logger.info(f"Demo persona logged in: {demo_email} (role: {user.role})")
    await log_audit_action(db, "USER_DEMO_LOGIN", request=request, user_id=int(user.id))
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
    """Get current user profile with resolved organization and dark store details."""
    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    org_name = None
    store_id = None
    store_name = None
    store_city = None

    if user.organization_id:
        org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
        org = org_res.scalar_one_or_none()
        if org:
            org_name = org.name

        from backend.database.models.models import DarkStore
        store_res = await db.execute(select(DarkStore).where(DarkStore.organization_id == user.organization_id))
        st = store_res.scalars().first()
        if st:
            store_id = st.id
            store_name = st.store_name
            store_city = st.city

    return UserOut(
        id=int(user.id),  # type: ignore
        email=str(user.email),  # type: ignore
        username=str(user.username),  # type: ignore
        role=str(user.role),  # type: ignore
        is_active=bool(user.is_active),  # type: ignore
        organization_id=int(user.organization_id) if user.organization_id else None,
        organization_name=org_name,
        store_id=store_id,
        store_name=store_name,
        city=store_city,
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

