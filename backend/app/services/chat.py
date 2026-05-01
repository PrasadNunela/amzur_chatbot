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
    async def create_thread(
        db: AsyncSession,
        user_id: UUID,
        title: str | None = None,
    ) -> Thread:
        """Create a new conversation thread."""
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
            .options(selectinload(Thread.messages))
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
        
        # Update thread's updated_at timestamp
        stmt = select(Thread).where(Thread.id == thread_id)
        result = await db.execute(stmt)
        thread = result.scalars().first()
        if thread:
            thread.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_thread_messages(db: AsyncSession, thread_id: UUID) -> list[Message]:
        """Get all messages in a thread."""
        stmt = (
            select(Message)
            .where(Message.thread_id == thread_id)
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
