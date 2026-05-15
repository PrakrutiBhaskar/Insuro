"""
image_extractor.py
Extracts raw text from image files (JPG, PNG, TIFF, BMP) using pytesseract OCR.
Requires Tesseract to be installed on the host machine.
  - Windows: https://github.com/UB-Mannheim/tesseract/wiki
  - Linux:   sudo apt install tesseract-ocr
  - macOS:   brew install tesseract
"""

import pytesseract
from PIL import Image


def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from an image file using Tesseract OCR.

    Args:
        file_path: Absolute or relative path to the image file.

    Returns:
        Extracted text as a string.

    Raises:
        ValueError: If OCR produces no output.
        FileNotFoundError: If the file path does not exist.
    """
    image = Image.open(file_path)

    # PSM 6: Assume a single uniform block of text — works well for lab reports
    custom_config = r"--oem 3 --psm 6"
    text = pytesseract.image_to_string(image, config=custom_config)

    if not text.strip():
        raise ValueError(
            "OCR produced no output. "
            "Check image quality — low resolution or poor contrast will cause this."
        )

    return text.strip()
