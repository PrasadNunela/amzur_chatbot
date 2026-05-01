"""Database models for chat functionality."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    threads = relationship("Thread", back_populates="user", cascade="all, delete-orphan")


class Thread(Base):
    """Conversation thread model."""

    __tablename__ = "threads"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")


class Message(Base):
    """Chat message model."""

    __tablename__ = "messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    thread_id = Column(PG_UUID(as_uuid=True), ForeignKey("threads.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    thread = relationship("Thread", back_populates="messages")
