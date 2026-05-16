import pandas as pd
import numpy as np
from pathlib import Path

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")
OUTPUT_PATH = Path("INSURO_ML/dataset_survival.csv")

def simulate_survival():
    print("Simulating survival data for actuarial analysis...")
    df = pd.read_csv(DATA_PATH)
    
    # 1. Base hazard rate based on risk_score_raw
    # Higher risk_score_raw = higher hazard
    hazard = df["risk_score_raw"] / 15.0  # Normalized 
    
    # 2. Simulate time to event (months)
    # Using Exponential distribution: T = -log(U) / lambda
    # We'll use lambda = hazard * 0.05 (so high risk has higher lambda, shorter T)
    lambda_param = 0.01 + (hazard * 0.1)
    
    # Random uniform
    np.random.seed(42)
    U = np.random.uniform(0, 1, len(df))
    T = -np.log(U) / lambda_param
    
    # 3. Apply censoring (study ends at 60 months)
    STUDY_DURATION = 60
    df["tenure_months"] = np.minimum(T, STUDY_DURATION)
    df["claim_occurred"] = (T <= STUDY_DURATION).astype(int)
    
    # Add some noise
    df["tenure_months"] = df["tenure_months"] + np.random.normal(0, 1, len(df))
    df["tenure_months"] = df["tenure_months"].clip(1, STUDY_DURATION)
    
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Survival dataset created at {OUTPUT_PATH}")
    print(f"Mean tenure: {df['tenure_months'].mean():.2f} months")
    print(f"Claim rate: {df['claim_occurred'].mean():.2%}")

if __name__ == "__main__":
    simulate_survival()
