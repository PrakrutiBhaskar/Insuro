"""
pdf_extractor.py
Extracts raw text from PDF files using pdfplumber.
Handles multi-page PDFs by concatenating page text with a newline separator.
"""

import pdfplumber


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract all text from a PDF file.

    Args:
        file_path: Absolute or relative path to the PDF file.

    Returns:
        A single string containing all extracted text, pages joined by newlines.

    Raises:
        ValueError: If the PDF yields no extractable text (e.g. scanned image PDF).
        FileNotFoundError: If the file path does not exist.
    """
    text_pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_pages.append(page_text.strip())

    if not text_pages:
        raise ValueError(
            "No extractable text found in PDF. "
            "This may be a scanned image PDF — use image_extractor instead."
        )

    return "\n".join(text_pages)
