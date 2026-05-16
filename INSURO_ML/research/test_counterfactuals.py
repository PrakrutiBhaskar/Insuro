import requests
import json

# Configuration
API_URL = "http://127.0.0.1:8000/recommend"
AUTH_URL = "http://127.0.0.1:8000/auth/token"

def get_token():
    resp = requests.post(AUTH_URL, json={"api_key": "insuro_access_2026"})
    return resp.json()["access_token"]

def test_counterfactuals():
    print("--- Starting Counterfactual Integration Test ---")
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Scenario: High Risk User (Smoker, High BMI, High BP)
    payload = {
        "user_input": {
            "age": 65,
            "bmi": 34.5,
            "systolic_bp": 170,
            "diastolic_bp": 105,
            "hba1c": 8.2,
            "cholesterol": 280,
            "fasting_glucose": 150,
            "income_band": 4,
            "budget_range": 6000,
            "smoker": 1,
            "diabetes_family_hx": 1,
            "heart_disease_family_hx": 1,
            "hypertension_hx": 1,
            "currently_medicated": 1,
            "gender": 1,
            "coverage_type_pref": 1
        },
        "top_n": 3
    }

    print("Requesting recommendation for High Risk profile...")
    try:
        resp = requests.post(API_URL, json=payload, headers=headers)
        if resp.status_code == 200:
            result = resp.json()
            risk = result["prediction"]["risk_label"]
            score = result["prediction"]["risk_score"]
            print(f"  Current Risk: {risk} (Score: {score:.4f})")
            
            cfs = result["prediction"].get("how_to_improve", [])
            if cfs:
                print(f"\n  Found {len(cfs)} Actionable Paths:")
                for i, path in enumerate(cfs):
                    print(f"    Path {i+1} (Target: {path['target_risk']}):")
                    for change in path["changes"]:
                        print(f"      - {change['action']}: {change['current']} -> {change['target']}")
                print("\n  Status: PASS")
            else:
                print("  Warning: No counterfactuals generated. (Might need more DiCE trials)")
                print("  Status: FAIL")
        else:
            print(f"  Status: FAIL (HTTP {resp.status_code}): {resp.text}")
    except Exception as e:
        print(f"  Status: CRASH ({str(e)})")

if __name__ == "__main__":
    test_counterfactuals()
