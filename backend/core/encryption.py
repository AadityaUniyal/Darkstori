import base64
import os
from cryptography.fernet import Fernet
from backend.core.config import settings
from backend.core.logger import logger

def _get_fernet_key() -> bytes:
    key_str = getattr(settings, "ENCRYPTION_KEY", None)
    if key_str:
        # Ensure it's exactly 32 url-safe base-64-encoded bytes
        try:
            # check if it's already a valid base64 token
            base64.urlsafe_b64decode(key_str)
            return key_str.encode()
        except Exception:
            # If not properly encoded, just pad and encode
            padded = key_str.ljust(32)[:32].encode()
            return base64.urlsafe_b64encode(padded)
    
    # Fallback for dev if not provided (NOT for production)
    logger.warning("No ENCRYPTION_KEY found in settings. Using a deterministic fallback key. DO NOT USE IN PRODUCTION.")
    fallback = b"darkstore_fallback_secret_key___"
    return base64.urlsafe_b64encode(fallback)

fernet = Fernet(_get_fernet_key())

def encrypt_string(plaintext: str) -> str:
    """Encrypt a string and return the url-safe base64 encoded ciphertext."""
    if not plaintext:
        return plaintext
    return fernet.encrypt(plaintext.encode('utf-8')).decode('utf-8')

def decrypt_string(ciphertext: str) -> str:
    """Decrypt a url-safe base64 encoded ciphertext into a string."""
    if not ciphertext:
        return ciphertext
    try:
        return fernet.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return ""

from sqlalchemy.types import TypeDecorator, String

class EncryptedString(TypeDecorator):
    """SQLAlchemy type that encrypts strings on the way in and decrypts on the way out."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_string(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            # if it starts with gAAAAA (standard Fernet prefix), decrypt it
            # this prevents crashing on already-unencrypted data in the DB
            if str(value).startswith("gAAAAA"):
                return decrypt_string(value)
            return value
        return value
