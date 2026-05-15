# InsuReady — Integration Guide

This document describes what each team member has built and exactly what needs to happen for all four pieces to work together as a complete system.

---

## Team Responsibilities at a Glance

| Member | Owns | Status |
|---|---|---|
| NLP / Extraction | `extraction/` — clinical document parsing service | ✅ Complete |
| ML Engineer | Risk model + plan suitability scorer | 🔲 In progress |
| Backend Engineer | Node.js API gateway, database, auth, job queue | 🔲 In progress |
| Frontend Engineer | React intake form, recommendations UI, plan explorer | 🔲 In progress |

---

## What the Extraction Service Does (My Work)

**Location:** `extraction/`

The extraction service is a standalone FastAPI microservice. It accepts an uploaded clinical document (PDF or image), extracts structured health fields from it, and returns a JSON payload that feeds into the ML risk model.

### Endpoint

```
POST http://localhost:8001/extract
Content-Type: multipart/form-data
Body: file=<PDF or image, max 10MB>
```

### What it returns

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

### How to run it locally

```bash
cd extraction
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8001
```

Interactive docs available at `http://localhost:8001/docs` once running.

### What it does NOT do

- It does not store anything to the database — that is the backend's job.
- It does not handle the BullMQ job queue — the backend enqueues the job and calls this service as the worker.
- It does not validate the user's session or JWT — the backend proxies the call after auth.

---

## Integration Instructions by Team Member

---

### Backend Engineer

You are the primary integrator. The extraction service plugs into your Node.js API at two points.

#### 1. Document upload flow (`POST /api/documents/upload`)

When a user uploads a file through the frontend:

1. Receive the file via Multer.
2. Validate MIME type and size (max 10MB) — mirror the same constraints the extraction service enforces.
3. Save the file temporarily (local `/tmp` or S3/R2).
4. Create a record in `uploaded_documents` with `extraction_status = 'pending'`.
5. Enqueue a BullMQ job with the payload:
   ```json
   { "job_id": "<uuid>", "file_path": "<path>", "user_id": "<uuid>" }
   ```
6. Return the `job_id` to the frontend immediately so it can start polling.

#### 2. BullMQ worker — calling the extraction service

Your BullMQ worker (separate process) picks up the job and does this:

```js
// Pseudocode — adapt to your actual worker setup
const formData = new FormData();
formData.append('file', fs.createReadStream(job.data.file_path));

const response = await fetch('http://extraction:8001/extract', {
  method: 'POST',
  body: formData,
});

const result = await response.json();

// Store result in uploaded_documents
await prisma.uploadedDocument.update({
  where: { id: job.data.job_id },
  data: {
    extraction_status: response.ok ? 'complete' : 'failed',
    extracted_data: result.extracted_fields,      // JSONB column
    confidence_scores: result.confidence_scores,  // JSONB column
  },
});
```

> **Important:** In Docker Compose, the extraction service hostname is `extraction` (the service name), not `localhost`. Use `http://extraction:8001/extract` inside the container network.

#### 3. Polling endpoint (`GET /api/documents/status/:jobId`)

The frontend polls this every 2 seconds. Return:

```json
{
  "status": "complete",
  "extracted_fields": { ... },
  "confidence_scores": { ... }
}
```

Pull `extracted_data` and `confidence_scores` from the `uploaded_documents` row.

#### 4. Health profile update (`PUT /api/profile/health`)

When the user confirms the extracted fields (after reviewing them in the UI), the frontend sends the merged profile. At this point, merge the extracted fields with the form fields to build the complete 18-feature vector and store it in `health_profiles`.

The fields from the extraction service that map to `health_profiles` columns:

| Extraction field | health_profiles column |
|---|---|
| `hba1c` | `hba1c` |
| `cholesterol` | `cholesterol` |
| `fasting_glucose` | `fasting_glucose` |
| `systolic_bp` | `systolic_bp` |
| `diastolic_bp` | `diastolic_bp` |
| `bmi` | `bmi` |
| `diabetes_family_hx` | `diabetes_family_hx` (in `family_history[]`) |
| `currently_medicated` | `currently_medicated` |
| `conditions` | `conditions[]` |

#### 5. Docker Compose

The `docker-compose.yml` at the project root already defines the `extraction` service. Add your `api` service to the same file:

```yaml
api:
  build:
    context: ./api
    dockerfile: Dockerfile
  container_name: insuro_api
  ports:
    - "3000:3000"
  env_file:
    - ./api/.env
  depends_on:
    - postgres
    - redis
    - extraction
  networks:
    - insuro_net
```

The `depends_on: extraction` ensures the extraction service is up before the API starts.

---

### ML Engineer

You receive the complete 18-feature vector from the backend after the user confirms their profile. Here is exactly how to reconstruct it from the two sources:

```python
# Fields from extraction service (stored in health_profiles via backend)
extraction_fields = {
    "hba1c":               health_profile["hba1c"],
    "cholesterol":         health_profile["cholesterol"],
    "fasting_glucose":     health_profile["fasting_glucose"],
    "systolic_bp":         health_profile["systolic_bp"],
    "diastolic_bp":        health_profile["diastolic_bp"],
    "bmi":                 health_profile["bmi"],
    "diabetes_family_hx":  health_profile["diabetes_family_hx"],
    "currently_medicated": health_profile["currently_medicated"],
}

# Fields from the intake form (also stored in health_profiles)
form_fields = {
    "age":                     health_profile["age"],
    "gender":                  health_profile["gender"],           # label-encode: male=1, female=0
    "smoker":                  health_profile["smoker"],
    "heart_disease_family_hx": health_profile["heart_disease_family_hx"],
    "hypertension_hx":         health_profile["hypertension_hx"],
    "income_band":             health_profile["income_band"],      # ordinal 1–5
    "budget_range":            health_profile["budget_range"],     # ordinal from {min, max} JSONB
    "coverage_type_pref":      health_profile["coverage_type_pref"],  # OHE — 4 columns
}

feature_vector = {**extraction_fields, **form_fields}
```

#### Handling missing extracted fields

If a field is `None` (the document didn't contain it), do not pass `None` to the model. Use the strategy agreed during training:

- Numerical fields (`hba1c`, `cholesterol`, etc.): impute with the training set median.
- Boolean fields: default to `False`.

The `confidence_scores` object is stored alongside the extracted data. You can use `_overall` as a feature weight or flag low-confidence extractions for the user to manually confirm before inference.

#### Your FastAPI endpoints

The backend calls your service at:

```
POST http://ml:8000/predict
Body: { "features": { ...18-feature vector... } }
```

Expected response:

```json
{
  "risk_label": "Medium",
  "risk_score": 0.63,
  "shap_values": {
    "hba1c": 0.18,
    "fasting_glucose": 0.14,
    "bmi": 0.09,
    ...
  }
}
```

Add your service to `docker-compose.yml` under the name `ml` so the backend can reach it at `http://ml:8000`.

---

### Frontend Engineer

#### Document upload UX

The upload flow has three states to handle:

**State 1 — Uploading**
POST the file to `/api/documents/upload`. Show a progress bar. On success, store the returned `job_id`.

**State 2 — Processing (polling)**
Poll `GET /api/documents/status/:jobId` every 2 seconds. Show a spinner with "Analysing your document...". Stop polling when `status === 'complete'` or `status === 'failed'`.

**State 3 — Review**
When complete, display the extracted fields in an editable form. Show the confidence score next to each field — fields below 0.8 confidence should be visually flagged (e.g. amber border) prompting the user to verify. The user confirms or edits, then submits to `PUT /api/profile/health`.

#### Confidence score display

The `confidence_scores` object uses these keys — map them to your form field labels:

| Key | Form label |
|---|---|
| `hba1c` | HbA1c |
| `cholesterol` | Total Cholesterol |
| `fasting_glucose` | Fasting Blood Glucose |
| `systolic_bp` | Systolic Blood Pressure |
| `diastolic_bp` | Diastolic Blood Pressure |
| `bmi` | BMI |
| `diabetes_family_hx` | Family History of Diabetes |
| `currently_medicated` | Currently on Medication |
| `conditions` | Detected Conditions |
| `_overall` | Overall extraction confidence (show as a summary badge) |

#### Bonus pre-fill

The extraction service also returns `age` and `gender` when found in the document. Use these to pre-fill the corresponding intake form fields — but always let the user override them.

#### Error states to handle

| Scenario | What to show |
|---|---|
| `status 413` from upload | "File is too large. Maximum size is 10MB." |
| `status 415` from upload | "Unsupported file type. Please upload a PDF, JPEG, or PNG." |
| `status === 'failed'` on poll | "We couldn't read this document. Please check the file quality or enter your details manually." |
| `_overall` confidence < 0.6 | "We had trouble reading parts of this document. Please review all fields carefully." |

---

## Data Flow — End to End

```
[User uploads PDF]
        │
        ▼
[Frontend] ──POST /api/documents/upload──► [Node API]
                                                │
                                         Multer saves file
                                         Creates DB record
                                         Enqueues BullMQ job
                                                │
                                                ▼
                                         [BullMQ Worker]
                                                │
                                    POST /extract (multipart)
                                                │
                                                ▼
                                    [Extraction Service :8001]
                                      pdfplumber / tesseract
                                      Regex normaliser
                                      Bio_ClinicalBERT NER
                                      Confidence scorer
                                                │
                                    Returns extracted_fields
                                    + confidence_scores
                                                │
                                                ▼
                                    Worker updates DB record
                                    extraction_status = complete
                                                │
[Frontend polls /status/:jobId] ◄───────────────┘
        │
        ▼
[User reviews + confirms extracted fields]
        │
        ▼
[Frontend] ──PUT /api/profile/health──► [Node API]
                                            │
                                     Merges form + extracted fields
                                     Writes to health_profiles table
                                            │
                                            ▼
[User clicks "Get My Recommendations"]
        │
        ▼
[Frontend] ──POST /api/recommend──► [Node API]
                                        │
                              Builds 18-feature vector
                              from health_profiles row
                                        │
                              POST /predict (JSON)
                                        │
                                        ▼
                                [ML Service :8000]
                                  XGBoost inference
                                  SHAP values
                                        │
                              Returns risk_label, risk_score,
                              shap_values
                                        │
                                        ▼
                              Node API runs plan suitability
                              scoring against catalogue
                                        │
                              Returns top 5 plans + explanations
                                        │
                                        ▼
                            [Frontend renders recommendations]
```

---

## Running the Full Stack

Once all services are built, the entire stack starts with:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Node API | `http://localhost:3000` |
| Extraction service | `http://localhost:8001` |
| ML service | `http://localhost:8000` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

API docs for the extraction service: `http://localhost:8001/docs`

---

## Questions

Reach out before making assumptions about the extraction output schema — any change to the field names or types in `extracted_fields` will break the backend worker and the ML feature vector simultaneously.
