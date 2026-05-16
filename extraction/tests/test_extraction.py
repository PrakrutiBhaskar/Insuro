"""
test_extraction.py
Tests the normaliser against the exact sample report provided.
Run with: python -m pytest tests/ -v
"""

import pytest
from extractor.normaliser import (
    extract_hba1c,
    extract_fasting_glucose,
    extract_cholesterol,
    extract_blood_pressure,
    extract_bmi,
    extract_age,
    extract_gender,
    extract_diabetes_family_hx,
    extract_currently_medicated,
    extract_conditions,
    normalise,
)

# ---------------------------------------------------------------------------
# Sample report text (mirrors the provided diagnostic report)
# ---------------------------------------------------------------------------

SAMPLE_REPORT = """
DIAGNOSTIC PATHOLOGY REPORT

Patient Information
Name: John Doe
Age/Gender: 35 / Male
Patient ID: PAT-88492
Date of Sample: May 14, 2026
Referred By: Dr. S. Gupta (Endocrinology)
Clinical History Notes: Patient presents for routine annual screening.
Patient notes a family history of diabetes on paternal side.
No current acute distress.

BIOCHEMISTRY — METABOLIC PANEL
Test Name          Result  Units      Reference Interval  Flag
Fasting Blood Glucose  108  mg/dL     70 - 99             High
Glycosylated Hemoglobin (HbA1c)  6.1  mmol/mol  < 5.7   High
Total Cholesterol  210  mg/dL         < 200               High
HDL Cholesterol    42   mg/dL         > 40                Normal
LDL Cholesterol    135  mg/dL         < 100               High
Triglycerides      165  mg/dL         < 150               High

VITALS (Taken at time of draw)
Blood Pressure: 128/82 mmHg
Body Mass Index (BMI): 26.4 kg/m²

Pathologist Remarks: Results indicate pre-diabetic risk based on elevated
HbA1c and fasting glucose levels. Lipid panel shows borderline high Total
Cholesterol. Recommend lifestyle modifications, dietary review, and
follow-up consultation. Currently, no new medications prescribed.
"""


# ---------------------------------------------------------------------------
# Individual field tests
# ---------------------------------------------------------------------------

def test_hba1c():
    assert extract_hba1c(SAMPLE_REPORT) == 6.1

def test_fasting_glucose():
    assert extract_fasting_glucose(SAMPLE_REPORT) == 108.0

def test_cholesterol():
    assert extract_cholesterol(SAMPLE_REPORT) == 210.0

def test_blood_pressure():
    systolic, diastolic = extract_blood_pressure(SAMPLE_REPORT)
    assert systolic == 128
    assert diastolic == 82

def test_bmi():
    assert extract_bmi(SAMPLE_REPORT) == 26.4

def test_age():
    assert extract_age(SAMPLE_REPORT) == 35

def test_gender():
    assert extract_gender(SAMPLE_REPORT) == "male"

def test_diabetes_family_hx():
    assert extract_diabetes_family_hx(SAMPLE_REPORT) is True

def test_currently_medicated():
    # Report explicitly says "no new medications prescribed"
    assert extract_currently_medicated(SAMPLE_REPORT) is False

def test_conditions():
    conditions = extract_conditions(SAMPLE_REPORT)
    assert "pre-diabetes" in conditions

def test_no_family_hx_in_clean_report():
    clean = "Patient is healthy. No significant history."
    assert extract_diabetes_family_hx(clean) is False

def test_medicated_positive():
    medicated = "Patient is currently taking Metformin 500mg twice daily."
    assert extract_currently_medicated(medicated) is True


# ---------------------------------------------------------------------------
# Full normalise() integration test
# ---------------------------------------------------------------------------

def test_normalise_full():
    result = normalise(SAMPLE_REPORT)

    assert result["hba1c"]           == 6.1
    assert result["fasting_glucose"] == 108.0
    assert result["cholesterol"]     == 210.0
    assert result["systolic_bp"]     == 128
    assert result["diastolic_bp"]    == 82
    assert result["bmi"]             == 26.4
    assert result["age"]             == 35
    assert result["gender"]          == "male"
    assert result["diabetes_family_hx"]  is True
    assert result["currently_medicated"] is False
    assert "pre-diabetes" in result["conditions"]

def test_normalise_missing_fields():
    """Ensure missing fields return None, not raise."""
    sparse = "Patient: Jane Doe. Blood Pressure: 120/80 mmHg."
    result = normalise(sparse)

    assert result["hba1c"]          is None
    assert result["fasting_glucose"] is None
    assert result["cholesterol"]    is None
    assert result["systolic_bp"]    == 120
    assert result["diastolic_bp"]   == 80
