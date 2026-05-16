import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")
MODEL_EXPORT_PATH = Path("INSURO_ML/models/hardened_model.pkl")

def train_hardened_model():
    print("--- Phase 4.2: Hardening Model with Clinical Noise ---")
    df = pd.read_csv(DATA_PATH)
    
    # 1. Inject Real-World Noise
    print("Injecting 30% missingness and 10% label noise...")
    clinical_cols = ["bmi", "hba1c", "cholesterol", "systolic_bp", "diastolic_bp", "fasting_glucose"]
    for col in clinical_cols:
        mask = np.random.rand(len(df)) < 0.30
        df.loc[mask, col] = np.nan
        
    # Inject Label Noise (Flip 10% of labels randomly)
    noise_mask = np.random.rand(len(df)) < 0.10
    df.loc[noise_mask, "risk_label"] = np.random.choice(["Low", "Medium", "High"], size=noise_mask.sum())
    
    # 2. Preprocessing & Imputation (MICE)
    cat_features = [
        "smoker", "gender", "income_band", "hypertension_hx", 
        "diabetes_family_hx", "heart_disease_family_hx", "currently_medicated"
    ]
    cont_features = clinical_cols + ["age"]
    target_col = "risk_label"
    
    le = LabelEncoder()
    y = le.fit_transform(df[target_col])
    X = df.drop(columns=[target_col, "risk_score_raw"])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # MICE Imputer for clinical indicators
    imputer = IterativeImputer(max_iter=10, random_state=42)
    
    # Pipeline components
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", imputer), ("scaler", StandardScaler())]), cont_features),
            ("cat", "passthrough", cat_features)
        ]
    )
    
    # 3. Training
    print("Training XGBoost on noisy data...")
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=4, # Slightly deeper to handle noise
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", xgb)
    ])
    
    pipeline.fit(X_train, y_train)
    
    # 4. Evaluation (Honest Metrics)
    y_probs = pipeline.predict_proba(X_test)
    y_pred = pipeline.predict(X_test)
    
    auc = roc_auc_score(y_test, y_probs, multi_class="ovr")
    print(f"\n[HONEST METRICS]")
    print(f"ROC-AUC: {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # 5. Export
    bundle = {
        "model": pipeline.named_steps["model"],
        "preprocessor": pipeline.named_steps["preprocessor"],
        "label_encoder": le,
        "version": "1.3.0-hardened",
        "description": "Hardened clinical model with MICE imputation and noise tolerance."
    }
    MODEL_EXPORT_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(bundle, MODEL_EXPORT_PATH)
    print(f"\nHardened model saved to {MODEL_EXPORT_PATH}")

if __name__ == "__main__":
    train_hardened_model()
