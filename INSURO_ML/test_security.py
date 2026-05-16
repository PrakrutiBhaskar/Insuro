import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))
from security_utils import logger

def test_pii_masking():
    print("--- Testing PII Masking Filter ---")
    
    # Test 1: Age and Gender
    msg1 = 'User input: {"age": 45, "gender": 1, "smoker": 0}'
    print(f"Original: {msg1}")
    logger.info(msg1)
    
    # Test 2: Clinical Indicators
    msg2 = 'Health stats: {"bmi": 28.5, "hba1c": 6.8, "cholesterol": 210}'
    print(f"Original: {msg2}")
    logger.info(msg2)
    
    # Test 3: Email
    msg3 = 'Contact: test.user@example.com'
    print(f"Original: {msg3}")
    logger.info(msg3)

if __name__ == "__main__":
    test_pii_masking()
