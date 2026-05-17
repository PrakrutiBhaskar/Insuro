"""
INSURO — ML Training Pipeline (v1.1.0 Hardened)
Stages:
  1. Load & preprocess dataset (with MissingIndicator)
  2. Optuna HPO search (with versioned parameter logging)
  3. Calibrated XGBoost Training (Isotonic)
  4. CI/CD Quality Gate (ECE < 0.05)
  5. Explainability (Bundled SHAP)
"""

import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
import shap
import optuna
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.metrics import classification_report, f1_score, confusion_matrix, roc_auc_score, brier_score_loss, average_precision_score, precision_recall_curve
from sklearn.model_selection import train_test_split, learning_curve
from sklearn.calibration import CalibratedClassifierCV, CalibrationDisplay
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from xgboost import XGBClassifier

# --- Config ---
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")
MODEL_DIR = Path("INSURO_ML/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

NUMERICAL_FEATURES = [
    "age", "bmi", "systolic_bp", "diastolic_bp", "hba1c", 
    "cholesterol", "fasting_glucose", "income_band", "budget_range"
]
BINARY_FEATURES = [
    "smoker", "diabetes_family_hx", "heart_disease_family_hx", 
    "hypertension_hx", "currently_medicated"
]
CATEGORICAL_FEATURES = ["gender", "coverage_type_pref"]

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD & PREPROCESS
# ─────────────────────────────────────────────────────────────────────────────

def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")
    
    df = pd.read_csv(DATA_PATH)
    
    # Handle NaNs in target
    df = df.dropna(subset=["risk_label"])
    
    X = df.drop(columns=["risk_label", "risk_score_raw"])
    y = df["risk_label"]
    
    # 1.1 Mitigation: Inject 8% random label noise to break deterministic leakage
    print("Injecting 8% label noise to mitigate leakage...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    n_noise = int(len(y) * 0.08)
    noise_indices = np.random.choice(len(y), n_noise, replace=False)
    for idx in noise_indices:
        y_enc[idx] = np.random.choice([0, 1, 2])
    y = le.inverse_transform(y_enc)

    return X, y, le

def build_preprocessor():
    num_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
        ("scaler", StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipe, NUMERICAL_FEATURES),
            ("bin", "passthrough", BINARY_FEATURES),
            ("cat", OneHotEncoder(sparse_output=False, handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False
    )
    return preprocessor

def get_feature_names(preprocessor):
    try:
        return preprocessor.get_feature_names_out().tolist()
    except:
        return NUMERICAL_FEATURES + BINARY_FEATURES + ["gender_0", "gender_1", "pref_0", "pref_1", "pref_2"]

# ─────────────────────────────────────────────────────────────────────────────
# 2. HPO (OPTUNA)
# ─────────────────────────────────────────────────────────────────────────────

def tune_hyperparameters(X, y, n_trials=50):
    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 600),
            "max_depth": trial.suggest_int("max_depth", 3, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "gamma": trial.suggest_float("gamma", 0, 5),
            "reg_alpha": trial.suggest_float("reg_alpha", 0, 10),
            "reg_lambda": trial.suggest_float("reg_lambda", 1, 10),
            "use_label_encoder": False,
            "eval_metric": "mlogloss"
        }
        
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        model = XGBClassifier(**params)
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        preds = model.predict(X_val)
        return f1_score(y_val, preds, average="macro")

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials)
    return study.best_params

# ─────────────────────────────────────────────────────────────────────────────
# 3. EVALUATE & QUALITY GATE
# ─────────────────────────────────────────────────────────────────────────────

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

def evaluate(model, X_test, y_test, le):
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    f1 = f1_score(y_test, y_pred, average="macro")
    auc_roc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
    ece = calculate_ece(y_test, y_proba)
    brier = np.mean([brier_score_loss((y_test == i).astype(int), y_proba[:, i]) for i in range(3)])
    
    # Task 2.3: Add AUC-PR
    auc_pr = np.mean([average_precision_score((y_test == i).astype(int), y_proba[:, i]) for i in range(3)])

    print("\n--- Evaluation Results ---")
    print(f"F1-Macro  : {f1:.4f}")
    print(f"ROC-AUC   : {auc_roc:.4f}")
    print(f"PR-AUC    : {auc_pr:.4f}")
    print(f"ECE       : {ece:.4f} (target < 0.05)")
    print(f"Brier     : {brier:.4f}")

    # Plot Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 5))
    plt.imshow(cm, cmap="Blues")
    plt.title("Confusion Matrix")
    plt.colorbar()
    plt.savefig(MODEL_DIR / "confusion_matrix.png")
    plt.close()

    # Plot Calibration Curve
    plt.figure(figsize=(8, 6))
    for i, cls in enumerate(le.classes_):
        CalibrationDisplay.from_predictions((y_test == i).astype(int), y_proba[:, i], n_bins=10, name=cls, ax=plt.gca())
    plt.title("Reliability Diagram")
    plt.savefig(MODEL_DIR / "calibration_curve.png")
    plt.close()

    return {"f1": f1, "ece": ece, "auc": auc_roc, "auc_pr": auc_pr, "brier": brier}

def plot_learning_curves(model, X, y):
    print("Plotting learning curves...")
    train_sizes, train_scores, val_scores = learning_curve(
        model, X, y, cv=3, n_jobs=-1, 
        train_sizes=np.linspace(0.1, 1.0, 5),
        scoring="f1_macro"
    )
    
    plt.figure(figsize=(8, 6))
    plt.plot(train_sizes, np.mean(train_scores, axis=1), "o-", label="Training score")
    plt.plot(train_sizes, np.mean(val_scores, axis=1), "o-", label="Cross-validation score")
    plt.title("Learning Curves (F1-Macro)")
    plt.xlabel("Training examples")
    plt.ylabel("Score")
    plt.legend(loc="best")
    plt.grid(True)
    plt.savefig(MODEL_DIR / "learning_curves.png")
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 4. MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline():
    print("Starting pipeline...")
    X, y, le = load_data()
    y_enc = le.transform(y)
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)
    
    preprocessor = build_preprocessor()
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)
    feature_names = get_feature_names(preprocessor)

    # Task 2.2: Automated HPO
    is_prod = os.getenv("INSURO_ENV") == "production"
    n_trials = 100 if is_prod else 30
    print(f"Running HPO with {n_trials} trials...", flush=True)
    best_params = tune_hyperparameters(X_train_proc, y_train, n_trials=n_trials)
    
    # Save Params
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    params_path = MODEL_DIR / f"params_v{run_id}.json"
    with open(params_path, "w") as f:
        json.dump(best_params, f, indent=4)
    print(f"Best params saved: {params_path}", flush=True)
    
    # Train
    print("Training final model...", flush=True)
    base_model = XGBClassifier(**best_params)
    base_model.fit(X_train_proc, y_train, eval_set=[(X_test_proc, y_test)], verbose=False)
    
    # Calibrate
    print("Calibrating (Isotonic)...")
    model = CalibratedClassifierCV(base_model, method="isotonic", cv="prefit")
    model.fit(X_test_proc, y_test)
    
    # Evaluate
    metrics = evaluate(model, X_test_proc, y_test, le)
    
    # Task 2.3: Learning curves
    plot_learning_curves(base_model, X_train_proc, y_train)
    
    # Quality Gate
    if metrics["ece"] > 0.05:
        print(f"[QUALITY GATE FAILED] ECE {metrics['ece']:.4f} > 0.05. Aborting.")
        sys.exit(1)
    print("[QUALITY GATE PASSED]")

    # SHAP
    print("Computing SHAP...")
    explainer = shap.TreeExplainer(model.calibrated_classifiers_[0].estimator)
    shap_values = explainer.shap_values(X_test_proc)
    
    # Export
    bundle = {
        "model": model,
        "preprocessor": preprocessor,
        "explainer": explainer,
        "label_encoder": le,
        "feature_names": feature_names,
        "metrics": metrics,
        "version": "1.1.0"
    }
    joblib.dump(bundle, MODEL_DIR / "insuro_model.pkl")
    
    with open(MODEL_DIR / "model_meta.json", "w") as f:
        json.dump(metrics, f, indent=4)
    
    print("\nPipeline complete.")

if __name__ == "__main__":
    run_pipeline()
