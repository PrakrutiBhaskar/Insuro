import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
from tab_transformer_pytorch import TabTransformer
from xgboost import XGBClassifier
import time
from pathlib import Path

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")

def run_benchmark():
    print("--- Quick Benchmark: TabTransformer vs XGBoost ---")
    # Using 10k rows for a very fast benchmark
    df_raw = pd.read_csv(DATA_PATH, nrows=10000)
    
    cat_features = [
        "smoker", "gender", "income_band", "hypertension_hx", 
        "diabetes_family_hx", "heart_disease_family_hx", "currently_medicated", "coverage_type_pref"
    ]
    cont_features = [
        "age", "bmi", "systolic_bp", "diastolic_bp", "hba1c", "cholesterol", "fasting_glucose", "budget_range"
    ]
    target_col = "risk_label"
    
    # Preprocessing
    le = LabelEncoder()
    df_raw[target_col] = le.fit_transform(df_raw[target_col])
    
    df = df_raw.copy()
    cat_dims = []
    for col in cat_features:
        le_cat = LabelEncoder()
        df[col] = le_cat.fit_transform(df[col])
        cat_dims.append(df[col].nunique())
    
    scaler = StandardScaler()
    df[cont_features] = scaler.fit_transform(df[cont_features])
    
    df_train, df_test = train_test_split(df, test_size=0.2, random_state=42)
    
    # --- 1. XGBoost Baseline ---
    print("\n[1/2] Training XGBoost Baseline...")
    xgb = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    start_xgb = time.time()
    xgb.fit(df_train[cat_features + cont_features], df_train[target_col])
    xgb_train_time = time.time() - start_xgb
    
    start_xgb_inf = time.time()
    xgb_probs = xgb.predict_proba(df_test[cat_features + cont_features])
    xgb_inf_time = (time.time() - start_xgb_inf) / len(df_test) * 1000
    xgb_auc = roc_auc_score(df_test[target_col], xgb_probs, multi_class='ovr')
    
    # --- 2. TabTransformer ---
    print("\n[2/2] Training TabTransformer...")
    x_cat_train = torch.tensor(df_train[cat_features].values).long()
    x_cont_train = torch.tensor(df_train[cont_features].values).float()
    y_train = torch.tensor(df_train[target_col].values).long()
    
    x_cat_test = torch.tensor(df_test[cat_features].values).long()
    x_cont_test = torch.tensor(df_test[cont_features].values).float()
    y_test = torch.tensor(df_test[target_col].values).long()
    
    model = TabTransformer(
        categories = tuple(cat_dims),
        num_continuous = len(cont_features),
        dim = 16, # Reduced dimension for speed
        dim_out = 3, depth = 3, heads = 4, # Reduced depth/heads
        attn_dropout = 0.1, ff_dropout = 0.1,
        mlp_hidden_mults = (2, 1), mlp_act = nn.ReLU()
    )
    
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()
    
    start_tab = time.time()
    batch_size = 256
    epochs = 3 # Reduced epochs for benchmark
    for epoch in range(epochs):
        model.train()
        permutation = torch.randperm(x_cat_train.size(0))
        for i in range(0, x_cat_train.size(0), batch_size):
            indices = permutation[i:i+batch_size]
            batch_cat, batch_cont, batch_y = x_cat_train[indices], x_cont_train[indices], y_train[indices]
            logits = model(batch_cat, batch_cont)
            loss = loss_fn(logits, batch_y)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        print(f"Epoch {epoch+1}/{epochs} done.")
            
    tab_train_time = time.time() - start_tab
    
    model.eval()
    with torch.no_grad():
        start_tab_inf = time.time()
        tab_logits = model(x_cat_test, x_cont_test)
        tab_inf_time = (time.time() - start_tab_inf) / len(x_cat_test) * 1000
        tab_probs = torch.softmax(tab_logits, dim=1).numpy()
    tab_auc = roc_auc_score(y_test.numpy(), tab_probs, multi_class='ovr')
    
    # --- Final Summary ---
    print("\n" + "="*40)
    print(f"{'Metric':<20} | {'XGBoost':<10} | {'TabTrans':<10}")
    print("-" * 45)
    print(f"{'AUC-ROC':<20} | {xgb_auc:<10.4f} | {tab_auc:<10.4f}")
    print(f"{'Train Time (s)':<20} | {xgb_train_time:<10.2f} | {tab_train_time:<10.2f}")
    print(f"{'Inf Latency (ms)':<20} | {xgb_inf_time:<10.4f} | {tab_inf_time:<10.4f}")
    print("="*40)
    
    diff = tab_auc - xgb_auc
    print(f"\nFinal Verdict:")
    if diff > 0.02:
        print(f"ADOPT: Gain of {diff*100:.2f}% justifies complexity.")
    else:
        print(f"REJECT: Gain of {diff*100:.2f}% is below 2.00% threshold. XGBoost wins.")

if __name__ == "__main__":
    run_benchmark()
