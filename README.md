# INSURO — AI-Driven Clinical Insurance Platform

Insuro is a production-grade insurance technology platform that utilizes a triple-model AI stack to provide hyper-personalized insurance recommendations based on clinical data.

## 🚀 System Architecture

Insuro is built on a containerized microservices architecture:

- **Frontend**: React 18 + Vite + Framer Motion (Cyber-Clinical UX)
- **Backend Gateway**: FastAPI + PostgreSQL (pgvector) + Redis
- **ML Inference Service**: XGBoost + SHAP (Explainability) + DiCE (Counterfactuals)
- **NLP Extraction Service**: Bio_ClinicalBERT (Medical NER)

## 🛠️ Tech Stack

- **AI/ML**: Python, Scikit-Learn, XGBoost, Lifelines, Transformers (HuggingFace)
- **Database**: PostgreSQL with `pgvector` for semantic plan matching
- **Frontend**: TypeScript, React, Zustand, Framer Motion, TailwindCSS (for layout)
- **Security**: AES-256 at-rest encryption, JWT RBAC, Scoped CORS

## 📖 Key Documentation

- **[ML Research & Dataset Details](INSURO_ML/RESEARCH.md)**: Deep dive into the models, training data (UCI/Kaggle), and accuracy metrics.
- **[Demo Script](DEMO_SCRIPT.md)**: Step-by-step guide for the 2-minute judging walkthrough.
- **[Task List](insuro_task_list.md)**: Full project roadmap and status.

## 🏁 Getting Started

1. **Start Services**: `docker-compose up --build`
2. **Seed Database**: `python seed_db.py`
3. **Warm-up Models**: `python warmup.py` (Required for instant demo performance)
4. **Access**: Open `http://localhost:5173`

---
**Developed for**: PS04 Hackathon Demo
**Status**: V1.4 Final (Production Hardened)