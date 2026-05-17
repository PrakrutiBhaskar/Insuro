import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    demographic_parity_difference,
    equalized_odds_difference
)
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")
MODEL_PATH = Path("INSURO_ML/models/insuro_model.pkl")

def run_fairness_audit():
    print("--- Conducting Fairness and Bias Audit ---")
    
    # 1. Load data and model
    df = pd.read_csv(DATA_PATH)
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    preprocessor = bundle["preprocessor"]
    label_enc = bundle["label_encoder"]
    
    # 2. Prepare features
    X = df.drop(columns=["risk_label", "risk_score_raw"])
    y_true = label_enc.transform(df["risk_label"])
    
    # 3. Get predictions
    print("Generating predictions...")
    y_pred = model.predict(preprocessor.transform(X))
    
    # Binarize for parity metrics (Target: High Risk = 2)
    y_true_binary = (y_true == 2).astype(int)
    y_pred_binary = (y_pred == 2).astype(int)
    
    # 4. Metrics by Gender
    mf_gender = MetricFrame(
        metrics={"accuracy": accuracy_score, "selection_rate": selection_rate},
        y_true=y_true_binary,
        y_pred=y_pred_binary,
        sensitive_features=df["gender"]
    )
    
    print("\nFairness Metrics by Gender (High Risk Class):")
    print(mf_gender.by_group)
    
    dp_diff = demographic_parity_difference(y_true_binary, y_pred_binary, sensitive_features=df["gender"])
    eo_diff = equalized_odds_difference(y_true_binary, y_pred_binary, sensitive_features=df["gender"])
    
    print(f"\nDemographic Parity Difference (Gender): {dp_diff:.4f}")
    print(f"Equalized Odds Difference (Gender): {eo_diff:.4f}")
    
    # 5. Audit Income Band
    mf_income = MetricFrame(
        metrics={"accuracy": accuracy_score, "selection_rate": selection_rate},
        y_true=y_true_binary,
        y_pred=y_pred_binary,
        sensitive_features=df["income_band"]
    )
    print("\nFairness Metrics by Income Band:")
    print(mf_income.by_group)
    
    # 6. Document Findings
    report_path = Path("INSURO_ML/reports/fairness_audit.txt")
    report_path.parent.mkdir(exist_ok=True)
    with open(report_path, "w") as f:
        f.write("INSURO Fairness Audit Report\n")
        f.write("===============================\n\n")
        f.write(f"High-Risk Gender Parity Diff: {dp_diff:.4f}\n")
        f.write(f"High-Risk Gender Eq Odds Diff: {eo_diff:.4f}\n\n")
        f.write("Metrics by Gender:\n")
        f.write(str(mf_gender.by_group) + "\n\n")
        f.write("Metrics by Income:\n")
        f.write(str(mf_income.by_group) + "\n")
    
    print(f"\nAudit results saved to {report_path}")

if __name__ == "__main__":
    run_fairness_audit()
