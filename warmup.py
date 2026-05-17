import requests
import time
import sys

SERVICES = {
    "ML Service": "http://localhost:8000/health",
    "Gateway": "http://localhost:3000/",
    "Extraction": "http://localhost:8001/health"
}

def warmup():
    print("--- INSURO System Warm-up ---")
    print("Triggering cold-starts for NLP and ML models. This takes ~45s.")
    
    for name, url in SERVICES.items():
        print(f"\nWarming up {name}...")
        try:
            start = time.time()
            res = requests.get(url, timeout=60)
            elapsed = time.time() - start
            if res.status_code == 200:
                print(f"[READY] {name} (Latency: {elapsed:.2f}s)")
            else:
                print(f"[ERROR] {name} returned {res.status_code}")
        except Exception as e:
            print(f"[FAIL] {name} unreachable: {e}")

    print("\n--- Warm-up Complete: System ready for live demo! ---")

if __name__ == "__main__":
    warmup()
