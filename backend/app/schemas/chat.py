"""Chat schemas for request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageSchema(BaseModel):
    """Chat message schema."""

    id: UUID
    role: str  # "user" or "assistant"
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ThreadBaseSchema(BaseModel):
    """Base thread schema."""

    title: str | None = None


class ThreadCreateSchema(ThreadBaseSchema):
    """Create thread request."""

    pass


class ThreadUpdateSchema(BaseModel):
    """Update thread request."""

    title: str = Field(..., min_length=1, max_length=255)


class ThreadSchema(ThreadBaseSchema):
    """Thread response schema."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreadDetailSchema(ThreadSchema):
    """Thread with messages response."""

    messages: list[MessageSchema] = Field(default_factory=list)


class ChatMessageSchema(BaseModel):
    """Chat message request — user sends text to assistant."""

    content: str = Field(..., min_length=1, max_length=4000)


class ChatResponseSchema(BaseModel):
    """Chat response — assistant's message."""

    message: MessageSchema
    thread_id: UUID
