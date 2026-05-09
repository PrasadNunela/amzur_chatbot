"""LLM chain for chat — LCEL pipeline."""

from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

from app.ai.llm import llm


def create_chat_chain():
    """Create an LCEL chain for chat interactions."""
    
    # Get current date and time
    now = datetime.utcnow()
    current_date = now.strftime("%A, %B %d, %Y")
    current_time = now.strftime("%I:%M %p UTC")
    
    system_prompt = SystemMessage(
        content=f"""You are a helpful and accurate AI assistant with strong vision capabilities and image generation abilities.

Current date and time: {current_date} at {current_time}

IMAGE GENERATION FEATURE:
- You can generate AI images! When a user asks you to draw, create, generate, paint, sketch, or illustrate something:
  1. Acknowledge their request positively
  2. Extract a clear, detailed description of what they want
  3. Suggest they click the 🎨 (palette emoji) button in the chat
  4. Provide the exact prompt they should use in the image generator
  Example: "I can create that for you! Click the 🎨 button and enter this prompt: 'A watercolor painting of a red apple on a wooden table with dramatic lighting'"

IMPORTANT - WHEN PROCESSING IMAGES:
- Analyze images carefully and accurately describe what you see
- Use your visual understanding to identify colors, objects, text, and details
- Be specific and precise when describing visual elements
- If uncertain about a detail, say so, but provide your best assessment based on what's visible

IMPORTANT - WHEN PROCESSING TEXT/DATA FILES:
- ONLY reference information that is explicitly present in the file
- Do NOT add information from your training data or general knowledge
- If a file contains data, analyze ONLY what's in that data
- Do NOT hallucinate, make up, or infer data that isn't shown
- If asked about something not in the file, clearly state "This information is not in the provided file"
- Do NOT mix file data with external knowledge unless explicitly asked to compare
- When discussing file contents, be precise and cite the exact values/text from the file
- If you're unsure about interpreting data, ask for clarification rather than guessing

GUIDELINES:
- Respond naturally and conversationally
- Be concise but informative
- If you don't know something (and it's not in the files), say so honestly
- Maintain context from the conversation history
- Always prioritize accuracy over completeness when files are involved"""
    )

    # LCEL pipeline: prompt + llm + parser
    # We'll manually handle prompts to include conversation history
    chain = llm() | StrOutputParser()

    return chain, system_prompt


def build_messages(system_prompt, conversation_history: list[dict], user_message: str, attachments: list[str | dict] = None):
    """Build message list for the LLM from conversation history.
    
    Args:
        system_prompt: SystemMessage with system instructions
        conversation_history: List of dicts with 'role' and 'content'
        user_message: Current user's text message
        attachments: Optional list of attachment contents (text, image dicts, or video frame dicts)
    """
    messages = [system_prompt]

    # Add conversation history
    for msg in conversation_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    # Build current user message with attachments
    current_message_content = []
    
    # Add text only if user provided a message
    if user_message.strip():
        current_message_content.append({"type": "text", "text": user_message})
    
    # Add attachment content to the message
    if attachments:
        # For text/data files, add reminder to stick to file content
        # For images/video, no reminder needed - let vision model work freely
        has_text_attachments = any(
            isinstance(att, str) or (isinstance(att, dict) and att.get("type") not in ["image", "video_frames"])
            for att in attachments
        )
        
        if has_text_attachments:
            attachment_reminder = "\n\n[NOTE: The following file data is provided. Please analyze ONLY what is shown in these files and do not add external information.]"
            if current_message_content and current_message_content[-1].get("type") == "text":
                current_message_content[-1]["text"] += attachment_reminder
            else:
                current_message_content.append({"type": "text", "text": attachment_reminder})
        
        for attachment in attachments:
            if isinstance(attachment, dict):
                if attachment.get("type") == "image":
                    # For images, include the base64 data for vision models
                    mime_type = attachment.get("mime_type", "image/jpeg")
                    base64_content = attachment.get("base64", "")
                    if base64_content:
                        current_message_content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_content}"
                            }
                        })
                
                elif attachment.get("type") == "video_frames":
                    # For video frames, add each frame as an image_url
                    frames = attachment.get("frames", [])
                    for frame_b64 in frames:
                        current_message_content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{frame_b64}"
                            }
                        })
                    # Add a note about the video
                    if current_message_content and current_message_content[-1].get("type") == "text":
                        current_message_content[-1]["text"] += f"\n\n[Video: {attachment.get('filename', 'video')} - showing {len(frames)} key frames]"
                    else:
                        current_message_content.append({"type": "text", "text": f"[Video: {attachment.get('filename', 'video')} - showing {len(frames)} key frames]"})
            
            elif isinstance(attachment, str):
                # For text content (code, documents, etc.)
                if current_message_content and current_message_content[-1].get("type") == "text":
                    # Append to last text block if one exists
                    current_message_content[-1]["text"] += f"\n\n{attachment}"
                else:
                    current_message_content.append({"type": "text", "text": attachment})
    
    # Only add the message if there's actual content
    if current_message_content:
        messages.append(HumanMessage(content=current_message_content))
    
    return messages
