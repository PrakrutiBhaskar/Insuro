# InsuReady — Clinical Document Extraction Service

This is the NLP extraction microservice for the InsuReady platform. It accepts uploaded lab reports and prescriptions (PDF or image), extracts structured health fields using regex normalisation and a Bio_ClinicalBERT NER model, and returns a JSON payload that feeds directly into the ML risk assessment pipeline.

---

## Responsibility

This service covers the following part of the system architecture:

```
PDF / Image Upload
       ↓
Text Extraction  (pdfplumber for PDFs, pytesseract for images)
       ↓
Regex Normaliser  (structured field extraction)
       ↓
NER Pipeline      (Bio_ClinicalBERT — conditions, medications)
       ↓
Confidence Scorer
       ↓
Structured JSON  →  ML Risk Model (18-feature vector)
```

---

## Extracted Fields

### From the document (this service)

| Field | Type | Example |
|---|---|---|
| `hba1c` | float | `6.1` |
| `cholesterol` | float | `210.0` |
| `fasting_glucose` | float | `108.0` |
| `systolic_bp` | int | `128` |
| `diastolic_bp` | int | `82` |
| `bmi` | float | `26.4` |
| `diabetes_family_hx` | bool | `true` |
| `currently_medicated` | bool | `false` |
| `conditions` | list[str] | `["pre-diabetes"]` |
| `medications` | list[str] | `[]` |
| `age` | int | `35` *(bonus — for form pre-fill)* |
| `gender` | str | `"male"` *(bonus — for form pre-fill)* |

### Remaining fields (collected by the intake form — not this service)

`smoker`, `heart_disease_family_hx`, `hypertension_hx`, `income_band`, `budget_range`, `coverage_type_pref`

---

## API

### `GET /health`
Returns service status.

```json
{ "status": "ok", "service": "extraction" }
```

### `POST /extract`
Accepts a multipart file upload. Returns extracted fields with confidence scores.

**Request**
```
Content-Type: multipart/form-data
Field: file  (PDF, JPEG, PNG, TIFF, BMP — max 10MB)
```

**Response**
```json
{
  "extracted_fields": {
    "hba1c": 6.1,
    "cholesterol": 210.0,
    "fasting_glucose": 108.0,
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
    "fasting_glucose": 1.0,
    "systolic_bp": 1.0,
    "diastolic_bp": 1.0,
    "bmi": 1.0,
    "diabetes_family_hx": 1.0,
    "currently_medicated": 0.7,
    "conditions": 0.91,
    "medications": 0.0,
    "_overall": 0.94
  },
  "raw_text_preview": "DIAGNOSTIC PATHOLOGY REPORT..."
}
```

**Error responses**

| Status | Reason |
|---|---|
| `413` | File exceeds 10MB |
| `415` | Unsupported file type |
| `500` | Extraction or model failure |

---

## Project Structure

```
extraction/
├── main.py                  # FastAPI app — /extract and /health endpoints
├── extractor/
│   ├── __init__.py
│   ├── pdf_extractor.py     # pdfplumber text extraction
│   ├── image_extractor.py   # pytesseract OCR
│   ├── normaliser.py        # regex post-processor → structured fields
│   ├── ner_pipeline.py      # Bio_ClinicalBERT NER enrichment
│   └── confidence.py        # per-field confidence scoring
├── tests/
│   └── test_extraction.py   # 14 unit + integration tests
├── sample_docs/             # place test lab reports here (gitignored)
├── models/                  # HuggingFace model cache (gitignored)
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.11+
- Tesseract OCR installed on your machine:
  - **Windows:** Download installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and add to PATH
  - **Linux:** `sudo apt install tesseract-ocr`
  - **macOS:** `brew install tesseract`

### Install dependencies

```bash
pip install -r requirements.txt
```

### Configure environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work for local development
```

### Run the service

```bash
uvicorn main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`.  
Interactive API docs at `http://localhost:8001/docs`.

On first run, the NER model (`d4data/biomedical-ner-all`) will be downloaded automatically from HuggingFace (~500MB). Subsequent starts use the cached version.

---

## Run Tests

```bash
python -m pytest tests/ -v
```

Tests cover all individual field extractors and the full `normalise()` integration against the sample diagnostic report. No model download required for tests — they only exercise the regex normaliser.

---

## Docker

Build and run this service in isolation:

```bash
docker build -t insuro-extraction .
docker run -p 8001:8001 insuro-extraction
```

Or run the full stack via Docker Compose from the project root:

```bash
docker compose up extraction
```

---

## Integration Notes for the ML Engineer

The `extracted_fields` object from `/extract` maps directly to the feature vector. Merge it with the form fields from the Node API to build the complete 18-feature input:

```python
feature_vector = {
    # From this service
    "hba1c":               extracted["hba1c"],
    "cholesterol":         extracted["cholesterol"],
    "fasting_glucose":     extracted["fasting_glucose"],
    "systolic_bp":         extracted["systolic_bp"],
    "diastolic_bp":        extracted["diastolic_bp"],
    "bmi":                 extracted["bmi"],
    "diabetes_family_hx":  extracted["diabetes_family_hx"],
    "currently_medicated": extracted["currently_medicated"],

    # From the intake form (Node API)
    "age":                    form["age"],
    "gender":                 form["gender"],
    "smoker":                 form["smoker"],
    "heart_disease_family_hx": form["heart_disease_family_hx"],
    "hypertension_hx":        form["hypertension_hx"],
    "income_band":            form["income_band"],
    "budget_range":           form["budget_range"],
    "coverage_type_pref":     form["coverage_type_pref"],
}
```

Fields extracted from the document can also pre-fill the form (e.g. `age`, `gender`, `bmi`) — the frontend should merge them with user-editable defaults.
