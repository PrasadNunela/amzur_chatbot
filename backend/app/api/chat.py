"""Chat API router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.chat import build_messages, create_chat_chain
from app.db.session import get_db
from app.schemas.chat import (
    ChatMessageSchema,
    ChatResponseSchema,
    MessageSchema,
    ThreadCreateSchema,
    ThreadDetailSchema,
    ThreadSchema,
)
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])

# Mock user_id — in a real app, this comes from JWT auth
MOCK_USER_ID = UUID("12345678-1234-5678-1234-567812345678")


@router.post("/threads", response_model=ThreadSchema)
async def create_thread(
    thread_data: ThreadCreateSchema,
    db: AsyncSession = Depends(get_db),
) -> ThreadSchema:
    """Create a new conversation thread."""
    thread = await ChatService.create_thread(
        db,
        user_id=MOCK_USER_ID,
        title=thread_data.title,
    )
    return ThreadSchema.model_validate(thread)


@router.get("/threads", response_model=list[ThreadSchema])
async def list_threads(db: AsyncSession = Depends(get_db)) -> list[ThreadSchema]:
    """List all conversation threads for the user."""
    threads = await ChatService.list_threads(db, user_id=MOCK_USER_ID)
    return [ThreadSchema.model_validate(t) for t in threads]


@router.get("/threads/{thread_id}", response_model=ThreadDetailSchema)
async def get_thread(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ThreadDetailSchema:
    """Get a thread with all its messages."""
    thread = await ChatService.get_thread(db, thread_id, MOCK_USER_ID)
    if not thread:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    return ThreadDetailSchema.model_validate(thread)


@router.post("/threads/{thread_id}/messages", response_model=ChatResponseSchema)
async def send_message(
    thread_id: UUID,
    message_data: ChatMessageSchema,
    db: AsyncSession = Depends(get_db),
) -> ChatResponseSchema:
    """Send a message and get a response from the AI."""
    
    # Verify thread exists and belongs to user
    thread = await ChatService.get_thread(db, thread_id, MOCK_USER_ID)
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
        config={"metadata": {"user_email": "chatbot@amzur.com"}},
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
) -> dict:
    """Delete a conversation thread."""
    success = await ChatService.delete_thread(db, thread_id, MOCK_USER_ID)
    if not success:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    return {"message": "Thread deleted"}
