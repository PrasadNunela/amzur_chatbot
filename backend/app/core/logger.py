"""Application logging configuration."""

import logging
from app.core.config import settings

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(settings.APP_NAME)
