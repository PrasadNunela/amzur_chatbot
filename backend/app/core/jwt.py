"""JWT token management utilities."""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import settings


class JWTManager:
    """Manage JWT token creation and verification."""

    @staticmethod
    def create_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
        """Create a JWT token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm="HS256",
        )
        
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict[str, Any] | None:
        """Decode and verify a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )
            return payload
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def create_access_token(user_id: str) -> str:
        """Create an access token for a user."""
        return JWTManager.create_token({"sub": user_id})
