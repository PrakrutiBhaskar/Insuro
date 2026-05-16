import time
import requests
import numpy as np
import json
import subprocess
import os

# Configuration
API_URL = "http://127.0.0.1:8000/recommend"
AUTH_URL = "http://127.0.0.1:8000/auth/token"
ITERATIONS = 50
LATENCY_TARGET_P95 = 0.200 # 200ms

def get_token():
    try:
        resp = requests.post(AUTH_URL, json={"api_key": "insuro_access_2026"})
        return resp.json()["access_token"]
    except Exception as e:
        print(f"Failed to get token: {e}")
        return None

def run_benchmark():
    print(f"--- Starting API Latency Benchmark ({ITERATIONS} iterations) ---")
    
    token = get_token()
    if not token:
        print("API not reachable or Auth failed. Make sure app.py is running.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    health_input = {
        "age": 45, "bmi": 28.5, "systolic_bp": 135, "diastolic_bp": 85,
        "hba1c": 6.2, "cholesterol": 210.0, "fasting_glucose": 110.0,
        "income_band": 4, "budget_range": 5000.0,
        "smoker": 0, "diabetes_family_hx": 1, "heart_disease_family_hx": 0,
        "hypertension_hx": 1, "currently_medicated": 1, "gender": 1,
        "coverage_type_pref": 1
    }
    
    payload = {
        "user_input": health_input,
        "top_n": 5
    }

    latencies = []

    # Warm-up
    print("Warming up...")
    for _ in range(5):
        requests.post(API_URL, json=payload, headers=headers)

    print("Benchmarking...")
    for i in range(ITERATIONS):
        start = time.perf_counter()
        response = requests.post(API_URL, json=payload, headers=headers)
        end = time.perf_counter()
        
        if response.status_code == 200:
            latencies.append(end - start)
        else:
            print(f"Request {i} failed: {response.status_code}")
        
        if (i+1) % 10 == 0:
            print(f"Completed {i+1}/{ITERATIONS}...")

    if not latencies:
        print("No successful requests.")
        return

    p50 = np.percentile(latencies, 50)
    p95 = np.percentile(latencies, 95)
    avg = np.mean(latencies)

    print("\n--- Benchmark Results ---")
    print(f"Average Latency : {avg*1000:.2f} ms")
    print(f"P50 Latency     : {p50*1000:.2f} ms")
    print(f"P95 Latency     : {p95*1000:.2f} ms")
    print(f"Target P95      : < {LATENCY_TARGET_P95*1000:.2f} ms")

    if p95 <= LATENCY_TARGET_P95:
        print("\nPASS: Latency is within production limits.")
    else:
        print("\nFAIL: Latency exceeds production limits.")

if __name__ == "__main__":
    run_benchmark()
