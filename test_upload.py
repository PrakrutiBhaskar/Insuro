import requests
import time
import sys

BASE_URL = "http://localhost:8000"
PDF_PATH = "Priya_Sharma_Lab_Report.pdf"

def main():
    print(f"--- Starting QA Upload Test ({PDF_PATH}) ---")
    
    # 1. Get Token
    print("1. Authenticating...")
    try:
        auth_res = requests.post(
            f"{BASE_URL}/auth/token",
            json={"username": "admin", "password": "admin123"}
        )
        auth_res.raise_for_status()
        token = auth_res.json()["access_token"]
        print("   Success! Token acquired.")
    except Exception as e:
        print(f"   Auth failed: {e}")
        if 'auth_res' in locals():
            print(f"   Response: {auth_res.text}")
        sys.exit(1)

    # 2. Upload 10 times
    print("\n2. Running 10 upload iterations...")
    headers = {"Authorization": f"Bearer {token}"}
    
    success_count = 0
    for i in range(1, 11):
        try:
            with open(PDF_PATH, "rb") as f:
                files = {"file": (PDF_PATH, f, "application/pdf")}
                start = time.time()
                res = requests.post(f"{BASE_URL}/upload-document", headers=headers, files=files)
                elapsed = time.time() - start
                
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "success":
                        print(f"   Iteration {i}/10: Success in {elapsed:.3f}s (Encryption: {data.get('encryption')})")
                        success_count += 1
                    else:
                        print(f"   Iteration {i}/10: Failed logic - {data}")
                else:
                    print(f"   Iteration {i}/10: Failed API - {res.status_code} {res.text}")
        except Exception as e:
            print(f"   Iteration {i}/10: Exception - {e}")
            
    print(f"\n--- Test Complete: {success_count}/10 successful ---")
    if success_count == 10:
        print("QA PASSED: 10/10 uploads parsed cleanly.")
    else:
        print("QA FAILED: Not all uploads succeeded.")

if __name__ == "__main__":
    main()
