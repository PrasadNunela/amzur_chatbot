"""Database session factory using SQLAlchemy 2.0."""

import ssl

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

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
