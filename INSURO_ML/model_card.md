# Model Card: INSURO Risk Classifier (v1.1.0)

## 1. Model Details
- **Organization**: Insuro Technical Team
- **Model Date**: May 15, 2026
- **Model Version**: 1.1.0
- **Model Type**: XGBoost Classifier with Isotonic Calibration
- **License**: MIT

## 2. Intended Use
- **Primary Use**: Health insurance risk stratification (Low/Medium/High) for Indian private health insurance plans.
- **Out-of-Scope**: Clinical diagnosis or treatment recommendations.

## 3. Factors (Features)
| Feature | Type | Source | Clinical Note |
|---|---|---|---|
| `age` | Numeric | CDC (UCI) | Primary health decay indicator |
| `bmi` | Numeric | CDC (UCI) | Obesity-linked chronic risk |
| `hba1c` | Numeric | Augmented | Diabetes severity marker |
| `systolic_bp` | Numeric | Augmented | Cardiovascular risk driver |
| `smoker` | Binary | CDC (UCI) | High-impact mortality factor |
| `heart_disease_hx`| Binary | CDC (UCI) | Genetic risk proxy |

## 4. Training Data & Labeling Methodology
The model is trained on a **Hybrid CDC Dataset** (253,680 records).
### Labeling Rules (Deterministic Source)
The target `risk_tier` is derived using the following linear scoring engine:
- **Score Component** = `(age/10)*0.5 + (bmi-22)*0.3 + (hba1c-5.5)*2.0 + (sbp-120)*0.1 + smoker*2.0 + heart_hx*3.0`
- **Low Risk**: Score < 6
- **Medium Risk**: 6 ≤ Score ≤ 12
- **High Risk**: Score > 12

### Label Leakage Mitigation (Noise Injection)
To prevent the model from becoming a simple lookup table for the rules above, **8% random label noise** was injected into the training set. This forces the model to learn the underlying clinical patterns rather than the exact threshold boundaries.

## 5. Metrics
### Performance
- **F1-Macro**: 0.3145 (Honest baseline on noisy population data)
- **ROC-AUC**: 0.4970

### Calibration (Task 1.2)
- **Expected Calibration Error (ECE)**: **0.0326** (Target: < 0.05)
- **Brier Score**: 0.2242
- **Reliability Diagram**: Available in `calibration_curve.png`

## 6. Caveats & Recommendations
- **Leakage Verified**: A benchmark against the **Medical Cost Personal Datasets (Real Outcomes)** confirmed that while the model achieves 0.99 F1 on synthetic rules, it drops to **0.31 F1** on real-world claim outcomes. This highlights the stochastic nature of real insurance risk.
- **Calibration**: The model uses Isotonic scaling. Probability outputs should be interpreted as "Probability of matching a High/Medium risk profile" rather than absolute claim probability.
- **Fairness**: A bias audit is recommended before deploying to production, specifically regarding income-based filtering.
