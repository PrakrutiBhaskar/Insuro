"""
confidence.py
Computes per-field confidence scores for the final extraction output.

Confidence logic:
  - Fields extracted by regex get a rule-based confidence:
      1.0  if the value was found AND passes a sanity range check
      0.75 if found but outside expected clinical range (possible but unusual)
      0.0  if not found (None)
  - Fields extracted by NER inherit the model's token probability score.
  - The overall document confidence is the mean of all non-None field scores.
"""

from typing import Optional


# ---------------------------------------------------------------------------
# Clinical sanity ranges for numerical fields
# These are broad — we flag outliers, not reject them
# ---------------------------------------------------------------------------

SANITY_RANGES = {
    "hba1c":           (3.0,  20.0),   # mmol/mol or %
    "cholesterol":     (50.0, 500.0),  # mg/dL
    "fasting_glucose": (40.0, 600.0),  # mg/dL
    "systolic_bp":     (60,   250),    # mmHg
    "diastolic_bp":    (30,   150),    # mmHg
    "bmi":             (10.0, 70.0),   # kg/m²
    "age":             (0,    120),
}


def _score_numerical(field: str, value: Optional[float]) -> float:
    """Return confidence score for a numerical field."""
    if value is None:
        return 0.0
    lo, hi = SANITY_RANGES.get(field, (float("-inf"), float("inf")))
    if lo <= value <= hi:
        return 1.0
    return 0.75  # found but outside expected range — flag it


def _score_boolean(value: Optional[bool]) -> float:
    """Booleans extracted by regex are either found (1.0) or defaulted (0.6)."""
    # We always return a value for booleans (True/False), but the confidence
    # reflects whether it was explicitly stated vs. inferred by absence.
    return 1.0 if value is not None else 0.6


def compute_confidence_scores(extracted: dict) -> dict:
    """
    Given the final merged extraction dict, return a parallel dict of
    confidence scores (0.0 – 1.0) for each field.

    Args:
        extracted: The merged output from normaliser + NER pipeline.

    Returns:
        Dict mapping field names to float confidence scores.
    """
    scores = {}

    # Numerical fields
    for field in ("hba1c", "cholesterol", "fasting_glucose",
                  "systolic_bp", "diastolic_bp", "bmi", "age"):
        scores[field] = _score_numerical(field, extracted.get(field))

    # Boolean fields — always present (defaulted to False if not found)
    # We give lower confidence if the document had no explicit statement
    scores["diabetes_family_hx"]  = 1.0 if extracted.get("diabetes_family_hx") else 0.7
    scores["currently_medicated"] = 1.0 if extracted.get("currently_medicated") is not None else 0.6

    # Gender — string field
    scores["gender"] = 1.0 if extracted.get("gender") else 0.0

    # Conditions list — confidence based on NER score if available
    ner_conf = extracted.get("ner_confidence", 0.0)
    scores["conditions"] = ner_conf if extracted.get("conditions") else 0.0

    # Medications list
    scores["medications"] = ner_conf if extracted.get("medications") else 0.0

    # Overall document confidence — mean of all non-zero scores
    all_scores = list(scores.values())
    non_zero = [s for s in all_scores if s > 0]
    scores["_overall"] = round(sum(non_zero) / len(non_zero), 4) if non_zero else 0.0

    return scores
