import joblib
import os

MODEL_PATH = "INSURO_ML/models/insuro_model.pkl"
if os.path.exists(MODEL_PATH):
    bundle = joblib.load(MODEL_PATH)
    print(f"Bundle keys: {list(bundle.keys())}")
    if 'preprocessor' in bundle:
        try:
            # Check feature names if it's a ColumnTransformer
            pre = bundle['preprocessor']
            print(f"Preprocessor type: {type(pre)}")
            if hasattr(pre, 'get_feature_names_out'):
                print(f"Feature names out: {pre.get_feature_names_out()[:5]}...")
        except Exception as e:
            print(f"Error inspecting preprocessor: {e}")
else:
    print("Model not found!")
