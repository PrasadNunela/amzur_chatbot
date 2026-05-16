"""Configuration for tabular query services."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class QuerySettings(BaseSettings):
    """Settings for loading sheets/files and querying DataFrames with an LLM."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    GOOGLE_SERVICE_ACCOUNT_JSON: str = Field(
        ...,
        description="Full Google service account JSON as a raw string.",
    )
    LITELLM_PROXY_URL: str = Field(
        default="https://litellm.amzur.com",
        description="OpenAI-compatible base URL for model calls.",
    )
    LITELLM_API_KEY: str = Field(..., description="LiteLLM proxy API key.")

    AGENT_MODEL_PROVIDER: Literal["openai", "anthropic"] = Field(default="openai")
    OPENAI_CHAT_MODEL: str = Field(default="gpt-4o")
    ANTHROPIC_CHAT_MODEL: str = Field(default="claude-3-5-sonnet-20241022")

    PANDAS_AGENT_TIMEOUT_SECONDS: int = Field(default=90, ge=5, le=300)
    PANDAS_AGENT_MAX_ITERATIONS: int = Field(default=8, ge=1, le=30)

    @field_validator("GOOGLE_SERVICE_ACCOUNT_JSON")
    @classmethod
    def validate_google_service_account_json(cls, value: str) -> str:
        """Ensure value is valid JSON content or a readable JSON file path."""
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            credentials_path = Path(value).expanduser()
            if not credentials_path.exists() or not credentials_path.is_file():
                raise ValueError(
                    "GOOGLE_SERVICE_ACCOUNT_JSON must be raw JSON or a valid JSON file path"
                ) from exc
            try:
                parsed = json.loads(credentials_path.read_text(encoding="utf-8"))
            except Exception as file_exc:
                raise ValueError(
                    "GOOGLE_SERVICE_ACCOUNT_JSON file does not contain valid JSON"
                ) from file_exc

        if not isinstance(parsed, dict):
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON must decode to a JSON object")

        return value

    @property
    def google_service_account_dict(self) -> dict[str, Any]:
        """Return service account credentials as a dictionary.

        Accepts either a raw JSON string or a path to a JSON credentials file.
        """
        raw_value = self.GOOGLE_SERVICE_ACCOUNT_JSON
        try:
            parsed: Any = json.loads(raw_value)
        except json.JSONDecodeError:
            credentials_path = Path(raw_value).expanduser()
            parsed = json.loads(credentials_path.read_text(encoding="utf-8"))

        if not isinstance(parsed, dict):
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON must decode to a JSON object")
        return parsed

    @property
    def active_chat_model(self) -> str:
        """Return provider-specific model name configured for the agent."""
        if self.AGENT_MODEL_PROVIDER == "anthropic":
            return self.ANTHROPIC_CHAT_MODEL
        return self.OPENAI_CHAT_MODEL


query_settings = QuerySettings()
