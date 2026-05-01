"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth import AuthService
from app.schemas.auth import UserRegister, UserLogin, AuthResponse
from app.core.jwt import JWTManager
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    try:
        user = await AuthService.register_user(db, user_data)
        token = JWTManager.create_access_token(str(user.id))
        
        # Set JWT cookie
        response.set_cookie(
            key="access_token",
            value=token,
            max_age=settings.JWT_EXPIRE_MINUTES * 60,
            httponly=True,
            samesite="lax",
            secure=settings.ENVIRONMENT == "production",
        )
        
        return AuthResponse(
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login a user."""
    user = await AuthService.authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = JWTManager.create_access_token(str(user.id))
    
    # Set JWT cookie
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )
    
    return AuthResponse(
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
        },
    )

