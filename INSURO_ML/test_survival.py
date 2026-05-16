import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_survival():
    print("--- Testing Survival Analysis Integration ---")
    
    # 1. Get Token
    auth_resp = requests.post(f"{BASE_URL}/auth/token", json={"api_key": "insuro_access_2026"})
    token = auth_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. High Risk Profile
    payload = {
        "user_input": {
            "age": 65, "bmi": 38.5, "systolic_bp": 165, "diastolic_bp": 95,
            "hba1c": 8.5, "cholesterol": 280.0, "fasting_glucose": 180.0,
            "income_band": 2, "budget_range": 5000.0, "smoker": 1,
            "diabetes_family_hx": 1, "heart_disease_family_hx": 1,
            "hypertension_hx": 1, "currently_medicated": 1, "gender": 1,
            "coverage_type_pref": 2
        },
        "top_n": 1
    }
    
    print("Requesting recommendation for High Risk profile...")
    resp = requests.post(f"{BASE_URL}/recommend", json=payload, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        prediction = data.get("prediction", {})
        actuarial = prediction.get("actuarial_claim_probs", {})
        
        print(f"Risk Label: {prediction.get('risk_label')}")
        print(f"12-month Claim Prob: {actuarial.get('p_claim_12m')}")
        print(f"36-month Claim Prob: {actuarial.get('p_claim_36m')}")
        
        if actuarial.get("p_claim_12m") is not None:
            print("Status: SUCCESS")
        else:
            print("Status: FAIL (No actuarial probs found)")
    else:
        print(f"Status: FAIL (HTTP {resp.status_code})")
        print(resp.text)

if __name__ == "__main__":
    test_survival()
