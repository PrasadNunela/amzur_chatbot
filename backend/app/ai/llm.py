"""LiteLLM client singletons for all AI calls.

All AI calls route exclusively through the Amzur LiteLLM proxy.
Import clients from this module — never instantiate them elsewhere.
"""

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from openai import OpenAI

from app.core.config import settings


def get_llm() -> ChatOpenAI:
    """Get LangChain LLM client for chains (LCEL)."""
    return ChatOpenAI(
        model=settings.LLM_MODEL,
        base_url=settings.LITELLM_PROXY_URL,
        api_key=settings.LITELLM_API_KEY,
        timeout=30,
        max_retries=2,
    )


def get_openai_client() -> OpenAI:
    """Get OpenAI SDK client for direct calls (image generation, embeddings)."""
    return OpenAI(
        api_key=settings.LITELLM_API_KEY,
        base_url=settings.LITELLM_PROXY_URL,
    )


def get_embeddings() -> OpenAIEmbeddings:
    """Get embeddings client for vector operations."""
    return OpenAIEmbeddings(
        model=settings.LITELLM_EMBEDDING_MODEL,
        base_url=settings.LITELLM_PROXY_URL,
        api_key=settings.LITELLM_API_KEY,
    )


# Lazy singletons
_llm_instance: ChatOpenAI | None = None
_openai_instance: OpenAI | None = None
_embeddings_instance: OpenAIEmbeddings | None = None


def llm() -> ChatOpenAI:
    """Lazy-loaded singleton for LangChain LLM."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = get_llm()
    return _llm_instance


def openai_client() -> OpenAI:
    """Lazy-loaded singleton for OpenAI SDK client."""
    global _openai_instance
    if _openai_instance is None:
        _openai_instance = get_openai_client()
    return _openai_instance


def embeddings() -> OpenAIEmbeddings:
    """Lazy-loaded singleton for embeddings."""
    global _embeddings_instance
    if _embeddings_instance is None:
        _embeddings_instance = get_embeddings()
    return _embeddings_instance

