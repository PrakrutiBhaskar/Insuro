"""
ner_pipeline.py
Runs Bio_ClinicalBERT NER on clinical text to extract medical entities.
Supplements the regex normaliser — catches entities the regex patterns miss.

Model used: d4data/biomedical-ner-all
  - Trained on biomedical text
  - Recognises: Disease, Chemical, Gene, Species, DNA, RNA, Cell_type, etc.
  - Lighter than Bio_ClinicalBERT and publicly available on HuggingFace

The model is loaded once at module import time (singleton pattern) to avoid
reloading on every request — critical for API performance.
"""

import os
import re
import logging
from typing import Optional

from transformers import pipeline, Pipeline
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model singleton — loaded once on first import
# ---------------------------------------------------------------------------

_ner_pipeline: Optional[Pipeline] = None

MODEL_NAME = os.getenv("NER_MODEL_NAME", "d4data/biomedical-ner-all")
DEVICE = 0 if os.getenv("DEVICE", "cpu") == "cuda" else -1  # -1 = CPU


def get_ner_pipeline() -> Pipeline:
    """
    Returns the NER pipeline, loading it on first call.
    Subsequent calls return the cached instance.
    """
    global _ner_pipeline
    if _ner_pipeline is None:
        logger.info(f"Loading NER model: {MODEL_NAME} on device={DEVICE}")
        _ner_pipeline = pipeline(
            task="ner",
            model=MODEL_NAME,
            aggregation_strategy="simple",  # merges B-/I- tokens into single entities
            device=DEVICE,
        )
        logger.info("NER model loaded successfully.")
    return _ner_pipeline


# ---------------------------------------------------------------------------
# Text chunking — BERT has a 512-token context limit
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    """
    Split text into overlapping word-level chunks to stay within BERT's
    512-token limit. Overlap ensures entities spanning chunk boundaries
    are not missed.

    Args:
        text:       Raw clinical text.
        chunk_size: Max words per chunk (conservative — tokens > words).
        overlap:    Words of overlap between consecutive chunks.

    Returns:
        List of text chunk strings.
    """
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap

    return chunks


# ---------------------------------------------------------------------------
# Entity extraction
# ---------------------------------------------------------------------------

def run_ner(text: str) -> list[dict]:
    """
    Run NER on the full text (chunked internally).

    Returns:
        List of entity dicts: { entity_group, word, score }
        Deduplicated by (entity_group, normalised_word).
    """
    ner = get_ner_pipeline()
    chunks = chunk_text(text)
    all_entities = []

    for chunk in chunks:
        try:
            entities = ner(chunk)
            all_entities.extend(entities)
        except Exception as e:
            logger.warning(f"NER chunk failed: {e}")
            continue

    # Deduplicate: same entity group + same normalised word
    seen = set()
    unique_entities = []
    for ent in all_entities:
        key = (ent["entity_group"], ent["word"].lower().strip())
        if key not in seen:
            seen.add(key)
            unique_entities.append(ent)

    return unique_entities


# ---------------------------------------------------------------------------
# Map NER output to structured fields
# ---------------------------------------------------------------------------

# Known condition keywords that NER might surface
_CONDITION_KEYWORDS = {
    "diabetes", "pre-diabetes", "prediabetes", "hypertension",
    "hyperlipidemia", "obesity", "hypothyroidism", "hyperthyroidism",
    "asthma", "anaemia", "anemia", "coronary artery disease",
    "metabolic syndrome", "chronic kidney disease",
}

# Known medication keywords
_MEDICATION_KEYWORDS = {
    "metformin", "insulin", "lisinopril", "atorvastatin", "amlodipine",
    "aspirin", "losartan", "glipizide", "sitagliptin", "empagliflozin",
}


def extract_ner_fields(text: str) -> dict:
    """
    Run NER and map recognised entities to structured fields.

    Returns a dict with:
      - ner_conditions: list of condition strings found by NER
      - ner_medications: list of medication strings found by NER
      - ner_entities_raw: full raw entity list (for debugging/audit)
      - ner_confidence: average confidence score across all entities
    """
    entities = run_ner(text)

    ner_conditions = []
    ner_medications = []

    for ent in entities:
        word = ent["word"].lower().strip()
        group = ent["entity_group"].upper()

        # Disease / condition entities
        if group in ("DISEASE", "CONDITION", "PROBLEM"):
            # Check against known conditions or accept any disease entity
            for kw in _CONDITION_KEYWORDS:
                if kw in word or word in kw:
                    ner_conditions.append(kw)
                    break
            else:
                # Accept the raw entity if it looks like a real condition
                if len(word) > 3 and not word.isdigit():
                    ner_conditions.append(word)

        # Chemical / medication entities
        elif group in ("CHEMICAL", "DRUG", "MEDICATION"):
            for kw in _MEDICATION_KEYWORDS:
                if kw in word:
                    ner_medications.append(kw)
                    break
            else:
                if len(word) > 3 and not word.isdigit():
                    ner_medications.append(word)

    # Deduplicate
    ner_conditions = list(dict.fromkeys(ner_conditions))
    ner_medications = list(dict.fromkeys(ner_medications))

    # Average confidence
    avg_confidence = (
        round(sum(e["score"] for e in entities) / len(entities), 4)
        if entities else 0.0
    )

    return {
        "ner_conditions":    ner_conditions,
        "ner_medications":   ner_medications,
        "ner_entities_raw":  entities,
        "ner_confidence":    avg_confidence,
    }
