import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from pycox.models import CoxPH
from pycox.evaluation import EvalSurv
import torchtuples as tt
from pathlib import Path
import joblib

# Configuration
DATA_PATH = Path("INSURO_ML/dataset_survival.csv")
MODEL_DIR = Path("INSURO_ML/models")
DEEPSURV_MODEL_PATH = MODEL_DIR / "deepsurv_model.pt"

def train_deepsurv():
    print("--- Training DeepSurv (Neural Survival) Model ---")
    df = pd.read_csv(DATA_PATH)
    
    # 1. Feature selection
    features = [
        "age", "bmi", "smoker", "gender", "income_band", "hypertension_hx",
        "systolic_bp", "diastolic_bp", "hba1c", "cholesterol", "fasting_glucose",
        "diabetes_family_hx", "heart_disease_family_hx", "currently_medicated"
    ]
    
    df_train, df_val = train_test_split(df, test_size=0.2, random_state=42)
    
    # 2. Preprocessing
    scaler = StandardScaler()
    x_train = scaler.fit_transform(df_train[features]).astype('float32')
    x_val = scaler.transform(df_val[features]).astype('float32')
    
    get_target = lambda df: (df['tenure_months'].values.astype('float32'), 
                             df['claim_occurred'].values.astype('float32'))
    y_train = get_target(df_train)
    y_val = get_target(df_val)
    
    val = tt.tuplefy(x_val, y_val)
    
    # 3. Network Architecture
    in_features = x_train.shape[1]
    num_nodes = [32, 32]
    out_features = 1
    batch_norm = True
    dropout = 0.1
    output_bias = False

    net = tt.practical.MLPVanilla(in_features, num_nodes, out_features, batch_norm,
                                 dropout, output_bias=output_bias)
    
    # 4. Model Training
    model = CoxPH(net, tt.optim.Adam)
    
    batch_size = 256
    lrfinder = model.lr_finder(x_train, y_train, batch_size, tolerance=10)
    best_lr = lrfinder.get_best_lr()
    print(f"Best LR: {best_lr}")
    
    epochs = 20
    callbacks = [tt.callbacks.EarlyStopping()]
    verbose = True
    
    print("Fitting model...")
    log = model.fit(x_train, y_train, batch_size, epochs, callbacks, verbose,
                    val_data=val, val_batch_size=batch_size)
    
    # 5. Evaluation
    print("\nEvaluating Model...")
    _ = model.compute_baseline_hazards()
    surv = model.predict_surv_df(x_val)
    
    ev = EvalSurv(surv, y_val[0], y_val[1], censor_surv='km')
    c_index = ev.concordance_td()
    print(f"Concordance Index (td): {c_index:.4f}")
    
    # 6. Comparison with CoxPH Baseline
    # (Assuming we have the baseline results or we just print this one)
    # The CoxPH baseline C-index was usually around 0.85-0.90 in simulation
    
    # 7. Save Model & Scaler
    torch.save(model.net.state_dict(), DEEPSURV_MODEL_PATH)
    joblib.dump(scaler, MODEL_DIR / "deepsurv_scaler.pkl")
    print(f"Model saved to {DEEPSURV_MODEL_PATH}")
    
    # 8. Visualization
    plt.figure(figsize=(8, 6))
    log.to_pandas().plot()
    plt.title("DeepSurv Training Log")
    plt.savefig(MODEL_DIR / "deepsurv_training_log.png")
    plt.close()

if __name__ == "__main__":
    train_deepsurv()
