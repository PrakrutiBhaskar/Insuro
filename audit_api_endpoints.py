import requests
import json
import time

BASE_GATEWAY = "http://localhost:3000/api"
BASE_ML = "http://localhost:8000"
BASE_EXT = "http://localhost:8001"

def test_endpoint(name, method, url, payload=None, headers=None):
    print(f"Testing {name} [{method}] {url}...")
    try:
        start = time.time()
        if method == "GET":
            res = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            res = requests.post(url, json=payload, headers=headers, timeout=10)
        elif method == "DELETE":
            res = requests.delete(url, headers=headers, timeout=10)
        elapsed = time.time() - start
        
        status = "PASS" if 200 <= res.status_code < 300 else "FAIL"
        print(f"  Result: {status} ({res.status_code}) in {elapsed:.3f}s")
        if status == "FAIL":
            print(f"  Response: {res.text[:200]}")
        return res
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def run_audit():
    print("=== INSURO API AUDIT BASELINE ===\n")
    
    # 1. Auth Flow
    print("--- AUTH FLOW ---")
    reg_data = {"email": "test_qa@insuro.com", "password": "password123", "full_name": "QA Tester"}
    test_endpoint("Register", "POST", f"{BASE_GATEWAY}/auth/register", reg_data)
    
    login_data = {"email": "admin@insuro.com", "password": "admin123"}
    login_res = test_endpoint("Login", "POST", f"{BASE_GATEWAY}/auth/login", login_data)
    token = login_res.json().get("access_token") if login_res else None
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 2. Gateway Proxies
    print("\n--- GATEWAY PROXIES ---")
    test_endpoint("Inference (Gateway)", "POST", f"{BASE_GATEWAY}/inference", {"age": 30, "income_band": 3, "budget_range": 5000, "smoker": 0, "diabetes_family_hx": 0, "heart_disease_family_hx": 0, "hypertension_hx": 0, "currently_medicated": 0, "gender": 0, "coverage_type_pref": 0})
    test_endpoint("Delete Data (Gateway)", "DELETE", f"{BASE_GATEWAY}/user/data", headers=headers)

    # 3. ML Service (Internal)
    print("\n--- ML SERVICE (8000) ---")
    test_endpoint("ML Health", "GET", f"{BASE_ML}/health")
    test_endpoint("ML Predict (No Auth)", "POST", f"{BASE_ML}/predict", {"age": 30, "income_band": 3, "budget_range": 5000, "smoker": 0, "diabetes_family_hx": 0, "heart_disease_family_hx": 0, "hypertension_hx": 0, "currently_medicated": 0, "gender": 0, "coverage_type_pref": 0})
    test_endpoint("ML Recommend (Auth Required)", "POST", f"{BASE_ML}/recommend", {"user_input": {"age": 30, "income_band": 3, "budget_range": 5000, "smoker": 0, "diabetes_family_hx": 0, "heart_disease_family_hx": 0, "hypertension_hx": 0, "currently_medicated": 0, "gender": 0, "coverage_type_pref": 0}, "top_n": 3}, headers=headers)
    test_endpoint("ML Chat", "POST", f"{BASE_ML}/chat", {"query": "What is BMI?", "context": "Step 2"})
    test_endpoint("List Plans", "GET", f"{BASE_ML}/plans")

    # 4. Extraction Service (Internal)
    print("\n--- EXTRACTION SERVICE (8001) ---")
    test_endpoint("Ext Health", "GET", f"{BASE_EXT}/health")

    print("\n=== AUDIT COMPLETE ===")

if __name__ == "__main__":
    run_audit()
