import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import classification_report, f1_score
from sklearn.preprocessing import LabelEncoder
import os

def verify():
    # 1. Load Real Outcome Data
    path = "INSURO_ML/data/real_insurance_outcomes.csv"
    if not os.path.exists(path):
        print("Error: Real outcome data not found.")
        return
    
    df_real = pd.read_csv(path)
    
    # 2. Derive Risk Tiers from Real Charges (Outcome)
    # This is "Real" because charges reflect actual claim history
    q_low = df_real['charges'].quantile(0.4)
    q_med = df_real['charges'].quantile(0.8)
    
    def map_tier(c):
        if c < q_low: return "Low"
        if c < q_med: return "Medium"
        return "High"
    
    df_real['risk_tier_real'] = df_real['charges'].apply(map_tier)
    
    # 3. Align features for prediction
    # Real data columns: age, sex, bmi, children, smoker, region, charges
    # Our model needs: age, bmi, systolic_bp, diastolic_bp, hba1c, cholesterol, fasting_glucose, 
    # smoker, diabetes_family_hx, heart_disease_family_hx, hypertension_hx, 
    # currently_medicated, gender, coverage_type_pref
    
    # We will "impute" the missing clinical features for these 1,338 records 
    # using our established clinical correlations to see if the model can predict the REAL outcome.
    
    df_test = pd.DataFrame()
    df_test['age'] = df_real['age']
    df_test['bmi'] = df_real['bmi']
    df_test['smoker'] = (df_real['smoker'] == 'yes').astype(int)
    df_test['gender'] = (df_real['sex'] == 'male').astype(int)
    
    # Impute clinicals based on age/bmi/smoker (to maintain internal validity)
    df_test['systolic_bp'] = 120 + (df_test['age'] * 0.5) + (df_test['bmi'] * 0.2) + (df_test['smoker'] * 10)
    df_test['diastolic_bp'] = 80 + (df_test['age'] * 0.2)
    df_test['hba1c'] = 5.0 + (df_test['bmi'] * 0.05) + (df_test['smoker'] * 0.5)
    df_test['cholesterol'] = 180 + (df_test['age'] * 1.0) + (df_test['bmi'] * 1.0)
    df_test['fasting_glucose'] = 90 + (df_test['bmi'] * 0.5)
    df_test['income_band'] = 3
    df_test['budget_range'] = 3000
    df_test['diabetes_family_hx'] = 0
    df_test['heart_disease_family_hx'] = 0
    df_test['hypertension_hx'] = 0
    df_test['currently_medicated'] = 0
    df_test['coverage_type_pref'] = 0
    
    # 4. Load Model and Predict
    bundle = joblib.load("INSURO_ML/models/insuready_model.pkl")
    model = bundle['model']
    preprocessor = bundle['preprocessor']
    le = bundle['label_encoder']
    
    X_proc = preprocessor.transform(df_test)
    y_pred = model.predict(X_proc)
    y_pred_labels = le.inverse_transform(y_pred)
    
    # 5. Compare with Real Tiers
    print("\n--- Leakage Exposure: Model vs Real Outcomes ---")
    print("This test evaluates if a model trained on deterministic rules can predict REAL claim outcomes.")
    print(classification_report(df_real['risk_tier_real'], y_pred_labels))
    
    f1 = f1_score(df_real['risk_tier_real'], y_pred_labels, average='macro')
    print(f"Final F1-Macro on Real Data: {f1:.4f}")
    print("\nObservation: If this F1 is significantly lower than the training F1 (0.99), it confirms")
    print("that the training labels were leaked deterministic rules, not generalizable clinical intelligence.")

if __name__ == "__main__":
    verify()
