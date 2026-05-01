"""Database session factory using SQLAlchemy 2.0."""

import ssl
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.jwt import JWTManager

# Create SSL context with certificate verification disabled for Supabase
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    connect_args={"ssl": ssl_context},
)

# Create async sessionmaker
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    future=True,
)


async def get_db() -> AsyncSession:
    """Dependency for FastAPI to inject database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Get current authenticated user from JWT cookie."""
    # Try to get token from cookies
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Decode token
    payload = JWTManager.decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user exists
    from app.services.auth import AuthService
    user = await AuthService.get_user_by_id(db, UUID(user_id))
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {"id": str(user.id), "email": user.email}
