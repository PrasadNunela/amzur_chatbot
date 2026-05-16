"""Database models for chat functionality."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
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
    thread_mode = Column(String(20), nullable=False, default="general")  # "general" or "data_analysis"
    context_type = Column(String(20), nullable=True)  # "csv" or "google_sheets"
    context_source = Column(Text, nullable=True)  # local file path or sheets URL
    context_label = Column(String(255), nullable=True)  # display name in sidebar/header
    context_locked = Column(Boolean, nullable=False, default=False)
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
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")


class Attachment(Base):
    """File attachment model."""

    __tablename__ = "attachments"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    message_id = Column(PG_UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(String(50), nullable=False)  # Stored as string; converted in schema for large files
    file_type = Column(String(50), nullable=False)  # "image", "video", "code", "document", "table"
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    message = relationship("Message", back_populates="attachments")
