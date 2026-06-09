"""Centralized logging configuration."""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from backend.core.config import settings

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Create logger
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
if settings.DEBUG:
    log_level = logging.DEBUG
logger = logging.getLogger("darkstore_api")
logger.setLevel(log_level)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(log_level)
console_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
)
console_handler.setFormatter(console_format)

# File handler with rotation
file_handler = RotatingFileHandler(
    LOGS_DIR / "api.log", maxBytes=10 * 1024 * 1024, backupCount=5  # 10MB
)
file_handler.setLevel(logging.DEBUG)
file_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
file_handler.setFormatter(file_format)

# Add handlers
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# Prevent propagation to root logger
logger.propagate = False
