"""Authentication service for user management."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bcrypt import gensalt, hashpw, checkpw

from app.models.chat import User
from app.schemas.auth import UserRegister


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    async def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        salt = gensalt()
        hashed = hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    @staticmethod
    async def register_user(db: AsyncSession, user_data: UserRegister) -> User:
        """Register a new user."""
        # Check if user already exists
        stmt = select(User).where(User.email == user_data.email)
        result = await db.execute(stmt)
        existing_user = result.scalars().first()
        
        if existing_user:
            raise ValueError(f"User with email {user_data.email} already exists")

        # Hash password and create new user
        hashed_password = await AuthService.hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return new_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
        """Authenticate a user by email and password."""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            return None

        if not AuthService.verify_password(password, user.hashed_password):
            return None

        return user

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
        """Get a user by ID."""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
        """Get a user by email."""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
        """Get a user by Google ID."""
        stmt = select(User).where(User.google_id == google_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def register_google_user(db: AsyncSession, google_id: str, email: str, full_name: str) -> User:
        """Register or retrieve a user authenticated via Google."""
        # Check if user already exists by Google ID
        stmt = select(User).where(User.google_id == google_id)
        result = await db.execute(stmt)
        existing_user = result.scalars().first()
        
        if existing_user:
            return existing_user

        # Check if email already exists (account linking)
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        email_user = result.scalars().first()
        
        if email_user:
            # Link Google account to existing user
            email_user.google_id = google_id
            db.add(email_user)
            await db.commit()
            await db.refresh(email_user)
            return email_user

        # Create new Google user
        new_user = User(
            email=email,
            google_id=google_id,
            full_name=full_name,
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return new_user
