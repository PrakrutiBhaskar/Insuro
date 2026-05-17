import numpy as np
import pandas as pd

def calculate_psi(expected, actual, buckets=10):
    """
    Calculate the Population Stability Index (PSI) between two distributions.
    
    Parameters:
    -----------
    expected : np.ndarray
        The reference/training distribution.
    actual : np.ndarray
        The current/inference distribution.
    buckets : int
        Number of buckets to use for discretization.
        
    Returns:
    --------
    float
        The PSI value. ( < 0.1: No change, 0.1-0.25: Slight change, > 0.25: Significant change)
    """
    def scale_range(data, min_val, max_val):
        return (data - min_val) / (max_val - min_val)

    min_val = min(expected.min(), actual.min())
    max_val = max(expected.max(), actual.max())
    
    expected_percents = np.histogram(expected, bins=buckets, range=(min_val, max_val))[0] / len(expected)
    actual_percents = np.histogram(actual, bins=buckets, range=(min_val, max_val))[0] / len(actual)
    
    # Avoid division by zero
    expected_percents = np.clip(expected_percents, 0.0001, 1.0)
    actual_percents = np.clip(actual_percents, 0.0001, 1.0)
    
    psi_value = np.sum((expected_percents - actual_percents) * np.log(expected_percents / actual_percents))
    
    return psi_value

class ModelMonitor:
    _cache = {}

    def __init__(self, training_data_path: str):
        self.path = training_data_path
        if training_data_path not in ModelMonitor._cache:
            print(f"Loading and caching training data from {training_data_path}...")
            ModelMonitor._cache[training_data_path] = pd.read_csv(training_data_path)
        
        self.training_df = ModelMonitor._cache[training_data_path]
        self.inference_log = []
        
    def log_inference(self, feature_vector: dict):
        self.inference_log.append(feature_vector)
        
    def check_drift(self, feature_name: str) -> dict:
        """Checks drift for a specific numerical feature."""
        if feature_name not in self.training_df.columns:
            return {"status": "error", "message": f"Feature {feature_name} not found in training data."}
            
        if not self.inference_log:
            return {"status": "warning", "message": "No inference data logged yet."}
            
        actual_df = pd.DataFrame(self.inference_log)
        if feature_name not in actual_df.columns:
             return {"status": "error", "message": f"Feature {feature_name} not found in inference logs."}
             
        psi = calculate_psi(self.training_df[feature_name].values, actual_df[feature_name].values)
        
        status = "stable"
        if psi > 0.25:
            status = "critical_drift"
        elif psi > 0.1:
            status = "warning_drift"
            
        return {
            "feature": feature_name,
            "psi": round(psi, 4),
            "status": status,
            "sample_count": len(self.inference_log)
        }

if __name__ == "__main__":
    # Example usage
    print("--- INSURO Drift Monitoring Test ---")
    # Mock data
    train = np.random.normal(0, 1, 1000)
    infer = np.random.normal(0.2, 1.1, 100) # Slight drift
    
    psi = calculate_psi(train, infer)
    print(f"Calculated PSI: {psi:.4f}")
    if psi < 0.1:
        print("Status: Stable")
    elif psi < 0.25:
        print("Status: Warning (Slight Drift)")
    else:
        print("Status: Critical (Significant Drift)")
