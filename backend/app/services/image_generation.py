"""Image generation service using LiteLLM proxy."""

import base64
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import requests
from openai import OpenAIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm import get_openai_client
from app.core.config import settings
from app.core.logger import logger
from app.models.chat import Attachment
from app.schemas.chat import AttachmentSchema


class ImageGenerationService:
    """Service for generating images using LiteLLM proxy."""

    @staticmethod
    async def generate_image(
        prompt: str,
        user_email: str,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> dict:
        """Generate image(s) using configured model via LiteLLM."""
        try:
            client = get_openai_client()

            logger.info(
                "[ImageGen] Generating %s image(s) for %s with model=%s",
                n,
                user_email,
                settings.IMAGE_GEN_MODEL,
            )

            request_kwargs = {
                "model": settings.IMAGE_GEN_MODEL,
                "prompt": prompt,
                "size": size,
                "n": n,
                "user": user_email,
                "extra_body": {
                    "metadata": {
                        "application": settings.APP_NAME,
                        "environment": settings.ENVIRONMENT,
                    }
                },
            }

            # Some providers (e.g. Gemini Imagen via LiteLLM) may not support quality.
            if settings.IMAGE_GEN_MODEL.lower().startswith("dall-e"):
                request_kwargs["quality"] = quality
            elif quality != "standard":
                logger.info(
                    "[ImageGen] Ignoring unsupported quality=%s for model=%s",
                    quality,
                    settings.IMAGE_GEN_MODEL,
                )

            response = client.images.generate(**request_kwargs)

            data_items = getattr(response, "data", None) or []
            if not data_items:
                raise ValueError("Provider returned no image data")

            generated_images = []
            for i, image_data in enumerate(data_items):
                image_info = ImageGenerationService._process_generated_image(image_data, i)
                generated_images.append(image_info)

            logger.info("[ImageGen] Successfully generated %s image(s)", len(generated_images))
            return {
                "success": True,
                "count": len(generated_images),
                "images": generated_images,
                "model": settings.IMAGE_GEN_MODEL,
                "prompt": prompt,
            }

        except OpenAIError as e:
            logger.error("[ImageGen] OpenAI/LiteLLM error: %s", str(e))
            return {
                "success": False,
                "error": f"Image provider error: {str(e)}",
            }
        except Exception as e:
            logger.error("[ImageGen] Unexpected error: %s", str(e))
            return {
                "success": False,
                "error": str(e),
            }

    @staticmethod
    def _process_generated_image(image_data: object, index: int = 0) -> dict:
        """Process image payload from provider response and persist to disk."""
        data = ImageGenerationService._normalize_image_data(image_data)

        image_url = data.get("url")
        image_b64 = data.get("b64_json") or data.get("b64") or data.get("image_base64")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        image_id = str(uuid4())[:8]
        filename = f"generated_{timestamp}_{image_id}_{index}.png"

        upload_path = Path(settings.UPLOAD_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
        file_path = upload_path / filename

        if image_url:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            file_path.write_bytes(response.content)
        elif image_b64:
            image_bytes = base64.b64decode(image_b64)
            file_path.write_bytes(image_bytes)
        else:
            available_keys = ", ".join(sorted(data.keys())) if data else "none"
            raise ValueError(
                f"No image URL or base64 data in provider response (keys: {available_keys})"
            )

        absolute_path = str(file_path.resolve())
        logger.info("[ImageGen] Image saved to %s", absolute_path)

        return {
            "filename": filename,
            "path": absolute_path,
            "size": file_path.stat().st_size,
            "mime_type": "image/png",
            "url": image_url,
        }

    @staticmethod
    def _normalize_image_data(image_data: object) -> dict:
        """Normalize provider image payload to a dictionary."""
        if image_data is None:
            return {}

        if isinstance(image_data, dict):
            return image_data

        model_dump = getattr(image_data, "model_dump", None)
        if callable(model_dump):
            dumped = model_dump()
            if isinstance(dumped, dict):
                return dumped

        out = {}
        for key in ("url", "b64_json", "b64", "image_base64"):
            value = getattr(image_data, key, None)
            if value:
                out[key] = value
        return out

    @staticmethod
    async def save_generated_image_as_attachment(
        db: AsyncSession,
        image_info: dict,
        message_id: str,
        thread_id: str = None,
    ) -> AttachmentSchema:
        """Save generated image as an attachment record."""
        try:
            attachment = Attachment(
                message_id=message_id,
                filename=image_info["filename"],
                file_path=image_info["path"],
                mime_type=image_info.get("mime_type", "image/png"),
                file_size=str(image_info["size"]),
                file_type="image",
                created_at=datetime.utcnow(),
            )

            db.add(attachment)
            await db.commit()
            await db.refresh(attachment)

            logger.info(
                "[ImageGen] Saved image attachment %s for message %s",
                attachment.id,
                message_id,
            )

            return AttachmentSchema.model_validate(attachment)

        except Exception as e:
            await db.rollback()
            logger.error("[ImageGen] Error saving image attachment: %s", str(e))
            raise
