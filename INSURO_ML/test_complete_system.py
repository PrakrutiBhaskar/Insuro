import os
import joblib
import json
import numpy as np
import shap
import sys
import pandas as pd

# Add api directory to path to import scorer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))
from scorer import PlanScorer

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "insuready_model.pkl")

# --- Encoding Helpers (from app.py) ---
FEATURE_ORDER = [
    "age", "bmi", "systolic_bp", "diastolic_bp",
    "hba1c", "cholesterol", "fasting_glucose",
    "income_band", "budget_range",
    "smoker", "diabetes_family_hx", "heart_disease_family_hx",
    "hypertension_hx", "currently_medicated",
    "gender_0", "gender_1",
    "coverage_type_pref_0", "coverage_type_pref_1", "coverage_type_pref_2",
]

def encode_input(data: dict) -> pd.DataFrame:
    return pd.DataFrame([data])

# --- Test Cases ---
test_cases = [
    {
        "name": "Healthy Young Adult",
        "data": {
            "age": 25, "bmi": 22.0, "systolic_bp": 110, "diastolic_bp": 70,
            "hba1c": 5.0, "cholesterol": 170.0, "fasting_glucose": 85.0,
            "income_band": 3, "budget_range": 2000.0,
            "smoker": 0, "diabetes_family_hx": 0, "heart_disease_family_hx": 0,
            "hypertension_hx": 0, "currently_medicated": 0, "gender": 0,
            "coverage_type_pref": 0
        }
    },
    {
        "name": "Middle-Aged Smoker with High BMI",
        "data": {
            "age": 45, "bmi": 32.5, "systolic_bp": 145, "diastolic_bp": 95,
            "hba1c": 6.8, "cholesterol": 245.0, "fasting_glucose": 125.0,
            "income_band": 4, "budget_range": 5000.0,
            "smoker": 1, "diabetes_family_hx": 1, "heart_disease_family_hx": 1,
            "hypertension_hx": 1, "currently_medicated": 1, "gender": 1,
            "coverage_type_pref": 0
        }
    },
    {
        "name": "Senior with Chronic Conditions",
        "data": {
            "age": 68, "bmi": 28.0, "systolic_bp": 155, "diastolic_bp": 90,
            "hba1c": 7.5, "cholesterol": 220.0, "fasting_glucose": 140.0,
            "income_band": 2, "budget_range": 4000.0,
            "smoker": 0, "diabetes_family_hx": 1, "heart_disease_family_hx": 0,
            "hypertension_hx": 1, "currently_medicated": 1, "gender": 0,
            "coverage_type_pref": 1
        }
    }
]

def run_test():
    print("--- Loading Model Bundle ---")
    bundle = joblib.load(MODEL_PATH)
    
    model = bundle["model"]
    preprocessor = bundle["preprocessor"]
    label_enc = bundle["label_encoder"]
    scorer = PlanScorer()
    
    results = []

    for case in test_cases:
        print(f"\nTesting Case: {case['name']}")
        df_in = encode_input(case["data"])
        X = preprocessor.transform(df_in)
        
        # Prediction
        proba = model.predict_proba(X)[0]
        pred_idx = int(np.argmax(proba))
        risk_label = label_enc.inverse_transform([pred_idx])[0]
        risk_score = float(proba[pred_idx])
        
        # SHAP
        explainer = bundle.get("explainer")
        if not explainer:
            explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(X)
        if isinstance(shap_vals, list):
            class_shap = shap_vals[pred_idx][0]
        elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
            class_shap = shap_vals[0, :, pred_idx]
        else:
            class_shap = shap_vals[0]
            
        shap_pairs = sorted(
            zip(FEATURE_ORDER, class_shap.tolist()),
            key=lambda x: abs(x[1]),
            reverse=True,
        )[:3]
        
        predict_result = {
            "risk_label": risk_label,
            "risk_score": round(risk_score, 4),
            "top_shap_features": [
                {"feature": f, "shap_value": round(v, 4)} for f, v in shap_pairs
            ]
        }
        
        # Recommendation
        score_result = scorer.score(predict_result, case["data"], top_n=3)
        
        results.append({
            "case": case["name"],
            "prediction": predict_result,
            "top_plan": score_result["top_plans"][0] if score_result["top_plans"] else None,
            "eligible_count": score_result["eligible_count"],
            "government_fallbacks": score_result.get("government_fallbacks", [])
        })
        
        print(f"Risk Label: {risk_label} ({risk_score:.2f})")
        if results[-1]['top_plan']:
            tp = results[-1]['top_plan']
            print(f"Top Plan: {tp['name']} (Score: {tp['suitability_score']})")
            print(f"  Breakdown: {tp['score_breakdown']}")
            print(f"  Explanation: {tp['explanation']}")
        else:
            print("Top Plan: None")
            
        print(f"Eligible Plans: {results[-1]['eligible_count']}")
        if results[-1]['government_fallbacks']:
            print(f"Government Fallbacks: {[f['name'] for f in results[-1]['government_fallbacks']]}")

    # Save summary report data
    report_data = {
        "test_metrics": bundle.get("test_metrics", {}),
        "results": results
    }
    with open("model_test_report.json", "w") as f:
        json.dump(report_data, f, indent=2)
    print("\n--- Testing Complete. Report data saved to model_test_report.json ---")

if __name__ == "__main__":
    run_test()
