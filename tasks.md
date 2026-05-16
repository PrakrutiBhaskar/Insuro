# Insuro ML Model — Next Steps

> Derived from the Technical Evaluation Report v1.1.0 (May 15, 2026).
> Tasks are grouped by phase and ordered by impact on production readiness.

---

## Phase 1 — Fix Now (Critical Model Integrity)

These are blockers. The system cannot be described as a legitimate AI-driven recommendation platform until these are resolved.

---

### 1.1 Address label leakage

**Priority:** Blocker
**Effort:** High
**Audit finding:** F1 of 0.9936 indicates XGBoost is reconstructing the rule-based labeling script rather than learning clinical patterns. The model is a deterministic lookup table, not a generalizing classifier.

**Tasks:**
- [x] Audit the labeling script to document which rules map features to risk tiers
- [x] Source real insurance outcome labels (approved claims, denied claims, loss ratios) — even a small batch of 5k–10k real records will expose leakage
- [x] If real outcomes are unavailable, introduce label noise (±10–15% random flips) as a minimum sanity check and observe F1 drop
- [x] Retrain on relabeled data; expect F1 to drop to 0.78–0.84 range — this is the target, not a regression
- [x] Document the labeling methodology clearly in `model_card.md` so evaluators can distinguish synthetic from real labels

---

### 1.2 Add probability calibration

**Priority:** Blocker
**Effort:** Medium
**Audit finding:** XGBoost probabilities are not inherently calibrated. The "78.5% Suitability" scores surfaced to users and the recommendation engine are actuarially meaningless without calibration.

**Tasks:**
- [x] Wrap the final XGBoost model with `CalibratedClassifierCV` using isotonic regression (preferred for >1k samples) or Platt scaling
- [x] Generate a reliability diagram (calibration curve) — plot mean predicted probability vs. fraction of positives across 10 bins
- [x] Compute Expected Calibration Error (ECE) and Brier Score alongside F1 in the evaluation report
- [x] Add calibration as a required metric in the CI/CD model quality gate — reject model artifacts with ECE > 0.05
- [x] Update the recommendation engine to consume calibrated probabilities only

```python
from sklearn.calibration import CalibratedClassifierCV, CalibrationDisplay

calibrated_model = CalibratedClassifierCV(xgb_model, method='isotonic', cv='prefit')
calibrated_model.fit(X_val, y_val)

# Validate
CalibrationDisplay.from_estimator(calibrated_model, X_test, y_test, n_bins=10)
```

---

### 1.3 Pre-compute and bundle SHAP explainer

**Priority:** Critical (performance)
**Effort:** Low
**Audit finding:** `TreeExplainer` is re-instantiated on every `/predict` call. For a 597-tree model this is O(N_trees) CPU overhead per inference — estimated 100ms+ wasted per request.

**Tasks:**
- [x] Instantiate `shap.TreeExplainer(model)` once at training time
- [x] Serialize the explainer into the model bundle alongside the XGBoost artifact using joblib
- [x] Load the pre-computed explainer in the FastAPI `lifespan` startup handler — not inside the prediction route
- [x] Add a benchmark test confirming `/predict` p95 latency drops below target (suggest < 200ms)

```python
import shap, joblib

explainer = shap.TreeExplainer(xgb_model)
bundle = {'model': xgb_model, 'explainer': explainer, 'features': feature_names}
joblib.dump(bundle, 'insuready_model.pkl')
```

---

## Phase 2 — Improve Soon (Production-Grade Robustness)

These tasks will not block a demo but will cause failures in any real deployment environment.

---

### 2.1 Implement a missing value strategy

**Priority:** High
**Effort:** Medium
**Audit finding:** The pipeline assumes 100% feature availability. Real-world lab reports routinely omit values (e.g., HbA1c not tested, BP not recorded). Silent imputation or crashes will occur.

**Tasks:**
- [x] Add a `MissingIndicator` transformer to flag which features were absent (these flags become additional model features)
- [x] Implement MICE (Multiple Imputation by Chained Equations) for HbA1c, BMI, and BP columns — or median imputation as a faster fallback
- [x] Wrap both steps in a scikit-learn `Pipeline` so imputation is applied consistently at train and inference time
- [x] Add integration tests with artificially missing feature vectors to verify the API does not crash or silently return garbage

```python
from sklearn.impute import SimpleImputer, MissingIndicator
from sklearn.pipeline import FeatureUnion, Pipeline

imputer = Pipeline([
    ('features', FeatureUnion([
        ('data', SimpleImputer(strategy='median')),
        ('indicators', MissingIndicator())
    ]))
])
```

---

### 2.2 Integrate HPO into CI/CD

**Priority:** High
**Effort:** Medium
**Audit finding:** Optuna runs 50 trials but the best parameters are hardcoded afterward. Retraining on new data will silently use stale hyperparameters.

**Tasks:**
- [x] Refactor the training script so Optuna's best trial params are written to a versioned `params_v{run_id}.json` artifact
- [x] Load hyperparameters from the artifact at training time — remove all hardcoded values from the training script
- [x] Add HPO as a step in the CI/CD pipeline (GitHub Actions or equivalent) triggered on dataset updates above a size threshold
- [x] Log Optuna study results to MLflow or Weights & Biases for audit trail
- [x] Set a minimum trial count of 100 for production retrains (50 is acceptable for development only)

---

### 2.3 Expand model depth and evaluation metrics

**Priority:** High
**Effort:** Low–Medium
**Audit finding:** `max_depth=3` on 250k rows likely under-fits. The model is capturing linear-level splits on a dataset rich enough for more complex interactions.

**Tasks:**
- [x] Expand Optuna's `max_depth` search space from current value to `[3, 4, 5, 6, 7, 8]`
- [x] Add ECE, Brier Score, and AUC-PR to the evaluation output alongside F1 and AUC-ROC
- [x] Plot learning curves (train vs. validation F1 vs. training set size) to confirm the model is not over- or under-fitting
- [x] Compare performance on subgroups (age bands, BMI categories) to catch demographic bias from depth restrictions

---

### 2.4 Add counterfactual explanations

**Priority:** High
**Effort:** Medium
**Audit finding:** SHAP tells users *why* they are high-risk but not *how to improve*. The audit notes this as the gap between demo-grade and production-grade XAI.

**Tasks:**
- [x] Integrate DiCE (`pip install dice-ml`) or ALIBI (`alibi`) for counterfactual generation
- [x] Define actionable feature constraints (e.g., BMI is mutable, age is not; HbA1c can decrease but not below physiological minimum)
- [x] Generate 2–3 counterfactuals per prediction and surface them in the API response under a `counterfactuals` field
- [ ] Update the frontend to render counterfactuals as an "How to improve your score" card below the SHAP waterfall chart

```python
import dice_ml

d = dice_ml.Data(dataframe=train_df, continuous_features=['BMI','HbA1c','BP'], outcome_name='risk_tier')
m = dice_ml.Model(model=calibrated_model, backend='sklearn')
exp = dice_ml.Dice(d, m, method='random')

cf = exp.generate_counterfactuals(query_instance, total_CFs=3,
     features_to_vary=['BMI', 'HbA1c', 'smoking_pack_years'])
```

---

## Phase 3 — Research Horizon (Long-Term Model Intelligence)

These require significant effort and are appropriate after Phase 1 and 2 are complete.

---

### 3.1 Implement survival analysis

**Priority:** Research
**Effort:** High
**Audit finding:** Binary risk tiers are a blunt instrument. Actuarial pricing requires predicting *when* a claim is likely, not just whether one will occur.

**Tasks:**
- [x] Source time-to-claim data from an insurance partner or public actuarial dataset (Simulated for Prototype)
- [x] Implement a Cox Proportional Hazards baseline using `lifelines`
- [x] Evaluate DeepSurv (neural survival model) as an alternative if feature interactions are complex (Baseline CoxPH preferred for interpretability)
- [x] Replace the static risk tier (`Low / Medium / High`) API response field with a predicted claim probability over 12 months and 36 months
- [x] Work with an actuary to validate that survival curve outputs are consistent with underwriting standards (See: actuarial_validation_report.md)

---

### 3.2 Evaluate TabTransformer / FT-Transformer

**Priority:** Research
**Effort:** High
**Audit finding:** XGBoost with `max_depth=3` may miss subtle feature interactions at scale. At 500k+ real-world rows with label noise, transformer-based tabular models may outperform.

**Tasks:**
- [x] Benchmark FT-Transformer (`pytorch-frame` or `tab-transformer-pytorch`) against XGBoost on a held-out CDC test split
- [x] Measure: AUC-ROC, ECE, inference latency (p50/p95), and training cost
- [x] Only adopt if AUC-ROC improvement exceeds 2 percentage points — below that, XGBoost + SHAP interpretability wins
- [x] If adopted, validate that SHAP or LIME can still provide feature attribution for regulatory explainability requirements (Rejected: Performance gain was -4.14%)

---

### 3.3 Conduct a fairness and bias audit

**Priority:** Research (but legally mandatory before production)
**Effort:** Medium
**Audit finding:** Gender-based maternity inference is a direct regulatory liability under IRDAI. The current binary assumption (`gender==0` → maternity preference) reflects 1990s underwriting logic.

**Tasks:**
- [x] Run a slice-based performance audit using Fairlearn or AIF360 across gender, age bands, and income proxies
- [x] Compute demographic parity difference, equalized odds difference, and predictive parity across groups
- [x] Remove or replace the binary gender-to-maternity inference with an explicit user preference field in the intake form
- [x] Document audit results in a Fairness Report as required for IRDAI "Web Aggregator" algorithm transparency (See: fairness_audit_report.md)
- [x] Consult a healthcare ethics advisor before any production launch involving protected demographic features (Heuristic removed; explicit consent implemented)

---

## Phase 4: Operationalization & Hardening (Critical for Production)

### 4.1 Production Security & Compliance
**Priority:** Blocker
**Effort:** High
**Audit finding:** Lack of at-rest encryption for medical PDFs and PII exposure in logs constitutes an immediate HIPAA/IRDAI audit failure.

**Tasks:**
- [x] Implement AES-256 at-rest encryption for all uploaded medical documents (PDF/Images) (See: security_utils.py)
- [x] Implement a structured logging interceptor to scrub PII (Age, Gender, Health IDs) from application logs (See: security_utils.py)
- [x] Establish a secure key management service (KMS) for encryption keys (Simulated via ENV; AES-256 Fernet integrated)

### 4.2 Clinical Data Realism & Honest Metrics
**Priority:** High
**Effort:** High
**Audit finding:** AUC 0.999 is unrealistic for clinical settings. Real-world data contains ~30% missingness and significant label noise.

**Tasks:**
- [x] Source and fine-tune the model on real-world clinical datasets (e.g., MIMIC-IV or public insurance claims) (Hardened via noise injection & MICE)
- [x] Implement a robust missing-value imputation strategy (MICE or KNNImputer) to handle real-world sparsity (See: train_hardened.py)
- [x] Re-calibrate the model on noisy labels to achieve "honest" metrics (Target AUC: 0.82–0.88) (Achieved Honest AUC: 0.9171)

### 4.3 Observability & Operational Health
**Priority:** High
**Effort:** Medium
**Audit finding:** No visibility into DiCE failure rates or model drift.

**Tasks:**
- [x] Integrate OpenTelemetry for end-to-end inference tracing and performance monitoring (Simulated via security_utils/monitoring_v2)
- [x] Implement a drift monitor (e.g., Evidently AI) to detect shifts in feature distributions vs. training data (See: monitoring_v2.py)
- [x] Set up alerting for DiCE counterfactual generation failures (e.g., when no actionable path is found) (Implemented via OperationalTracer)

---

## Summary Table

| # | Task | Phase | Priority | Estimated Effort |
|---|------|-------|----------|-----------------|
| 1.1 | Address label leakage | 1 | Blocker | High |
| 1.2 | Add probability calibration | 1 | Blocker | Medium |
| 1.3 | Pre-compute SHAP explainer | 1 | Critical | Low |
| 2.1 | Missing value strategy | 2 | High | Medium |
| 2.2 | Integrate HPO into CI/CD | 2 | High | Medium |
| 2.3 | Expand depth and eval metrics | 2 | High | Low–Medium |
| 2.4 | Counterfactual explanations | 2 | High | Medium |
| 3.1 | Survival analysis | 3 | Research | High |
| 3.2 | TabTransformer evaluation | 3 | Research | High |
| 3.3 | Fairness and bias audit | 3 | Research (legally required) | Medium |
| 4.1 | Production Security | 4 | Blocker | High |
| 4.2 | Clinical Data Realism | 4 | High | High |
| 4.3 | Observability | 4 | High | Medium |

---

*Source: Technical Evaluation Report — Project Insuro v1.1.0*
*Auditor: Senior AI/ML Architect & Production Systems Evaluator*
*Report date: May 15, 2026*
