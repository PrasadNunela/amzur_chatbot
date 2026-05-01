"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response (excludes password)."""

    id: str
    email: str
    full_name: str | None = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and token."""

    user: UserResponse
    message: str = "Authentication successful"
