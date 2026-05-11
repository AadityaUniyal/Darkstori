"""Authentication routes."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import create_access_token, hash_password, verify_token
from backend.database.connection import get_db

router = APIRouter()


class UserLogin(BaseModel):
    """User login request model."""

    email: EmailStr
    password: str


class UserRegister(BaseModel):
    """User registration request model."""

    email: EmailStr
    password: str
    full_name: str


class Token(BaseModel):
    """Token response model."""

    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # In production, check if user exists and save to database
    # For now, return a token

    hashed_password = hash_password(user.password)

    # Create token
    token_data = {"sub": user.email, "role": "user", "name": user.full_name}

    access_token = create_access_token(token_data)

    logger.info(f"New user registered: {user.email}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.email,
        "role": "user",
    }


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user and return JWT token."""
    # In production, verify against database
    # For now, accept any credentials for demo

    # Create token
    token_data = {"sub": credentials.email, "role": "user"}

    access_token = create_access_token(token_data)

    logger.info(f"User logged in: {credentials.email}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": credentials.email,
        "role": "user",
    }


@router.post("/refresh")
async def refresh_token(payload: dict = Depends(verify_token)):
    """Refresh access token."""
    new_token = create_access_token(
        {"sub": payload["sub"], "role": payload.get("role", "user")}
    )

    return {"access_token": new_token, "token_type": "bearer"}
