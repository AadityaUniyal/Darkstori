"""Email utilities for sending transactional emails."""

from backend.core.logger import logger


def send_welcome_email(email: str, full_name: str) -> None:
    """Mock send welcome email to a newly registered user."""
    logger.info(f"Welcome email sent successfully to {full_name} <{email}>")
