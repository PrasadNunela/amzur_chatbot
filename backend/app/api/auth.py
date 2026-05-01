"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.db.session import get_db
from app.services.auth import AuthService
from app.schemas.auth import UserRegister, UserLogin, AuthResponse
from app.core.jwt import JWTManager
from app.core.config import settings

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
        print(f"[GOOGLE_TOKEN] Received token request")
        print(f"[GOOGLE_TOKEN] Token length: {len(req.token) if req.token else 0}")
        
        # Verify token with Google
        async with httpx.AsyncClient() as client:
            print(f"[GOOGLE_TOKEN] Calling Google tokeninfo endpoint...")
            google_response = await client.post(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": req.token}
            )
        
        print(f"[GOOGLE_TOKEN] Google response status: {google_response.status_code}")
        
        if google_response.status_code != 200:
            print(f"[GOOGLE_TOKEN] Invalid token response: {google_response.text}")
            raise HTTPException(status_code=401, detail="Invalid Google token")
        
        token_data = google_response.json()
        print(f"[GOOGLE_TOKEN] Token data: {token_data}")
        
        google_id = token_data.get("sub")
        email = token_data.get("email")
        full_name = token_data.get("name")
        
        if not all([google_id, email]):
            print(f"[GOOGLE_TOKEN] Missing google_id or email")
            raise HTTPException(status_code=401, detail="Invalid token data")
        
        # Register or get user
        print(f"[GOOGLE_TOKEN] Registering/getting user: {email}")
        user = await AuthService.register_google_user(db, google_id, email, full_name or "")
        print(f"[GOOGLE_TOKEN] User: {user.id}, {user.email}")
        
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
        
        print(f"[GOOGLE_TOKEN] Authentication successful")
        
        return AuthResponse(
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[GOOGLE_TOKEN] Error: {str(e)}")
        print(f"[GOOGLE_TOKEN] Exception type: {type(e)}")
        import traceback
        print(f"[GOOGLE_TOKEN] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

