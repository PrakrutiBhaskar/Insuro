import requests
import os

EXTRACTION_URL = "http://localhost:8001/extract"
GATEWAY_URL = "http://localhost:3000/api/upload"
FILE_PATH = "Priya_Sharma_Lab_Report.pdf"

def test_extraction_direct():
    print("--- Testing Extraction Service DIRECTLY ---")
    if not os.path.exists(FILE_PATH):
        print(f"File {FILE_PATH} not found!")
        return
    
    with open(FILE_PATH, "rb") as f:
        files = {"file": (FILE_PATH, f, "application/pdf")}
        try:
            print(f"Sending {FILE_PATH} to {EXTRACTION_URL}...")
            res = requests.post(EXTRACTION_URL, files=files, timeout=60)
            if res.status_code == 200:
                print("SUCCESS!")
                print(res.json().get("extracted_fields"))
            else:
                print(f"FAILED: {res.status_code}")
                print(res.text)
        except Exception as e:
            print(f"ERROR: {e}")

def test_gateway_upload():
    print("\n--- Testing GATEWAY Upload ---")
    with open(FILE_PATH, "rb") as f:
        files = {"file": (FILE_PATH, f, "application/pdf")}
        try:
            print(f"Sending {FILE_PATH} to {GATEWAY_URL}...")
            res = requests.post(GATEWAY_URL, files=files, timeout=60)
            if res.status_code == 200:
                print("SUCCESS via Gateway!")
                print(res.json().get("extracted_fields"))
            else:
                print(f"FAILED via Gateway: {res.status_code}")
                print(res.text)
        except Exception as e:
            print(f"ERROR via Gateway: {e}")

if __name__ == "__main__":
    test_extraction_direct()
    test_gateway_upload()
