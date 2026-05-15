"""
normaliser.py
Regex-based post-processor that converts raw clinical report text into a
structured dictionary matching the 18-feature vector required by the ML model.

Fields extracted here (NLP supplements these):
  Numerical : hba1c, cholesterol, fasting_glucose, systolic_bp,
              diastolic_bp, bmi
  Binary    : diabetes_family_hx, currently_medicated
  Bonus     : age, gender (for form pre-fill, not part of core 18 but useful)
  Conditions: conditions[] — passed to NER pipeline for further enrichment
"""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Individual field extractors
# ---------------------------------------------------------------------------

def _find_float(pattern: str, text: str) -> Optional[float]:
    """Return the first float captured by `pattern` in `text`, or None."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1).replace(",", ""))
        except (ValueError, IndexError):
            return None
    return None


def extract_hba1c(text: str) -> Optional[float]:
    """
    Matches patterns like:
      'HbA1c  6.1  mmol/mol'
      'Glycosylated Hemoglobin (HbA1c) 6.1'
      'HbA1c: 6.1%'
    """
    patterns = [
        r"hba1c[^\d]*(\d+\.?\d*)",
        r"glycosylated\s+hemo(?:globin)?[^\d]*(\d+\.?\d*)",
        r"a1c[^\d]*(\d+\.?\d*)",
    ]
    for p in patterns:
        val = _find_float(p, text)
        if val is not None:
            return val
    return None


def extract_fasting_glucose(text: str) -> Optional[float]:
    """
    Matches patterns like:
      'Fasting Blood Glucose  108  mg/dL'
      'Fasting Glucose: 108'
      'FBG 108'
    """
    patterns = [
        r"fasting\s+blood\s+glucose[^\d]*(\d+\.?\d*)",
        r"fasting\s+glucose[^\d]*(\d+\.?\d*)",
        r"\bfbg\b[^\d]*(\d+\.?\d*)",
    ]
    for p in patterns:
        val = _find_float(p, text)
        if val is not None:
            return val
    return None


def extract_cholesterol(text: str) -> Optional[float]:
    """
    Matches 'Total Cholesterol' specifically to avoid picking up HDL/LDL.
      'Total Cholesterol  210  mg/dL'
      'Cholesterol, Total: 210'
    """
    patterns = [
        r"total\s+cholesterol[^\d]*(\d+\.?\d*)",
        r"cholesterol[,\s]+total[^\d]*(\d+\.?\d*)",
        # Fallback: bare 'Cholesterol' only if Total/HDL/LDL not present
        r"(?<!hdl\s)(?<!ldl\s)cholesterol[^\d]*(\d+\.?\d*)",
    ]
    for p in patterns:
        val = _find_float(p, text)
        if val is not None:
            return val
    return None


def extract_blood_pressure(text: str) -> tuple[Optional[int], Optional[int]]:
    """
    Matches patterns like:
      'Blood Pressure: 128/82 mmHg'
      'BP 128/82'
      '128/82'
    Returns (systolic, diastolic) as ints, or (None, None).
    """
    pattern = r"(?:blood\s+pressure|bp)[^\d]*(\d{2,3})\s*/\s*(\d{2,3})"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return int(match.group(1)), int(match.group(2))

    # Fallback: bare 'NNN/NN' format anywhere in text
    match = re.search(r"\b(\d{2,3})\s*/\s*(\d{2,3})\s*mmhg", text, re.IGNORECASE)
    if match:
        return int(match.group(1)), int(match.group(2))

    return None, None


def extract_bmi(text: str) -> Optional[float]:
    """
    Matches patterns like:
      'Body Mass Index (BMI): 26.4 kg/m²'
      'BMI: 26.4'
      'BMI 26.4'
    """
    patterns = [
        r"body\s+mass\s+index[^\d]*(\d+\.?\d*)",
        r"\bbmi\b[^\d]*(\d+\.?\d*)",
    ]
    for p in patterns:
        val = _find_float(p, text)
        if val is not None:
            return val
    return None


def extract_age(text: str) -> Optional[int]:
    """
    Matches patterns like:
      'Age/Gender: 35 / Male'
      'Age: 35'
      '35 years'
    """
    patterns = [
        r"age[/\s:]*(?:gender)?[/\s:]*(\d{1,3})",  # Age/Gender: 35 / Male
        r"age\s*[:/]\s*(\d{1,3})",                  # Age: 35
        r"(\d{1,3})\s*(?:years?|yrs?)\s*(?:old)?",  # 35 years old
    ]
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            age = int(match.group(1))
            if 0 < age < 120:   # sanity check
                return age
    return None


def extract_gender(text: str) -> Optional[str]:
    """
    Returns 'male', 'female', or None.
    Matches 'Age/Gender: 35 / Male', 'Gender: Female', 'Sex: M', etc.
    """
    match = re.search(
        r"(?:gender|sex)[^\w]*(male|female|m\b|f\b)", text, re.IGNORECASE
    )
    if match:
        raw = match.group(1).lower()
        if raw in ("m", "male"):
            return "male"
        if raw in ("f", "female"):
            return "female"

    # Fallback: look for standalone Male/Female near Age line
    match = re.search(r"\b(male|female)\b", text, re.IGNORECASE)
    if match:
        return match.group(1).lower()

    return None


def extract_diabetes_family_hx(text: str) -> bool:
    """
    Returns True if the text mentions a family history of diabetes.
    Matches: 'family history of diabetes', 'paternal history of diabetes', etc.
    """
    pattern = r"family\s+history\s+of\s+diabetes|diabetic\s+family|paternal.*diabetes|maternal.*diabetes"
    return bool(re.search(pattern, text, re.IGNORECASE))


def extract_currently_medicated(text: str) -> bool:
    """
    Returns True if the text indicates the patient is currently on medication.
    Returns False if it explicitly states no new medications prescribed.

    Conservative logic: defaults to False (not medicated) unless a positive
    signal is found, because false positives here affect the risk score.
    """
    # Explicit negative signals — no medication
    negative_patterns = [
        r"no\s+(?:new\s+)?medications?\s+prescribed",
        r"not\s+(?:currently\s+)?(?:on|taking)\s+(?:any\s+)?medications?",
        r"no\s+current\s+medications?",
    ]
    for p in negative_patterns:
        if re.search(p, text, re.IGNORECASE):
            return False

    # Positive signals — is on medication
    positive_patterns = [
        r"currently\s+(?:on|taking)\s+\w+",
        r"prescribed\s+\w+",
        r"medications?:\s+\w+",
        r"on\s+(?:metformin|insulin|lisinopril|atorvastatin|amlodipine)",
    ]
    for p in positive_patterns:
        if re.search(p, text, re.IGNORECASE):
            return True

    return False


def extract_conditions(text: str) -> list[str]:
    """
    Extracts mentioned medical conditions from the pathologist remarks
    and clinical history sections.

    Returns a deduplicated list of condition strings.
    """
    conditions = []

    condition_patterns = [
        (r"pre[-\s]?diabet\w+", "pre-diabetes"),
        (r"type\s*2\s+diabetes", "type-2-diabetes"),
        (r"type\s*1\s+diabetes", "type-1-diabetes"),
        (r"\bdiabetes\b", "diabetes"),
        (r"hypertension", "hypertension"),
        (r"hyperlipidemia|high\s+cholesterol|elevated\s+cholesterol", "hyperlipidemia"),
        (r"obesity|obese", "obesity"),
        (r"metabolic\s+syndrome", "metabolic-syndrome"),
        (r"coronary\s+artery\s+disease|cad\b", "coronary-artery-disease"),
        (r"heart\s+disease|cardiac", "heart-disease"),
        (r"hypothyroid\w*", "hypothyroidism"),
        (r"hyperthyroid\w*", "hyperthyroidism"),
        (r"asthma", "asthma"),
        (r"chronic\s+kidney\s+disease|ckd\b", "chronic-kidney-disease"),
        (r"anaemia|anemia", "anaemia"),
    ]

    for pattern, label in condition_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            conditions.append(label)

    return list(dict.fromkeys(conditions))  # deduplicate, preserve order


# ---------------------------------------------------------------------------
# Master normaliser — calls all extractors and returns unified dict
# ---------------------------------------------------------------------------

def normalise(text: str) -> dict:
    """
    Run all regex extractors on the raw clinical text and return a
    structured dictionary.

    Fields marked None were not found in the document — the caller
    should decide whether to prompt the user to fill them in manually.

    Args:
        text: Raw text extracted from a PDF or image.

    Returns:
        dict with all extractable fields and their values (or None).
    """
    systolic, diastolic = extract_blood_pressure(text)

    result = {
        # --- Numerical health fields ---
        "hba1c":            extract_hba1c(text),
        "cholesterol":      extract_cholesterol(text),
        "fasting_glucose":  extract_fasting_glucose(text),
        "systolic_bp":      systolic,
        "diastolic_bp":     diastolic,
        "bmi":              extract_bmi(text),

        # --- Binary health flags ---
        "diabetes_family_hx":   extract_diabetes_family_hx(text),
        "currently_medicated":  extract_currently_medicated(text),

        # --- Conditions list (enriched further by NER pipeline) ---
        "conditions":       extract_conditions(text),

        # --- Bonus fields for form pre-fill ---
        "age":    extract_age(text),
        "gender": extract_gender(text),
    }

    return result
