"""
InsuReady ML — FastAPI Application
------------------------------------
Endpoints:
  GET  /health                  — liveness check
  POST /predict                 — risk classification (XGBoost + SHAP)
  POST /score                   — plan suitability scoring (predict + rank)
  GET  /plans                   — list all plans (optional ?tier=low|medium|high)
  GET  /plans/{plan_id}         — single plan detail
"""

import os
import joblib
import json
import numpy as np
import scipy.integrate
import pandas as pd
# Monkeypatch for lifelines compatibility
if not hasattr(scipy.integrate, "trapz"):
    scipy.integrate.trapz = np.trapz
if not hasattr(pd.Series, "iteritems"):
    pd.Series.iteritems = pd.Series.items

import shap
import dice_ml
import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Depends, Security, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from contextlib import asynccontextmanager

# Internal security utils
from .security_utils import logger, encrypt_file, decrypt_file

import sys
sys.path.insert(0, os.path.dirname(__file__))
from scorer import PlanScorer

# ── Model bundle paths ─────────────────────────────────────────────────────────
MODEL_DIR  = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "insuready_model.pkl")
SURVIVAL_MODEL_PATH = os.path.join(MODEL_DIR, "survival_model.pkl")
META_PATH  = os.path.join(MODEL_DIR, "model_meta.json")

# ── Constants ────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "insuro_secret_key_demo_2026")
ALGORITHM = "HS256"
security = HTTPBearer()

# ── Global state ───────────────────────────────────────────────────────────────
bundle: dict = {}
scorer: PlanScorer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bundle, scorer
    print("Loading model bundle...")
    bundle = joblib.load(MODEL_PATH)
    print(f"Model loaded. Version: {bundle.get('version', 'unknown')}")
    scorer = PlanScorer()
    print(f"Plan scorer loaded. {len(scorer.list_plans())} plans in catalogue.")
    
    # Load Survival Model (Task 3.1)
    if os.path.exists(SURVIVAL_MODEL_PATH):
        print("Loading survival model...")
        bundle["survival"] = joblib.load(SURVIVAL_MODEL_PATH)
    
    # Initialize DiCE (Task 2.4)
    print("Initializing DiCE Explainer...")
    train_data_path = os.path.join(os.path.dirname(__file__), "..", "dataset_real_hybrid.csv")
    
    continuous_features = [
        "age", "bmi", "systolic_bp", "diastolic_bp", "hba1c", 
        "cholesterol", "fasting_glucose", "income_band", "budget_range"
    ]
    categorical_features = [
        "smoker", "gender", "income_band", "diabetes_family_hx", 
        "heart_disease_family_hx", "hypertension_hx", "currently_medicated", "coverage_type_pref"
    ]
    # income_band is both continuous and categorical in some contexts, but we'll stick to the model's view
    
    # Select only the features we support in UserHealthInput
    valid_features = list(set(continuous_features + categorical_features))
    train_df = pd.read_csv(train_data_path)[valid_features + ["risk_label"]]
    
    d = dice_ml.Data(
        dataframe=train_df, 
        continuous_features=continuous_features, 
        outcome_name="risk_label"
    )
    
    # Wrap model and preprocessor into a pipeline for DiCE (Task 2.4)
    # This ensures DiCE sees the raw features but the model sees the transformed ones
    from sklearn.pipeline import Pipeline
    full_pipeline = Pipeline([
        ("preprocessor", bundle["preprocessor"]),
        ("classifier", bundle["model"])
    ])
    
    m = dice_ml.Model(model=full_pipeline, backend="sklearn")
    bundle["dice"] = dice_ml.Dice(d, m, method="random") # 'random' is fastest for API
    
    yield
    bundle.clear()


app = FastAPI(
    title="InsuReady ML API",
    description="Risk classification and plan suitability scoring for InsuReady",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────

class UserHealthInput(BaseModel):
    age:                      int   = Field(..., ge=18, le=80)
    bmi:                      Optional[float] = Field(None, ge=10.0, le=60.0)
    systolic_bp:              Optional[int]   = Field(None, ge=80, le=200)
    diastolic_bp:             Optional[int]   = Field(None, ge=50, le=130)
    hba1c:                    Optional[float] = Field(None, ge=4.0, le=15.0)
    cholesterol:              Optional[float] = Field(None, ge=100.0, le=400.0)
    fasting_glucose:          Optional[float] = Field(None, ge=60.0, le=400.0)
    income_band:              int   = Field(..., ge=1, le=5)
    budget_range:             float = Field(..., ge=500.0)
    smoker:                   int   = Field(..., ge=0, le=1)
    diabetes_family_hx:       int   = Field(..., ge=0, le=1)
    heart_disease_family_hx:  int   = Field(..., ge=0, le=1)
    hypertension_hx:          int   = Field(..., ge=0, le=1)
    currently_medicated:      int   = Field(..., ge=0, le=1)
    gender:                   int   = Field(..., ge=0, le=1)
    coverage_type_pref: int = Field(..., description="0: Individual, 1: Spouse, 2: Family Floater")
    wants_maternity: bool = Field(False, description="Explicit preference for maternity coverage")


def verify_token(auth: HTTPAuthorizationCredentials = Security(security)):
    """Verifies the JWT token for protected endpoints."""
    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid or expired token")


def get_nlp_explanation(plan_name: str, breakdown: dict) -> str:
    """
    Mock LLM handler. In production, this would call Gemini 1.5 Flash 
    to generate empathetic, plain-English summaries.
    """
    # Placeholder for actual LLM integration
    return f"Based on your profile, {plan_name} is a great fit because of its high match in {max(breakdown, key=breakdown.get)}."


class ScoreRequest(BaseModel):
    user_input: UserHealthInput
    top_n:      int = Field(5, ge=1, le=10)


# ── Helpers ────────────────────────────────────────────────────────────────────

# Dynamically loaded from bundle

import pandas as pd

def _encode_input(data: UserHealthInput) -> pd.DataFrame:
    """Convert Pydantic model to DataFrame for preprocessor."""
    d = data.model_dump()
    # Ensure coverage_type_pref is treated as categorical (it's an int in the schema but categorical in training)
    return pd.DataFrame([d])


def _get_counterfactuals(data_df: pd.DataFrame, current_label: str) -> list:
    """Generate 2-3 counterfactuals using DiCE with actionable constraints."""
    dice_exp = bundle.get("dice")
    if not dice_exp:
        return []
    
    # Target a lower risk if possible
    target_label = "Low" if current_label != "Low" else "Low" # If already Low, just stay Low
    if current_label == "High":
        target_label = "Medium" # Step-wise improvement
        
    try:
        # Define actionable features (Task 2.4)
        features_to_vary = [
            "bmi", "systolic_bp", "diastolic_bp", "hba1c", 
            "cholesterol", "fasting_glucose", "smoker", "currently_medicated"
        ]
        
        # Define physiological and actionable constraints
        current_bmi = data_df["bmi"].iloc[0]
        current_sys_bp = data_df["systolic_bp"].iloc[0]
        current_dia_bp = data_df["diastolic_bp"].iloc[0]
        current_hba1c = data_df["hba1c"].iloc[0]
        current_chol = data_df["cholesterol"].iloc[0]
        current_glucose = data_df["fasting_glucose"].iloc[0]
        
        permitted_range = {
            "bmi": [18.5, max(18.6, float(current_bmi))], # Can only decrease down to healthy min
            "systolic_bp": [90.0, max(91.0, float(current_sys_bp))],
            "diastolic_bp": [60.0, max(61.0, float(current_dia_bp))],
            "hba1c": [4.0, max(4.1, float(current_hba1c))],
            "cholesterol": [120.0, max(121.0, float(current_chol))],
            "fasting_glucose": [70.0, max(71.0, float(current_glucose))]
        }
        
        cf = dice_exp.generate_counterfactuals(
            data_df, 
            total_CFs=3, 
            desired_class=target_label,
            features_to_vary=features_to_vary,
            permitted_range=permitted_range
        )
        
        # Parse CFs into a user-friendly list
        cf_json = json.loads(cf.to_json())
        cfs = cf_json["cfs_list"][0]
        
        recommendations = []
        for row in cfs:
            diffs = []
            for feat in features_to_vary:
                orig_val = data_df[feat].iloc[0]
                cf_val = row[cf_json["feature_names"].index(feat)]
                if abs(orig_val - cf_val) > 0.01:
                    diffs.append({
                        "feature": feat,
                        "current": round(float(orig_val), 2),
                        "target": round(float(cf_val), 2),
                        "action": f"Reduce {feat}" if cf_val < orig_val else f"Change {feat}"
                    })
            if diffs:
                recommendations.append({
                    "target_risk": target_label,
                    "changes": diffs
                })
        return recommendations[:2]
    except Exception as e:
        print(f"DiCE Error: {e}")
        return []

def _run_predict(data: UserHealthInput) -> dict:
    """Core prediction logic, reused by both /predict and /score."""
    model       = bundle["model"]
    preprocessor = bundle["preprocessor"]
    label_enc   = bundle["label_encoder"]
    feature_names = bundle["feature_names"]

    df_in = _encode_input(data)
    X = preprocessor.transform(df_in)
    proba = model.predict_proba(X)[0]
    pred_idx = int(np.argmax(proba))
    risk_label = label_enc.inverse_transform([pred_idx])[0]
    risk_score = float(proba[pred_idx])

    # SHAP explanation (using bundled explainer for performance)
    explainer = bundle.get("explainer")
    if not explainer:
        explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X)

    # shap_values shape: (n_samples, n_features, n_classes) or (n_samples, n_features)
    if isinstance(shap_vals, list):
        class_shap = shap_vals[pred_idx][0]
    elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
        class_shap = shap_vals[0, :, pred_idx]
    else:
        class_shap = shap_vals[0]

    shap_pairs = sorted(
        zip(feature_names, class_shap.tolist()),
        key=lambda x: abs(x[1]),
        reverse=True,
    )[:3]

    top_shap = [
        {
            "feature": feat,
            "shap_value": round(val, 4),
            "direction": "increases risk" if val > 0 else "decreases risk",
        }
        for feat, val in shap_pairs
    ]

    label_map = {
        "Low":    "Low risk — generally healthy profile with minimal risk factors.",
        "Medium": "Medium risk — one or more manageable risk factors present.",
        "High":   "High risk — multiple significant risk factors requiring comprehensive cover.",
    }

    # Actuarial Claim Probabilities (Task 3.1)
    claim_probs = {}
    survival_model = bundle.get("survival")
    if survival_model:
        # Prep features for survival model
        surv_features = [
            "age", "bmi", "smoker", "gender", "income_band", "hypertension_hx",
            "systolic_bp", "diastolic_bp", "hba1c", "cholesterol", "fasting_glucose",
            "diabetes_family_hx", "heart_disease_family_hx", "currently_medicated"
        ]
        X_surv = df_in[surv_features]
        
        # Predict survival function (Probability of NO claim)
        surv_func = survival_model.predict_survival_function(X_surv)
        
        # Probability of claim = 1 - S(t)
        # Handle cases where index might not be exact
        try:
            prob_12m = 1.0 - float(surv_func.iloc[surv_func.index <= 12].iloc[-1])
            prob_36m = 1.0 - float(surv_func.iloc[surv_func.index <= 36].iloc[-1])
            claim_probs = {
                "p_claim_12m": round(prob_12m, 4),
                "p_claim_36m": round(prob_36m, 4)
            }
        except:
            pass

    return {
        "risk_label":        risk_label,
        "risk_score":        round(risk_score, 4),
        "risk_probabilities": {
            label_enc.inverse_transform([i])[0]: round(float(p), 4)
            for i, p in enumerate(proba)
        },
        "actuarial_claim_probs": claim_probs,
        "top_shap_features": top_shap,
        "counterfactuals":   _get_counterfactuals(df_in, risk_label),
        "explanation":       label_map.get(risk_label, ""),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    meta = {}
    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            meta = json.load(f)
    return {
        "status": "ok",
        "model_version": meta.get("version", bundle.get("version", "1.0.0")),
        "f1_macro": meta.get("f1_macro"),
        "plans_loaded": len(scorer.list_plans()) if scorer else 0,
    }


@app.post("/predict", tags=["ML"])
def predict(data: UserHealthInput):
    # Log the incoming request (PII Masking Filter will scrub these indicators automatically)
    logger.info(f"Prediction request received: {data.model_dump_json()}")
    try:
        return _run_predict(data)
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal inference error")


@app.post("/upload-document", tags=["Security"])
async def upload_document(file: UploadFile = File(...), auth: dict = Depends(verify_token)):
    """
    Production-grade document upload with AES-256 at-rest encryption.
    Demonstrates HIPAA/IRDAI compliant storage.
    """
    try:
        content = await file.read()
        encrypted_content = encrypt_file(content)
        
        # Simulate storage in a secure bucket/filesystem
        storage_dir = "secure_storage"
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, f"{file.filename}.enc")
        
        with open(file_path, "wb") as f:
            f.write(encrypted_content)
            
        logger.info(f"Document {file.filename} uploaded and encrypted successfully.")
        return {
            "status": "success",
            "filename": file.filename,
            "storage_path": file_path,
            "encryption": "AES-256 (Fernet)"
        }
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Secure upload failed")


@app.post("/recommend", tags=["Scoring"], dependencies=[Depends(verify_token)])
def recommend(req: ScoreRequest):
    """
    Runs /predict internally, then scores all eligible plans
    using cosine similarity + budget fit, returning top_n ranked plans.
    Protected by JWT.
    """
    try:
        predict_result = _run_predict(req.user_input)
        user_dict = req.user_input.model_dump()
        score_result = scorer.score(predict_result, user_dict, top_n=req.top_n)
        
        # Enhance explanations with NLP placeholder
        for p in score_result["top_plans"]:
            p["nlp_summary"] = get_nlp_explanation(p["name"], p["score_breakdown"])
            
        return {
            "prediction": predict_result,
            "recommendations": score_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/monitor", tags=["Ops"], dependencies=[Depends(verify_token)])
def monitor():
    """Returns drift metrics for top features."""
    from monitoring import ModelMonitor
    # Note: In production, training data path should be an env var
    train_data_path = os.path.join(os.path.dirname(__file__), "..", "dataset_real_hybrid.csv")
    monitor = ModelMonitor(train_data_path)
    
    # Check drift for key features
    drift_report = [
        monitor.check_drift("bmi"),
        monitor.check_drift("age"),
        monitor.check_drift("hba1c")
    ]
    return {"status": "ok", "drift_report": drift_report}


@app.post("/auth/token", tags=["Auth"])
def generate_token(creds: dict):
    """
    Demo endpoint to generate a token for hackathon testing.
    Now requires a simple password check for basic security.
    """
    # For hackathon demo, we check for a hardcoded key
    if creds.get("api_key") != "insuro_access_2026":
        raise HTTPException(status_code=401, detail="Invalid API Key")
        
    payload = {
        "sub": "demo_user",
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/plans", tags=["Catalogue"])
def list_plans(tier: Optional[str] = Query(None, description="Filter by tier: low | medium | high")):
    """Return all plans, optionally filtered by risk tier."""
    plans = scorer.list_plans(tier=tier)
    if tier and not plans:
        raise HTTPException(status_code=404, detail=f"No plans found for tier '{tier}'")
    return {"count": len(plans), "plans": plans}


@app.get("/plans/{plan_id}", tags=["Catalogue"])
def get_plan(plan_id: str):
    """Return detail for a single plan by ID."""
    plan = scorer.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
    return plan
