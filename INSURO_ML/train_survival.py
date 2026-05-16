import numpy as np
import scipy.integrate
import pandas as pd

# Monkeypatch trapz if missing (Scipy 1.14+ compatibility)
if not hasattr(scipy.integrate, "trapz"):
    scipy.integrate.trapz = np.trapz

# Monkeypatch iteritems if missing (Pandas 2.0+ compatibility)
if not hasattr(pd.Series, "iteritems"):
    pd.Series.iteritems = pd.Series.items

from lifelines import CoxPHFitter
import joblib
from pathlib import Path
import matplotlib.pyplot as plt

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_survival.csv")
MODEL_DIR = Path("INSURO_ML/models")
SURVIVAL_MODEL_PATH = MODEL_DIR / "survival_model.pkl"

def train_survival():
    print("--- Training Survival Analysis Model (CoxPH) ---")
    df = pd.read_csv(DATA_PATH)
    
    # 1. Select features
    features = [
        "age", "bmi", "smoker", "gender", "income_band", "hypertension_hx",
        "systolic_bp", "diastolic_bp", "hba1c", "cholesterol", "fasting_glucose",
        "diabetes_family_hx", "heart_disease_family_hx", "currently_medicated"
    ]
    target_cols = ["tenure_months", "claim_occurred"]
    
    # Drop rows with NaNs in survival features
    data = df[features + target_cols].dropna()
    
    # 2. Fit CoxPH
    cph = CoxPHFitter(penalizer=0.1)
    print(f"Fitting model on {len(data)} rows...")
    cph.fit(data, duration_col="tenure_months", event_col="claim_occurred")
    
    # 3. Print Summary
    print("\nModel Summary:")
    print(cph.summary[["coef", "exp(coef)", "p"]])
    
    # 4. Save model
    joblib.dump(cph, SURVIVAL_MODEL_PATH)
    print(f"\nSurvival model saved to {SURVIVAL_MODEL_PATH}")
    
    # 5. Plot coefficients
    plt.figure(figsize=(10, 6))
    cph.plot()
    plt.title("Cox Proportional Hazards - Feature Coefficients")
    plt.savefig(MODEL_DIR / "survival_coefficients.png")
    plt.close()
    
    # 6. Sample Survival Curve
    plt.figure(figsize=(8, 6))
    sample_data = data.iloc[:5]
    cph.predict_survival_function(sample_data).plot()
    plt.title("Sample Survival Curves (Claim Probability over Time)")
    plt.xlabel("Months")
    plt.ylabel("Probability of NO Claim")
    plt.savefig(MODEL_DIR / "sample_survival_curves.png")
    plt.close()

if __name__ == "__main__":
    train_survival()
