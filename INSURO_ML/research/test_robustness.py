import requests
import json
import time

# Configuration
API_URL = "http://127.0.0.1:8000/recommend"
AUTH_URL = "http://127.0.0.1:8000/auth/token"

def get_token():
    resp = requests.post(AUTH_URL, json={"api_key": "insuro_access_2026"})
    return resp.json()["access_token"]

def test_missing_values():
    print("--- Starting Robustness Integration Test (Missing Features) ---")
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Scenario 1: Missing Lab Results (HbA1c and Cholesterol missing)
    payload_no_labs = {
        "user_input": {
            "age": 50,
            "bmi": 24.0,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "hba1c": None,           # MISSING
            "cholesterol": None,     # MISSING
            "fasting_glucose": 95,
            "income_band": 4,
            "budget_range": 6000,
            "smoker": 0,
            "diabetes_family_hx": 0,
            "heart_disease_family_hx": 0,
            "hypertension_hx": 0,
            "currently_medicated": 0,
            "gender": 1,
            "coverage_type_pref": 1
        },
        "top_n": 3
    }

    # Scenario 2: Missing Vitals (BP and BMI missing)
    payload_no_vitals = {
        "user_input": {
            "age": 30,
            "bmi": None,             # MISSING
            "systolic_bp": None,      # MISSING
            "diastolic_bp": None,     # MISSING
            "hba1c": 5.2,
            "cholesterol": 180,
            "fasting_glucose": 90,
            "income_band": 3,
            "budget_range": 4000,
            "smoker": 0,
            "diabetes_family_hx": 0,
            "heart_disease_family_hx": 0,
            "hypertension_hx": 0,
            "currently_medicated": 0,
            "gender": 0,
            "coverage_type_pref": 0
        },
        "top_n": 3
    }

    scenarios = [
        ("Missing Lab Results", payload_no_labs),
        ("Missing Vitals", payload_no_vitals)
    ]

    for name, payload in scenarios:
        print(f"Testing Scenario: {name}...")
        try:
            resp = requests.post(API_URL, json=payload, headers=headers)
            if resp.status_code == 200:
                result = resp.json()
                risk = result["prediction"]["risk_label"]
                conf = result["prediction"]["risk_score"]
                print(f"  Result: {risk} (Risk Score: {conf:.4f})")
                
                # Check for SHAP indicators
                top_features = [f["feature"] for f in result["prediction"]["top_shap_features"]]
                print(f"  Top SHAP features: {top_features}")
                
                # Verify that indicators are present if relevant
                # Note: indicators are named like 'missing_indicator_hba1c'
                has_indicator = any("missing_indicator" in f for f in top_features)
                if has_indicator:
                    print("  Verified: Model used MissingIndicator flags for inference.")
                
                print(f"  Status: PASS")
            else:
                print(f"  Status: FAIL (HTTP {resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"  Status: CRASH ({str(e)})")

if __name__ == "__main__":
    test_missing_values()
