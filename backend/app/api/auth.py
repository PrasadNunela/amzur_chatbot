"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import OperationalError
import socket
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError

from app.db.session import get_db
from app.services.auth import AuthService
from app.schemas.auth import UserRegister, UserLogin, AuthResponse
from app.core.jwt import JWTManager
from app.core.config import settings
from app.core.logger import logger

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleTokenRequest(BaseModel):
    """Request model for Google token exchange."""
    token: str


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


@router.post("/google/token", response_model=AuthResponse)
async def google_token(req: GoogleTokenRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Authenticate user with Google ID token."""
    try:
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "oauth_not_configured",
                    "message": "Google OAuth is not configured on the server.",
                },
            )

        # Verify Google ID token and enforce expected audience (client id).
        token_data = id_token.verify_oauth2_token(
            req.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        google_id = token_data.get("sub")
        email = token_data.get("email")
        full_name = token_data.get("name")

        if not all([google_id, email]):
            raise HTTPException(status_code=401, detail="Invalid token data")

        # Register or get user
        user = await AuthService.register_google_user(db, google_id, email, full_name or "")

        # Create JWT token
        jwt_token = JWTManager.create_access_token(str(user.id))

        # Set JWT cookie
        response.set_cookie(
            key="access_token",
            value=jwt_token,
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
        # Raised by verify_oauth2_token for invalid token/audience/issuer.
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except GoogleAuthError as e:
        raise HTTPException(status_code=502, detail=f"Google auth verification failed: {str(e)}")
    except HTTPException:
        raise
    except (OperationalError, socket.gaierror) as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "database_unavailable",
                "message": "Database is unreachable. Please verify DATABASE_URL in backend/.env.",
            },
        ) from e
    except Exception as e:
        logger.exception("Google token authentication failed")
        raise HTTPException(status_code=500, detail=str(e))

