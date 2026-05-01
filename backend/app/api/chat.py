"""Chat API router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.chat import build_messages, create_chat_chain
from app.db.session import get_db, get_current_user
from app.schemas.chat import (
    ChatMessageSchema,
    ChatResponseSchema,
    MessageSchema,
    ThreadCreateSchema,
    ThreadDetailSchema,
    ThreadSchema,
    ThreadUpdateSchema,
)
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/threads", response_model=ThreadSchema)
async def create_thread(
    thread_data: ThreadCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ThreadSchema:
    """Create a new conversation thread."""
    user_id = UUID(current_user["id"])
    thread = await ChatService.create_thread(
        db,
        user_id=user_id,
        title=thread_data.title,
    )
    return ThreadSchema.model_validate(thread)


@router.get("/threads", response_model=list[ThreadSchema])
async def list_threads(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ThreadSchema]:
    """List all conversation threads for the user."""
    user_id = UUID(current_user["id"])
    threads = await ChatService.list_threads(db, user_id=user_id)
    return [ThreadSchema.model_validate(t) for t in threads]


@router.get("/threads/{thread_id}", response_model=ThreadDetailSchema)
async def get_thread(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ThreadDetailSchema:
    """Get a thread with all its messages."""
    user_id = UUID(current_user["id"])
    thread = await ChatService.get_thread(db, thread_id, user_id)
    if not thread:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    return ThreadDetailSchema.model_validate(thread)


@router.put("/threads/{thread_id}", response_model=ThreadSchema)
async def update_thread(
    thread_id: UUID,
    update_data: ThreadUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ThreadSchema:
    """Update thread title."""
    user_id = UUID(current_user["id"])
    thread = await ChatService.update_thread(db, thread_id, user_id, title=update_data.title)
    if not thread:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    return ThreadSchema.model_validate(thread)


@router.post("/threads/{thread_id}/messages", response_model=ChatResponseSchema)
async def send_message(
    thread_id: UUID,
    message_data: ChatMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ChatResponseSchema:
    """Send a message and get a response from the AI."""
    user_id = UUID(current_user["id"])
    
    # Verify thread exists and belongs to user
    thread = await ChatService.get_thread(db, thread_id, user_id)
    if not thread:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})

    # Save user message
    user_msg = await ChatService.save_message(
        db,
        thread_id,
        role="user",
        content=message_data.content,
    )

    # Get conversation history (excluding the message we just added)
    messages = await ChatService.get_thread_messages(db, thread_id)
    conversation_history = [
        {"role": m.role, "content": m.content}
        for m in messages[:-1]  # Exclude the latest user message
    ]

    # Create LLM chain and build messages
    chain, system_prompt = create_chat_chain()
    messages_for_llm = build_messages(system_prompt, conversation_history, message_data.content)

    # Get response from LLM with user tracking
    response_text = chain.invoke(
        messages_for_llm,
        config={"metadata": {"user_email": current_user["email"]}},
    )

    # Save assistant response
    assistant_msg = await ChatService.save_message(
        db,
        thread_id,
        role="assistant",
        content=response_text,
    )

    return ChatResponseSchema(
        message=MessageSchema.model_validate(assistant_msg),
        thread_id=thread_id,
    )


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete a conversation thread."""
    user_id = UUID(current_user["id"])
    success = await ChatService.delete_thread(db, thread_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    return {"message": "Thread deleted"}
