"""Chat service — all business logic for threading and messaging."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import Message, Thread


class ChatService:
    """Service for managing chat threads and messages."""

    @staticmethod
    def _generate_thread_title(message_content: str, max_length: int = 50) -> str:
        """Generate a thread title from the first message."""
        # Strip whitespace and take first few words
        cleaned = message_content.strip()
        if len(cleaned) > max_length:
            # Truncate at word boundary
            truncated = cleaned[:max_length].rsplit(' ', 1)[0]
            return truncated + "..."
        return cleaned

    @staticmethod
    async def create_thread(
        db: AsyncSession,
        user_id: UUID,
        title: str | None = None,
    ) -> Thread:
        """Create a new conversation thread."""
        # Generate a default title if none provided
        if not title:
            now = datetime.utcnow()
            title = now.strftime("Chat - %b %d, %I:%M %p")
        
        thread = Thread(user_id=user_id, title=title)
        db.add(thread)
        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def get_thread(db: AsyncSession, thread_id: UUID, user_id: UUID) -> Thread | None:
        """Get a thread by ID (ensure user owns it)."""
        stmt = (
            select(Thread)
            .where(Thread.id == thread_id, Thread.user_id == user_id)
            .options(selectinload(Thread.messages).selectinload(Message.attachments))
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def update_thread(
        db: AsyncSession,
        thread_id: UUID,
        user_id: UUID,
        title: str | None = None,
    ) -> Thread | None:
        """Update a thread (ensure user owns it)."""
        stmt = select(Thread).where(Thread.id == thread_id, Thread.user_id == user_id)
        result = await db.execute(stmt)
        thread = result.scalars().first()
        
        if not thread:
            return None
        
        if title is not None:
            thread.title = title
        
        thread.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def set_thread_context(
        db: AsyncSession,
        thread_id: UUID,
        user_id: UUID,
        context_type: str,
        context_source: str,
        context_label: str,
    ) -> Thread | None:
        """Set immutable context for a thread (CSV file or Google Sheets URL)."""
        stmt = select(Thread).where(Thread.id == thread_id, Thread.user_id == user_id)
        result = await db.execute(stmt)
        thread = result.scalars().first()

        if not thread:
            return None

        if thread.context_locked:
            return thread

        thread.context_type = context_type
        thread.context_source = context_source
        thread.context_label = context_label
        thread.context_locked = True
        thread.thread_mode = "data_analysis"
        if not thread.title:
            thread.title = f"{context_label} Chat"
        thread.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def list_threads(db: AsyncSession, user_id: UUID) -> list[Thread]:
        """List all threads for a user."""
        stmt = (
            select(Thread)
            .where(Thread.user_id == user_id)
            .order_by(Thread.updated_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def save_message(
        db: AsyncSession,
        thread_id: UUID,
        role: str,
        content: str,
    ) -> Message:
        """Save a message to a thread."""
        message = Message(thread_id=thread_id, role=role, content=content)
        db.add(message)
        
        # Update thread's updated_at timestamp and auto-generate title from first user message
        stmt = select(Thread).where(Thread.id == thread_id)
        result = await db.execute(stmt)
        thread = result.scalars().first()
        if thread:
            # Count existing messages to check if this is the first one
            msg_stmt = select(Message).where(Message.thread_id == thread_id)
            msg_result = await db.execute(msg_stmt)
            existing_messages = msg_result.scalars().all()
            
            # If this is the first user message and title looks like default format, update it
            if role == "user" and len(existing_messages) == 0:
                thread.title = ChatService._generate_thread_title(content)
            
            thread.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def update_message(
        db: AsyncSession,
        message_id: UUID,
        content: str,
    ) -> Message | None:
        """Update an existing message's content."""
        stmt = select(Message).where(Message.id == message_id)
        result = await db.execute(stmt)
        message = result.scalars().first()
        
        if not message:
            return None
        
        message.content = content
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_thread_messages(db: AsyncSession, thread_id: UUID) -> list[Message]:
        """Get all messages in a thread."""
        stmt = (
            select(Message)
            .where(Message.thread_id == thread_id)
            .options(selectinload(Message.attachments))
            .order_by(Message.created_at.asc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def delete_thread(db: AsyncSession, thread_id: UUID, user_id: UUID) -> bool:
        """Delete a thread (ensure user owns it)."""
        thread = await ChatService.get_thread(db, thread_id, user_id)
        if not thread:
            return False
        
        await db.delete(thread)
        await db.commit()
        return True
