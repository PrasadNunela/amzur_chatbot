"""Image generation service using LiteLLM proxy."""

import uuid
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger
from openai import OpenAI, OpenAIError


class ImageGenerationService:
    """Service for generating images via LiteLLM proxy."""

    @staticmethod
    async def generate_image(
        prompt: str,
        user_email: str,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
    ) -> dict:
        """Generate images using LiteLLM proxy (Gemini Imagen).
        
        Args:
            prompt: Image description
            user_email: User email for cost tracking
            size: Image size (1024x1024, 1024x1792, or 1792x1024)
            quality: Image quality (standard or hd)
            n: Number of images to generate (1-4)
            
        Returns:
            Dictionary with success status, images list, model name, and error if any
        """
        try:
            logger.info(f"[ImageGen] Generating {n} image(s) for {user_email}: {prompt[:50]}...")
            
            # Create OpenAI client pointing to LiteLLM proxy
            client = OpenAI(
                api_key=settings.LITELLM_API_KEY,
                base_url=settings.LITELLM_PROXY_URL,
            )
            
            # Call image generation endpoint
            response = client.images.generate(
                model=settings.IMAGE_GEN_MODEL,
                prompt=prompt,
                size=size,
                quality=quality,
                n=n,
                user=user_email,  # For cost tracking
            )
            
            logger.info(f"[ImageGen] Generation successful: {len(response.data)} image(s)")
            
            # Process generated images
            images = []
            for i, image in enumerate(response.data):
                # Download and save image
                image_data = ImageGenerationService._download_image(image.url)
                filename = ImageGenerationService._save_image(image_data, f"generated_{uuid.uuid4().hex[:8]}")
                
                images.append({
                    "url": image.url,
                    "filename": filename,
                    "size": size,
                })
                logger.info(f"[ImageGen] Image {i+1} saved: {filename}")
            
            return {
                "success": True,
                "images": images,
                "model": settings.IMAGE_GEN_MODEL,
            }
            
        except OpenAIError as e:
            logger.error(f"[ImageGen] LiteLLM error: {str(e)}")
            return {
                "success": False,
                "error": f"Image generation failed: {str(e)}",
            }
        except Exception as e:
            logger.error(f"[ImageGen] Unexpected error: {str(e)}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
            }

    @staticmethod
    def _download_image(url: str) -> bytes:
        """Download image from URL."""
        import urllib.request
        with urllib.request.urlopen(url) as response:
            return response.read()

    @staticmethod
    def _save_image(image_data: bytes, filename_prefix: str) -> str:
        """Save image to uploads directory."""
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Use .jpg extension
        filename = f"{filename_prefix}.jpg"
        filepath = upload_dir / filename
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        return filename
"""Image generation service using LiteLLM proxy."""

import base64
import mimetypes
from pathlib import Path
from uuid import uuid4
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.ai.llm import get_openai_client
from app.core.config import settings
from app.core.logger import logger
from app.models.chat import Attachment, Message
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
        """Generate an image using Google Gemini image generation model.
        
        Args:
            prompt: Description of the image to generate
            user_email: Email of the user requesting the image (for usage tracking)
            size: Image size (1024x1024, 1024x1792, 1792x1024)
            quality: Quality level (standard or hd)
            n: Number of images to generate (1-4)
            
        Returns:
            Dictionary with image data and metadata
        """
        try:
            client = get_openai_client()
            
            logger.info(
                f"Generating image with prompt: {prompt[:100]}... for user: {user_email}"
            )
            
            # Call image generation via LiteLLM proxy
            response = client.images.generate(
                model=settings.IMAGE_GEN_MODEL,
                prompt=prompt,
                size=size,
                quality=quality,
                n=n,
                user=user_email,  # Include user for usage tracking
                extra_body={
                    "metadata": {
                        "application": settings.APP_NAME,
                        "environment": settings.ENVIRONMENT,
                    }
                },
            )
            
            # Process the response
            generated_images = []
            for i, image_data in enumerate(response.data):
                # Download and save image
                image_info = ImageGenerationService._process_generated_image(
                    image_data, prompt, i
                )
                generated_images.append(image_info)
            
            logger.info(f"Successfully generated {len(generated_images)} image(s)")
            return {
                "success": True,
                "count": len(generated_images),
                "images": generated_images,
                "model": settings.IMAGE_GEN_MODEL,
                "prompt": prompt,
            }
            
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    @staticmethod
    def _process_generated_image(
        image_data, prompt: str, index: int = 0
    ) -> dict:
        """Process and save generated image.
        
        Args:
            image_data: Image data from API response
            prompt: Original prompt used for generation
            index: Index if multiple images generated
            
        Returns:
            Dictionary with image file info
        """
        try:
            # Get image URL or data
            image_url = getattr(image_data, "url", None)
            image_b64 = getattr(image_data, "b64_json", None)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            image_id = str(uuid4())[:8]
            filename = f"generated_{timestamp}_{image_id}_{index}.png"
            
            # Create uploads directory if needed
            upload_path = Path(settings.UPLOAD_DIR)
            upload_path.mkdir(parents=True, exist_ok=True)
            file_path = upload_path / filename
            
            # Download and save image
            if image_url:
                import requests
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                with open(file_path, "wb") as f:
                    f.write(response.content)
            elif image_b64:
                image_bytes = base64.b64decode(image_b64)
                with open(file_path, "wb") as f:
                    f.write(image_bytes)
            else:
                raise ValueError("No image URL or base64 data in response")
            
            # Get absolute path
            absolute_path = str(file_path.resolve())
            
            logger.info(f"Image saved to: {absolute_path}")
            
            return {
                "filename": filename,
                "path": absolute_path,
                "size": file_path.stat().st_size,
                "mime_type": "image/png",
                "url": image_url,  # Include original URL if available
            }
            
        except Exception as e:
            logger.error(f"Error processing generated image: {str(e)}")
            raise

    @staticmethod
    async def save_generated_image_as_attachment(
        db: AsyncSession,
        image_info: dict,
        message_id: str,
        thread_id: str = None,  # Optional, kept for backward compatibility
    ) -> AttachmentSchema:
        """Save generated image as an attachment record.
        
        Args:
            db: Database session
            image_info: Image info from _process_generated_image
            message_id: ID of the message to associate with
            thread_id: ID of the thread (optional, not used in model)
            
        Returns:
            AttachmentSchema with attachment details
        """
        try:
            attachment = Attachment(
                message_id=message_id,
                filename=image_info["filename"],
                file_path=image_info["path"],
                mime_type=image_info["mime_type"],
                file_size=str(image_info["size"]),
                file_type="image",
                created_at=datetime.utcnow(),
            )
            
            db.add(attachment)
            await db.commit()
            await db.refresh(attachment)
            
            logger.info(
                f"Saved image attachment: {attachment.id} for message: {message_id}"
            )
            
            return AttachmentSchema.model_validate(attachment)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error saving image attachment: {str(e)}")
            raise
