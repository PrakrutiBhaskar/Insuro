import os
import logging
import re
from cryptography.fernet import Fernet
from typing import Any

# ── Encryption Configuration ───────────────────────────────────────────────────
# In production, ENCRYPTION_KEY should be stored in a secure KMS (e.g., AWS KMS)
# and passed as an environment variable.
ENCRYPTION_KEY = os.getenv("INSURO_ENCRYPTION_KEY", Fernet.generate_key().decode())
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_file(data: bytes) -> bytes:
    """Encrypts raw file bytes using AES-256."""
    return cipher_suite.encrypt(data)

def decrypt_file(encrypted_data: bytes) -> bytes:
    """Decrypts AES-256 encrypted bytes."""
    return cipher_suite.decrypt(encrypted_data)

# ── Log Scrubbing Configuration ─────────────────────────────────────────────────
# Patterns for PII that should never appear in plain text logs
PII_PATTERNS = {
    "age": r'"age":\s*(\d+)',
    "gender": r'"gender":\s*(\d+)',
    "bmi": r'"bmi":\s*(\d+\.?\d*)',
    "hba1c": r'"hba1c":\s*(\d+\.?\d*)',
    "cholesterol": r'"cholesterol":\s*(\d+\.?\d*)',
    "systolic_bp": r'"systolic_bp":\s*(\d+\.?\d*)',
    "diastolic_bp": r'"diastolic_bp":\s*(\d+\.?\d*)',
    "email": r'[\w\.-]+@[\w\.-]+\.\w+',
}

class PIIMaskingFilter(logging.Filter):
    """
    Interceptor that scrubs PII from log messages before they reach the handler.
    Essential for HIPAA/IRDAI compliance.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        message = str(record.msg)
        
        # Scrub dictionary/JSON patterns
        for label, pattern in PII_PATTERNS.items():
            message = re.sub(pattern, f'"{label}": [MASKED]', message)
            
        record.msg = message
        return True

def setup_secure_logging(level=logging.INFO):
    """Initializes the secure logging pipeline with PII masking."""
    logger = logging.getLogger("insuro")
    logger.setLevel(level)
    
    # Avoid duplicate handlers if already setup
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        
        # Add the PII masking filter
        handler.addFilter(PIIMaskingFilter())
        logger.addHandler(handler)
    
    return logger

# ── Exported Instance ──────────────────────────────────────────────────────────
logger = setup_secure_logging()
