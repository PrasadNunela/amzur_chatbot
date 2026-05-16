"""Chat schemas for request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AttachmentSchema(BaseModel):
    """File attachment schema."""

    id: UUID
    filename: str
    file_path: str
    mime_type: str
    file_size: int
    file_type: str  # "image", "video", "code", "document", "table"
    created_at: datetime

    @field_validator('file_size', mode='before')
    def convert_file_size(cls, v):
        """Convert file_size from string to int."""
        if isinstance(v, str):
            return int(v)
        return v

    class Config:
        from_attributes = True


class MessageSchema(BaseModel):
    """Chat message schema."""

    id: UUID
    role: str  # "user" or "assistant"
    content: str
    created_at: datetime
    attachments: list[AttachmentSchema] = Field(default_factory=list)

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
    thread_mode: str = "general"
    thread_type: str = "general"
    context_type: str | None = None
    context_source: str | None = None
    file_context_url: str | None = None
    context_label: str | None = None
    context_locked: bool = False
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='after')
    def sync_alias_fields(self):
        """Keep compatibility aliases in sync with canonical fields."""
        self.thread_type = self.thread_mode
        self.file_context_url = self.context_source
        return self

    class Config:
        from_attributes = True


class ThreadDetailSchema(ThreadSchema):
    """Thread with messages response."""

    messages: list[MessageSchema] = Field(default_factory=list)


class ThreadContextUrlSchema(BaseModel):
    """Request schema for setting a thread context from Google Sheets URL."""

    google_sheets_url: str = Field(..., min_length=10, max_length=2048)


class ChatMessageSchema(BaseModel):
    """Chat message request — user sends text to assistant."""

    content: str = Field(default="", min_length=0, max_length=4000)


class ChatResponseSchema(BaseModel):
    """Chat response — includes both user and assistant messages."""

    user_message: MessageSchema
    assistant_message: MessageSchema
    thread_id: UUID


class ImageGenerationRequestSchema(BaseModel):
    """Image generation request schema."""
    
    prompt: str = Field(..., min_length=1, max_length=1000, description="Image description prompt")
    size: str = Field(default="1024x1024", description="Image size")
    quality: str = Field(default="standard", description="Image quality")
    n: int = Field(default=1, ge=1, le=4, description="Number of images to generate")


class GeneratedImageSchema(BaseModel):
    """Schema for a generated image."""
    
    url: str | None = None  # May be None from some providers (e.g., Gemini Imagen via LiteLLM)
    filename: str
    size: str


class ImageGenerationResponseSchema(BaseModel):
    """Image generation response schema."""
    
    success: bool
    images: list[GeneratedImageSchema] | None = None
    model: str | None = None
    error: str | None = None

