"""Data encryption and decryption utilities."""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import base64
import os
from src.utils.config import ENCRYPTION_KEY
from src.utils.helpers import logger


class DataEncryption:
    """Handle sensitive data encryption/decryption."""
    
    def __init__(self, key: str = ENCRYPTION_KEY):
        """Initialize with encryption key."""
        if not key:
            # Generate a new key if not provided
            key = Fernet.generate_key().decode()
            logger.warning("No encryption key provided, generated new key")
        
        # Ensure key is properly formatted
        if isinstance(key, str):
            key = key.encode()
        
        # Derive a proper Fernet key if needed
        if len(key) != 44:  # Fernet keys are 44 bytes base64 encoded
            key = self._derive_key(key)
        
        self.cipher = Fernet(key)
    
    def _derive_key(self, password: bytes) -> bytes:
        """Derive a Fernet key from password using PBKDF2."""
        salt = b'darkstore_salt_2026'  # In production, use random salt per user
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data."""
        try:
            encrypted = self.cipher.encrypt(data.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise
    
    def encrypt_dict(self, data: dict, fields: list) -> dict:
        """Encrypt specific fields in a dictionary."""
        encrypted_data = data.copy()
        for field in fields:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt(str(encrypted_data[field]))
        return encrypted_data
    
    def decrypt_dict(self, data: dict, fields: list) -> dict:
        """Decrypt specific fields in a dictionary."""
        decrypted_data = data.copy()
        for field in fields:
            if field in decrypted_data and decrypted_data[field]:
                decrypted_data[field] = self.decrypt(decrypted_data[field])
        return decrypted_data


# Global encryption instance
encryptor = DataEncryption()


def encrypt_sensitive_data(data: str) -> str:
    """Convenience function for encryption."""
    return encryptor.encrypt(data)


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Convenience function for decryption."""
    return encryptor.decrypt(encrypted_data)
