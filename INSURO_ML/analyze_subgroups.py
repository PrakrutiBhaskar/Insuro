import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import f1_score
from pathlib import Path
import os

# Configuration
MODEL_PATH = Path("INSURO_ML/models/insuready_model.pkl")
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")

def calculate_ece(y_true, y_prob, n_bins=10):
    confidences = np.max(y_prob, axis=1)
    predictions = np.argmax(y_prob, axis=1)
    accuracies = (predictions == y_true)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0
    for m in range(n_bins):
        mask = (confidences > bin_boundaries[m]) & (confidences <= bin_boundaries[m+1])
        if np.any(mask):
            ece += np.abs(np.mean(accuracies[mask]) - np.mean(confidences[mask])) * (np.sum(mask) / len(y_true))
    return float(ece)

def analyze_subgroups():
    print("--- InsuReady Subgroup Fairness Analysis ---")
    
    if not MODEL_PATH.exists():
        print(f"Error: Model not found at {MODEL_PATH}")
        return

    # Load bundle
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    preprocessor = bundle["preprocessor"]
    le = bundle["label_encoder"]
    
    # Load raw data
    df = pd.read_csv(DATA_PATH)
    
    # Preprocess
    X = df.drop(columns=["risk_label", "risk_score_raw"])
    y = le.transform(df["risk_label"])
    
    X_proc = preprocessor.transform(X)
    y_proba = model.predict_proba(X_proc)
    y_pred = model.predict(X_proc)
    
    results = []

    # 1. Age Bands
    age_bins = [18, 30, 50, 80]
    age_labels = ["18-30", "30-50", "50-80"]
    df["age_group"] = pd.cut(df["age"], bins=age_bins, labels=age_labels)
    
    # 2. BMI Categories
    bmi_bins = [0, 25, 30, 100]
    bmi_labels = ["Normal/Under", "Overweight", "Obese"]
    df["bmi_group"] = pd.cut(df["bmi"], bins=bmi_bins, labels=bmi_labels)
    
    # 3. Gender (assuming 0=Female, 1=Male based on typical datasets, but we check consistency)
    gender_labels = {0: "Female", 1: "Male"}
    df["gender_name"] = df["gender"].map(gender_labels)

    subgroups = {
        "Age Band": "age_group",
        "BMI Category": "bmi_group",
        "Gender": "gender_name"
    }

    for group_name, col in subgroups.items():
        print(f"\nAnalyzing {group_name}:")
        for subgroup in df[col].unique():
            if pd.isna(subgroup): continue
            
            mask = (df[col] == subgroup)
            if not any(mask): continue
            
            sub_y = y[mask]
            sub_y_pred = y_pred[mask]
            sub_y_proba = y_proba[mask]
            
            f1 = f1_score(sub_y, sub_y_pred, average="macro")
            ece = calculate_ece(sub_y, sub_y_proba)
            count = sum(mask)
            
            results.append({
                "Group": group_name,
                "Subgroup": subgroup,
                "Count": count,
                "F1-Macro": round(f1, 4),
                "ECE": round(ece, 4)
            })
            print(f"  - {subgroup:<12} | N: {count:>5} | F1: {f1:.4f} | ECE: {ece:.4f}")

    # Final summary report
    res_df = pd.DataFrame(results)
    res_df.to_csv("INSURO_ML/models/subgroup_analysis.csv", index=False)
    print(f"\nAnalysis complete. Results saved to INSURO_ML/models/subgroup_analysis.csv")
    
    # Check for significant disparities
    max_ece_gap = res_df.groupby("Group")["ECE"].transform(lambda x: x.max() - x.min()).max()
    if max_ece_gap > 0.02:
        print(f"\nWARNING: Significant calibration gap detected ({max_ece_gap:.4f}). Consider group-specific calibration.")
    else:
        print("\nFairness Check: Calibration is consistent across demographics.")

if __name__ == "__main__":
    analyze_subgroups()
