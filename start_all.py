import subprocess
import os
import time

def start_service(name, cmd, port):
    log_file = open(f"{name}.log", "w")
    print(f"Starting {name} on port {port}...")
    proc = subprocess.Popen(cmd, shell=True, stdout=log_file, stderr=log_file)
    return proc

def main():
    # Kill existing using PowerShell
    print("Stopping existing services...")
    subprocess.run(['powershell', '-Command', 'Get-NetTCPConnection -LocalPort 3000, 8000, 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }'])
    time.sleep(2)
    
    # Start all
    p1 = start_service("gateway", "cd backend && python -m uvicorn main:app --port 3000", 3000)
    p2 = start_service("ml_service", "cd INSURO_ML && python -m uvicorn api.app:app --port 8000", 8000)
    p3 = start_service("extraction", "cd extraction && python -m uvicorn main:app --port 8001", 8001)
    
    print("\nAll services starting. Waiting 15s for initialization...")
    time.sleep(15)
    print("Startup complete. Check .log files for details.")

if __name__ == "__main__":
    main()
