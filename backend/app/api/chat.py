"""Chat API router."""

from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.chains.chat import build_messages, create_chat_chain
from app.db.session import get_db, get_current_user
from app.models.chat import Attachment
from app.core.logger import logger
from app.schemas.chat import (
    AttachmentSchema,
    ChatMessageSchema,
    ChatResponseSchema,
    ImageGenerationRequestSchema,
    ImageGenerationResponseSchema,
    MessageSchema,
    ThreadCreateSchema,
    ThreadDetailSchema,
    ThreadSchema,
    ThreadUpdateSchema,
)
from app.services.chat import ChatService
from app.services.attachments import AttachmentService
from app.services.image_generation import ImageGenerationService
from app.core.config import settings
from sqlalchemy import select
from app.models.chat import Message

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

    # Fetch attachments for this user message
    stmt = select(Attachment).where(Attachment.message_id == user_msg.id)
    result = await db.execute(stmt)
    attachments = result.scalars().all()

    # If message has NO text but HAS attachments, add default prompt
    # This ensures the AI receives instructions on what to do with the file
    message_text = message_data.content.strip()
    if not message_text and attachments:
        default_prompt = "I've uploaded a file for you to analyze. Please examine it and help me understand its contents."
        message_text = default_prompt
        # Update the saved message to include the default prompt
        await ChatService.update_message(db, user_msg.id, default_prompt)

    # Get conversation history (excluding the message we just added)
    messages = await ChatService.get_thread_messages(db, thread_id)
    conversation_history = [
        {"role": m.role, "content": m.content}
        for m in messages[:-1]  # Exclude the latest user message
    ]

    # Extract attachment contents for LLM
    attachment_contents = []
    if attachments:
        for attachment in attachments:
            content = AttachmentService.get_attachment_content(attachment)
            attachment_contents.append(content)
    
    # ALSO include attachments from previous messages in the conversation
    # This allows follow-up questions to reference earlier uploaded files
    if not attachments:  # Only add previous attachments if current message has none
        # Iterate in REVERSE to find the most recent message with attachments
        for msg in reversed(messages[:-1]):  # Check all previous messages in reverse order
            if msg.role == "user":
                # Get attachments from this previous user message
                stmt = select(Attachment).where(Attachment.message_id == msg.id)
                result = await db.execute(stmt)
                prev_attachments = result.scalars().all()
                
                # Add previous attachments to context (from most recent message only)
                if prev_attachments:
                    for attachment in prev_attachments:
                        content = AttachmentService.get_attachment_content(attachment)
                        attachment_contents.append(content)
                    break  # Stop after finding the most recent message with attachments

    # Create LLM chain and build messages with attachments
    chain, system_prompt = create_chat_chain()
    messages_for_llm = build_messages(
        system_prompt, 
        conversation_history, 
        message_text,
        attachment_contents if attachment_contents else None
    )

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

    # Construct response with both user and assistant messages
    user_msg_schema = MessageSchema(
        id=user_msg.id,
        role=user_msg.role,
        content=user_msg.content,
        created_at=user_msg.created_at,
        attachments=[AttachmentSchema.model_validate(att) for att in attachments],
    )

    assistant_msg_schema = MessageSchema(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        created_at=assistant_msg.created_at,
        attachments=[],
    )

    return ChatResponseSchema(
        user_message=user_msg_schema,
        assistant_message=assistant_msg_schema,
        thread_id=thread_id,
    )


@router.post("/threads/{thread_id}/messages/{message_id}/respond", response_model=MessageSchema)
async def generate_response_for_message(
    thread_id: UUID,
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> MessageSchema:
    """Generate an LLM response for a message (including any attachments).
    
    This endpoint is used after attachments have been uploaded to a user message.
    It generates the AI response with awareness of the attachments.
    """
    user_id = UUID(current_user["id"])
    
    # Verify thread exists and belongs to user
    thread = await ChatService.get_thread(db, thread_id, user_id)
    if not thread:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Thread not found"})
    
    # Get the specific user message
    stmt = select(Message).where(Message.id == message_id, Message.thread_id == thread_id)
    result = await db.execute(stmt)
    user_msg = result.scalar()
    
    if not user_msg:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Message not found"})
    
    # Fetch attachments for this user message
    stmt = select(Attachment).where(Attachment.message_id == user_msg.id)
    result = await db.execute(stmt)
    attachments = result.scalars().all()
    
    # If message has NO text but HAS attachments, add default prompt
    message_text = user_msg.content.strip()
    if not message_text and attachments:
        default_prompt = "I've uploaded a file for you to analyze. Please examine it and help me understand its contents."
        message_text = default_prompt
        # Update the saved message to include the default prompt
        await ChatService.update_message(db, user_msg.id, default_prompt)
    
    # Get conversation history (all messages before this one)
    all_messages = await ChatService.get_thread_messages(db, thread_id)
    user_msg_index = next((i for i, m in enumerate(all_messages) if m.id == message_id), -1)
    
    conversation_history = [
        {"role": m.role, "content": m.content}
        for m in all_messages[:user_msg_index]  # Only messages before the user message
    ]
    
    # Extract attachment contents for LLM
    attachment_contents = []
    if attachments:
        for attachment in attachments:
            content = AttachmentService.get_attachment_content(attachment)
            attachment_contents.append(content)
    
    # Create LLM chain and build messages with attachments
    chain, system_prompt = create_chat_chain()
    messages_for_llm = build_messages(
        system_prompt, 
        conversation_history, 
        message_text,
        attachment_contents if attachment_contents else None
    )
    
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
    
    # Return the assistant message
    return MessageSchema(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        created_at=assistant_msg.created_at,
        attachments=[],
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


@router.post("/messages/{message_id}/attachments")
async def upload_attachment(
    message_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Upload a file attachment to a message."""
    # Verify message exists and belongs to user
    stmt = select(Message).where(Message.id == message_id)
    result = await db.execute(stmt)
    message = result.scalar()
    
    if not message:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Message not found"})
    
    # Verify thread belongs to user
    thread = await ChatService.get_thread(db, message.thread_id, UUID(current_user["id"]))
    if not thread:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail={"error": "invalid_file", "message": "No filename provided"})
    
    # Check file size (20 MB max)
    MAX_FILE_SIZE = 20 * 1024 * 1024
    file_content = await file.read()
    
    # If file_content is empty, try reading directly from the SpooledTemporaryFile
    if not file_content and hasattr(file, 'file') and file.file:
        file.file.seek(0)
        file_content = file.file.read()
    
    # Log file info for debugging
    logger.info(f"Uploading file: {file.filename}, size: {len(file_content)} bytes, mime_type: {file.content_type}")
    
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail={"error": "empty_file", "message": "File is empty"})
    
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail={"error": "file_too_large", "message": "File exceeds 20 MB limit"})
    
    # Determine file type using improved detection method
    mime_type = file.content_type or "application/octet-stream"
    file_type = AttachmentService._detect_file_type_with_fallback(
        file.filename or "file",
        mime_type
    )
    
    # Save file to disk
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Use message_id as prefix to ensure uniqueness
    filename_with_id = f"{message_id}_{file.filename}"
    file_path = upload_dir / filename_with_id
    
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
        logger.info(f"File saved to: {file_path}")
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail={"error": "file_save_failed", "message": f"Failed to save file: {str(e)}"})
    
    # Save attachment to database with full absolute path for reliable retrieval
    attachment = Attachment(
        message_id=message_id,
        filename=file.filename,
        file_path=str(file_path.absolute()),  # Store absolute path for reliable file access
        mime_type=mime_type,
        file_size=str(len(file_content)),  # Convert to string for VARCHAR column
        file_type=file_type,
    )
    db.add(attachment)
    await db.commit()
    
    return {"attachment_id": str(attachment.id)}


@router.get("/attachments/{attachment_id}")
async def download_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> FileResponse:
    """Download an attachment file."""
    # Get attachment
    stmt = select(Attachment).where(Attachment.id == attachment_id)
    result = await db.execute(stmt)
    attachment = result.scalar()
    
    if not attachment:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Attachment not found"})
    
    # Verify access (user owns the message)
    message_stmt = select(Message).where(Message.id == attachment.message_id)
    msg_result = await db.execute(message_stmt)
    message = msg_result.scalar()
    
    if not message:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Message not found"})
    
    thread = await ChatService.get_thread(db, message.thread_id, UUID(current_user["id"]))
    if not thread:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    
    # Return file
    file_path = Path(attachment.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "File not found on disk"})
    
    return FileResponse(
        file_path,
        media_type=attachment.mime_type,
        filename=attachment.filename,
    )


@router.post("/threads/{thread_id}/generate-image", response_model=ImageGenerationResponseSchema)
async def generate_image(
    thread_id: UUID,
    request: ImageGenerationRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ImageGenerationResponseSchema:
    """Generate images using LiteLLM proxy.
    
    Creates a user message with the prompt, generates images, and creates an assistant
    response message with the generated images attached.
    """
    logger.info(f"[API-GenerateImage] Prompt: {request.prompt[:50]}...")
    
    user_id = UUID(current_user["id"])
    
    # Verify thread exists and belongs to user
    thread = await ChatService.get_thread(db, thread_id, user_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    try:
        # Create user message with the prompt
        user_msg = await ChatService.save_message(
            db,
            thread_id,
            role="user",
            content=f"Generate image: {request.prompt}",
        )
        
        # Generate images
        result = await ImageGenerationService.generate_image(
            prompt=request.prompt,
            user_email=current_user["email"],
            size=request.size,
            quality=request.quality,
            n=request.n,
        )
        
        if not result["success"]:
            logger.error(f"[API-GenerateImage] Generation failed: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        # Save generated images as attachments to user message
        for image_info in result["images"]:
            attachment_path = Path(settings.UPLOAD_DIR) / image_info["filename"]
            if attachment_path.exists():
                file_size = attachment_path.stat().st_size
                attachment = Attachment(
                    message_id=user_msg.id,
                    filename=image_info["filename"],
                    file_path=str(attachment_path),
                    mime_type="image/jpeg",
                    file_size=str(file_size),
                    file_type="image",
                )
                db.add(attachment)
        
        await db.flush()
        await db.commit()
        
        # Create assistant response
        assistant_msg = await ChatService.save_message(
            db,
            thread_id,
            role="assistant",
            content=f"I've generated {len(result['images'])} image(s) based on your prompt.",
        )
        
        # Attach images to assistant message too
        for image_info in result["images"]:
            attachment_path = Path(settings.UPLOAD_DIR) / image_info["filename"]
            if attachment_path.exists():
                file_size = attachment_path.stat().st_size
                attachment = Attachment(
                    message_id=assistant_msg.id,
                    filename=image_info["filename"],
                    file_path=str(attachment_path),
                    mime_type="image/jpeg",
                    file_size=str(file_size),
                    file_type="image",
                )
                db.add(attachment)
        
        await db.flush()
        
        await db.commit()
        
        logger.info(f"[API-GenerateImage] Response data: success=True, images={result['images']}, model={result.get('model')}")
        
        try:
            # Convert size to string for schema validation
            formatted_images = [
                {
                    'url': img.get('url'),
                    'filename': img['filename'],
                    'size': str(img.get('size', 0))
                }
                for img in result["images"]
            ]
            response = ImageGenerationResponseSchema(
                success=True,
                images=formatted_images,
                model=result.get("model"),
            )
            return response
        except Exception as e:
            logger.error(f"[API-GenerateImage] Failed to create response schema: {str(e)}")
            logger.error(f"[API-GenerateImage] Images data: {result['images']}")
            raise
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API-GenerateImage] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

