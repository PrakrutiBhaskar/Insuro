# Insuro (v1.1.0)
### AI-Powered Health Insurance Recommendation Platform

Insuro is a production-hardened, full-stack AI system that classifies health risk and recommends personalized insurance plans. Version 1.1.0 introduces population-scale training and enhanced security.

---

## 🚀 v1.1.0 Production Readiness Update
- **Real-World Training**: Trained on 253,680 records from the **CDC Diabetes Health Indicators** dataset.
- **Top Performance**: XGBoost classifier achieved **F1-Macro: 0.9936**.
- **Security**: Full **JWT HS256** implementation for sensitive ML endpoints.
- **Monitoring**: PSI-based drift detection enabled at `/monitor`.
- **Professional Audit**: View the [Technical Evaluation Report (DOCX)](./Insuro_Technical_Evaluation_Report.docx).

---

# Features

## Authentication & Security
- JWT Authentication
- Role-Based Access Control (RBAC)
- Secure HttpOnly Refresh Tokens
- Password Hashing using bcrypt

## Smart Health Intake
- Multi-step responsive intake form
- Zod-based validation
- Auto-save functionality
- Progressive disclosure UI

## AI Clinical Document Extraction
- Upload PDF/image lab reports
- NLP extraction using Bio_ClinicalBERT
- Extract:
  - HbA1c
  - Cholesterol
  - Glucose
  - Medical conditions
  - Medications
- Confidence scoring for extracted fields

## Risk Assessment Engine
- XGBoost-based health risk classification
- Predicts:
  - Low Risk
  - Medium Risk
  - High Risk
- Generates numerical risk scores

## Intelligent Plan Matching
- Personalized suitability scoring
- Coverage similarity analysis
- Budget-aware recommendations
- Condition-based scoring bonuses

## Explainable AI
- SHAP-based feature attribution
- Plain-English recommendation explanations
- Transparent decision-making

## Plan Explorer
- Search and filter insurance plans
- Pagination support
- Side-by-side comparison
- Coverage highlights & exclusions

---

# Architecture

The platform follows a microservice-oriented architecture:

Frontend:
- React 18
- Tailwind CSS
- React Query
- Recharts

Backend:
- Node.js + Express
- FastAPI ML microservice
- JWT Authentication

AI/ML:
- XGBoost
- Scikit-learn
- HuggingFace Transformers
- SHAP

Database & Infrastructure:
- PostgreSQL
- Redis
- Docker
- AWS S3 / Cloudflare R2

---

# System Flow

1. User submits health details and uploads medical documents
2. Backend securely stores uploaded files
3. NLP pipeline extracts clinical indicators
4. ML model generates risk scores
5. Matching engine ranks insurance plans
6. SHAP explanations are generated
7. Personalized recommendations are returned

---

# Tech Stack

## Frontend
- React 18
- Vite
- Tailwind CSS
- React Query
- Recharts

## Backend
- Node.js
- Express.js
- FastAPI
- Zod
- Multer

## AI/ML
- XGBoost
- Scikit-learn
- HuggingFace Bio_ClinicalBERT
- SHAP

## Database
- PostgreSQL
- Prisma ORM
- Redis

## DevOps
- Docker
- Docker Compose
- GitHub Actions
- Railway / Render
- Vercel

---

# API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| POST | /api/documents/upload | Upload medical document |
| POST | /api/recommend | Generate recommendations |
| GET | /api/plans | Get insurance plans |
| POST | /api/plans/compare | Compare plans |

---

# Machine Learning Pipeline

## Risk Classification
- Model: XGBoost
- Features: 18 health-related attributes
- Output:
  - Risk label
  - Risk score

## Explainability
SHAP values are used to explain:
- Why a plan was recommended
- Which health features influenced scoring
- Risk-driving clinical indicators

---

# Security Features

- JWT authentication
- HttpOnly cookies
- Row-Level Security (RLS)
- Secure file uploads
- Encrypted object storage
- Input validation with Zod

---

# Deployment

Frontend:
- Vercel

Backend:
- Railway / Render

Infrastructure:
- PostgreSQL
- Redis
- Cloud Storage

---

# Future Improvements

- Real insurance provider integrations
- OCR improvements for handwritten reports
- LLM-generated coverage summaries
- AI chatbot assistant
- Federated learning for privacy-preserving training
- Real-time recommendation updates

---

# Contributors

- Full-Stack Lead — Architecture & APIs
- Frontend Engineer — UI/UX
- AI/ML Engineer — NLP & Risk Models
- Backend Engineer — Database & Deployment

---

# License

MIT License
