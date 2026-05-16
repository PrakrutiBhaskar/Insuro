"""
InsuReady — Dataset Builder
Unified 18-feature health risk dataset.
Distributions sourced from:
  - PIMA Indians Diabetes (Kaggle)
  - Framingham Heart Study (Kaggle)
  - UCI Hypertension / Blood Pressure dataset
Financial features synthetically generated with realistic correlations.
Risk labels derived via clinical threshold rules (ADA, JNC8, WHO guidelines).
"""

import numpy as np
import pandas as pd

np.random.seed(42)
N = 10_000


def generate_dataset(n=N) -> pd.DataFrame:
    # ── 1. NUMERICAL CLINICAL FEATURES ──────────────────────────────────────

    age = np.random.normal(45, 13, n).clip(18, 75).astype(int)
    gender = np.random.binomial(1, 0.48, n)  # 0=Female, 1=Male

    # BMI: slightly rises with age
    bmi = (np.random.normal(27.5, 6.0, n) + 0.04 * (age - 45)).clip(15.0, 50.0).round(1)

    # Blood pressure: correlated with BMI and age (Framingham distributions)
    systolic_bp = (
        110 + 0.4 * (age - 20) + 0.3 * (bmi - 25) + np.random.normal(0, 8, n)
    ).clip(85, 200).round(0).astype(int)
    diastolic_bp = (systolic_bp * np.random.uniform(0.55, 0.68, n)).clip(50, 120).round(0).astype(int)

    # HbA1c: correlated with BMI (PIMA distribution, ADA reference ranges)
    hba1c = (
        np.random.normal(5.4, 1.1, n) + 0.04 * (bmi - 25) + 0.01 * (age - 40)
    ).clip(4.0, 13.0).round(1)

    # Cholesterol mg/dL: Framingham distributions
    cholesterol = (
        np.random.normal(200, 40, n) + 0.5 * (age - 40)
    ).clip(100, 400).round(0).astype(int)

    # Fasting glucose mg/dL: correlated with HbA1c (ADA reference)
    fasting_glucose = (
        np.random.normal(90, 20, n) + 8 * (hba1c - 5.4)
    ).clip(60, 350).round(0).astype(int)

    # ── 2. BINARY / HISTORY FEATURES ────────────────────────────────────────

    smoker = np.random.binomial(1, np.clip(0.17 + 0.06 * gender, 0, 1), n).astype(bool)

    diabetes_family_hx = np.random.binomial(1, 0.30, n).astype(bool)       # PIMA ~30%
    heart_disease_family_hx = np.random.binomial(1, 0.25, n).astype(bool)  # Framingham ~25%

    # Hypertension history: correlated with systolic BP (UCI HTN dataset)
    htn_prob = np.where(systolic_bp > 140, 0.75,
               np.where(systolic_bp > 130, 0.45,
               np.where(systolic_bp > 120, 0.20, 0.08)))
    hypertension_hx = np.random.binomial(1, htn_prob, n).astype(bool)

    # Currently medicated: composite probability
    med_score = (
        0.05 * np.clip(age - 30, 0, None) / 10
        + 0.20 * hypertension_hx.astype(int)
        + 0.15 * diabetes_family_hx.astype(int)
        + 0.10 * smoker.astype(int)
        + np.random.normal(0, 0.05, n)
    )
    currently_medicated = (med_score > 0.25).astype(bool)

    # ── 3. SYNTHETIC SOCIOECONOMIC FEATURES ─────────────────────────────────

    # Income band: 1=<3LPA, 2=3-6LPA, 3=6-12LPA, 4=12-20LPA, 5=20+LPA
    income_raw = np.random.normal(0, 1, n) + 0.03 * np.clip(age - 25, 0, 20)
    income_band = pd.cut(
        income_raw, bins=[-np.inf, -0.8, 0.0, 0.6, 1.2, np.inf],
        labels=[1, 2, 3, 4, 5]
    ).astype(int)

    # Budget range max (INR/month premium willing to pay): correlated with income
    budget_max_base = {1: 1500, 2: 2500, 3: 4000, 4: 7000, 5: 15000}
    budget_range = np.array([
        int(budget_max_base[ib] * np.random.uniform(0.8, 1.2))
        for ib in income_band
    ])

    # Coverage type preference: ordinal encoded
    # 0=Individual, 1=Family, 2=Senior, 3=Critical Illness
    cov_probs = np.column_stack([
        np.where(age < 35, 0.55, np.where(age < 50, 0.25, 0.10)),   # Individual
        np.where(age < 35, 0.30, np.where(age < 55, 0.50, 0.25)),   # Family
        np.where(age >= 55, 0.45, np.where(age >= 45, 0.15, 0.05)), # Senior
        np.where(age >= 40, 0.20, 0.10),                             # Critical
    ])
    # Normalize rows
    cov_probs = cov_probs / cov_probs.sum(axis=1, keepdims=True)
    coverage_type_pref = np.array([
        np.random.choice(4, p=cov_probs[i]) for i in range(n)
    ])

    # ── 4. ASSEMBLE DATAFRAME ────────────────────────────────────────────────

    df = pd.DataFrame({
        # Numerical
        "age": age,
        "bmi": bmi,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "hba1c": hba1c,
        "cholesterol": cholesterol,
        "fasting_glucose": fasting_glucose,
        "income_band": income_band,            # ordinal 1-5
        "budget_range": budget_range,          # INR/month
        # Binary
        "smoker": smoker.astype(int),
        "diabetes_family_hx": diabetes_family_hx.astype(int),
        "heart_disease_family_hx": heart_disease_family_hx.astype(int),
        "hypertension_hx": hypertension_hx.astype(int),
        "currently_medicated": currently_medicated.astype(int),
        # Encoded
        "gender": gender,                       # 0=F, 1=M (label encoded)
        "coverage_type_pref": coverage_type_pref,  # 0-3 (will OHE for training)
    })

    # ── 5. DERIVE RISK LABEL (clinical rule-based thresholds) ───────────────
    # Sources: ADA 2024, JNC8 hypertension, WHO BMI, NCEP cholesterol guidelines

    def compute_risk_score(row):
        score = 0

        # HbA1c (ADA thresholds)
        if row["hba1c"] >= 6.5:   score += 3   # Diabetic
        elif row["hba1c"] >= 5.7: score += 1   # Pre-diabetic

        # Blood pressure (JNC8)
        if row["systolic_bp"] >= 140 or row["diastolic_bp"] >= 90:   score += 3
        elif row["systolic_bp"] >= 130 or row["diastolic_bp"] >= 80: score += 1

        # BMI (WHO)
        if row["bmi"] >= 35:   score += 3
        elif row["bmi"] >= 30: score += 2
        elif row["bmi"] >= 25: score += 1

        # Cholesterol (NCEP ATP III)
        if row["cholesterol"] >= 240:   score += 2
        elif row["cholesterol"] >= 200: score += 1

        # Fasting glucose (ADA)
        if row["fasting_glucose"] >= 126:  score += 3
        elif row["fasting_glucose"] >= 100: score += 1

        # Age
        if row["age"] >= 60:   score += 2
        elif row["age"] >= 45: score += 1

        # Binary risk factors
        score += row["smoker"] * 2
        score += row["diabetes_family_hx"] * 1
        score += row["heart_disease_family_hx"] * 2
        score += row["hypertension_hx"] * 2
        score += row["currently_medicated"] * 1

        return score

    scores = df.apply(compute_risk_score, axis=1)

    # Map score → label with natural thresholds
    # Low: 0-4, Medium: 5-9, High: 10+
    df["risk_score_raw"] = scores
    df["risk_label"] = pd.cut(
        scores, bins=[-1, 4, 9, 100],
        labels=["Low", "Medium", "High"]
    )

    return df


if __name__ == "__main__":
    print("Generating dataset...")
    df = generate_dataset()
    print(f"Shape: {df.shape}")
    print("\nRisk label distribution:")
    print(df["risk_label"].value_counts(normalize=True).round(3))
    print("\nFeature stats:")
    print(df.describe().round(2))
    df.to_csv("dataset.csv", index=False)
    print("\nSaved to dataset.csv")
