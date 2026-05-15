"""
main.py
FastAPI application exposing the /extract endpoint.

Flow:
  1. Receive uploaded file (PDF or image)
  2. Validate MIME type and file size
  3. Extract raw text (pdfplumber or pytesseract)
  4. Run regex normaliser → structured fields
  5. Run NER pipeline → enrich conditions + medications
  6. Merge results + compute confidence scores
  7. Return structured JSON response

This service is called internally by the Node.js API gateway.
It is NOT exposed directly to the client.
"""

import os
import uuid
import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from extractor.pdf_extractor import extract_text_from_pdf
from extractor.image_extractor import extract_text_from_image
from extractor.normaliser import normalise
from extractor.ner_pipeline import extract_ner_fields
from extractor.confidence import compute_confidence_scores

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="InsuReady — Clinical Document Extraction Service",
    description="Extracts structured health fields from lab reports and prescriptions.",
    version="1.0.0",
)

MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", 10)) * 1024 * 1024

SUPPORTED_MIME_TYPES = {
    "application/pdf":  "pdf",
    "image/jpeg":       "image",
    "image/jpg":        "image",
    "image/png":        "image",
    "image/tiff":       "image",
    "image/bmp":        "image",
}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "extraction"}


# ---------------------------------------------------------------------------
# /extract endpoint
# ---------------------------------------------------------------------------

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    """
    Extract structured health fields from an uploaded clinical document.

    Accepts: PDF, JPEG, PNG, TIFF, BMP (max 10MB)

    Returns:
    {
        "extracted_fields": {
            "hba1c": 6.1,
            "cholesterol": 210,
            "fasting_glucose": 108,
            "systolic_bp": 128,
            "diastolic_bp": 82,
            "bmi": 26.4,
            "diabetes_family_hx": true,
            "currently_medicated": false,
            "conditions": ["pre-diabetes"],
            "medications": [],
            "age": 35,
            "gender": "male"
        },
        "confidence_scores": {
            "hba1c": 1.0,
            "cholesterol": 1.0,
            ...
            "_overall": 0.94
        },
        "raw_text_preview": "first 300 chars of extracted text..."
    }
    """

    # --- 1. Validate MIME type ---
    content_type = file.content_type or ""
    file_type = SUPPORTED_MIME_TYPES.get(content_type)

    if file_type is None:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type: '{content_type}'. "
                f"Accepted types: PDF, JPEG, PNG, TIFF, BMP."
            ),
        )

    # --- 2. Read file and validate size ---
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {os.getenv('MAX_FILE_SIZE_MB', 10)}MB.",
        )

    # --- 3. Write to temp file ---
    suffix = ".pdf" if file_type == "pdf" else Path(file.filename or "upload.jpg").suffix
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix, prefix=f"insuro_{uuid.uuid4().hex}_"
        ) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        logger.info(f"Processing file: {file.filename} ({file_type}) — {len(file_bytes)} bytes")

        # --- 4. Extract raw text ---
        if file_type == "pdf":
            try:
                raw_text = extract_text_from_pdf(tmp_path)
            except ValueError:
                # PDF has no extractable text — treat as scanned image
                logger.warning("PDF has no text layer — falling back to OCR.")
                raw_text = extract_text_from_image(tmp_path)
        else:
            raw_text = extract_text_from_image(tmp_path)

        logger.info(f"Extracted {len(raw_text)} characters of text.")

        # --- 5. Regex normalisation ---
        regex_fields = normalise(raw_text)

        # --- 6. NER enrichment ---
        ner_fields = extract_ner_fields(raw_text)

        # --- 7. Merge: NER conditions supplement regex conditions ---
        merged_conditions = list(
            dict.fromkeys(regex_fields["conditions"] + ner_fields["ner_conditions"])
        )
        merged_medications = list(dict.fromkeys(ner_fields["ner_medications"]))

        extracted_fields = {
            **regex_fields,
            "conditions":    merged_conditions,
            "medications":   merged_medications,
            "ner_confidence": ner_fields["ner_confidence"],
        }

        # --- 8. Confidence scores ---
        confidence_scores = compute_confidence_scores(extracted_fields)

        # Remove internal NER confidence from the output fields
        extracted_fields.pop("ner_confidence", None)

        return JSONResponse(
            status_code=200,
            content={
                "extracted_fields":  extracted_fields,
                "confidence_scores": confidence_scores,
                "raw_text_preview":  raw_text[:300],
            },
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}",
        )

    finally:
        # Always clean up the temp file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            logger.info(f"Cleaned up temp file: {tmp_path}")
