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
        content=f"""You are a helpful and friendly AI assistant. 

Current date and time: {current_date} at {current_time}

Respond naturally and conversationally to user questions and messages.
Be concise but informative. If you don't know something, say so honestly.
Maintain context from the conversation history when responding."""
    )

    # LCEL pipeline: prompt + llm + parser
    # We'll manually handle prompts to include conversation history
    chain = llm() | StrOutputParser()

    return chain, system_prompt


def build_messages(system_prompt, conversation_history: list[dict], user_message: str):
    """Build message list for the LLM from conversation history."""
    messages = [system_prompt]

    # Add conversation history
    for msg in conversation_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    # Add current user message
    messages.append(HumanMessage(content=user_message))

    return messages
