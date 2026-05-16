import pandas as pd
import numpy as np
import time
from pathlib import Path
from evidently import Report
from evidently.presets import DataDriftPreset, DataSummaryPreset
import logging

# Configuration
TRAINING_DATA_PATH = Path("INSURO_ML/dataset_real_hybrid.csv")
REPORT_PATH = Path("INSURO_ML/reports/drift_report.html")

logger = logging.getLogger("insuro.monitoring")

class AdvancedMonitor:
    def __init__(self, reference_data_path: str = str(TRAINING_DATA_PATH)):
        self.reference_df = pd.read_csv(reference_data_path)
        self.inference_buffer = []
        self.alert_threshold = 0.25 # Drift score threshold
        
    def log_inference(self, feature_dict: dict, prediction_result: dict, dice_latency: float = 0.0):
        """Logs inference data and operational health metrics."""
        self.inference_buffer.append(feature_dict)
        
        # Operational Health Trace
        if dice_latency > 5.0:
            logger.warning(f"HIGH LATENCY: DiCE took {dice_latency:.2f}s for generation.")
        
        if not prediction_result.get("top_plans"):
            logger.error("DIAGNOSTIC FAILURE: No eligible plans found for user.")
            
    def run_drift_analysis(self):
        """Runs Evidently AI drift analysis across the current buffer."""
        if len(self.inference_buffer) < 50:
            return {"status": "pending", "message": "Insufficient data for drift analysis (min 50 samples)."}
            
        current_df = pd.DataFrame(self.inference_buffer)
        
        # Evidently Report
        report = Report(metrics=[
            DataDriftPreset(),
            DataSummaryPreset()
        ])
        
        print("Running statistical drift analysis...")
        snapshot = report.run(reference_data=self.reference_df, current_data=current_df)
        snapshot.save_html(str(REPORT_PATH))
        
        # Summary for logs
        snapshot_dict = snapshot.dict()
        # Navigate the structure to find drift share
        try:
            # In 0.7.x, metrics are in a list
            # DataDriftPreset usually puts the DataDriftMetric at the start
            drift_share = snapshot_dict['metrics'][0]['result']['drift_share']
        except (KeyError, IndexError):
            drift_share = 0.0
            
        status = "critical" if drift_share > self.alert_threshold else "stable"
        
        logger.info(f"Drift Analysis Complete. Drift Share: {drift_share:.2f}. Status: {status}")
        return {
            "status": status,
            "drift_share": round(drift_share, 4),
            "report_path": str(REPORT_PATH)
        }

# --- Operational Tracer for DiCE Alerting ---
class OperationalTracer:
    @staticmethod
    def trace_dice(func):
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                latency = time.time() - start
                if latency > 10.0: # Hard threshold for DiCE
                    logger.critical(f"DICE_ALERT: Critical latency detected ({latency:.2f}s)")
                return result, latency
            except Exception as e:
                logger.error(f"DICE_FAILURE: {str(e)}")
                return None, time.time() - start
        return wrapper

if __name__ == "__main__":
    print("--- Advanced Monitoring Suite Test ---")
    monitor = AdvancedMonitor()
    
    # Mock some drifted data
    drifted_data = monitor.reference_df.sample(100).copy()
    drifted_data['bmi'] = drifted_data['bmi'] * 1.5 # Significant BMI drift
    
    for _, row in drifted_data.iterrows():
        monitor.log_inference(row.to_dict(), {"top_plans": [1]})
        
    result = monitor.run_drift_analysis()
    print(f"Drift Status: {result['status']} (Share: {result['drift_share']})")
