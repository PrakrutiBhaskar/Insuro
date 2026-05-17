# 2-Minute Demo Script: Insuro (Priya Sharma Case)

## 0. Preparation
1. Run `python seed_db.py` to ensure the catalogue is live.
2. Run `python warmup.py` to pre-load ML models.
3. Open browser to `http://localhost:5173`.

## 1. The Intake (0:00 – 0:30)
- **Action**: Click "Try Demo" or Login as `admin/admin123`.
- **Narration**: "Welcome to Insuro. We're looking at Priya Sharma, a 35-year-old with a family history of diabetes."
- **Action**: Go to Step 4 (Upload). Drag & Drop `Priya_Sharma_Lab_Report.pdf`.
- **Narration**: "Instead of manual entry, our Bio_ClinicalBERT service parses her lab report. It's detected an HbA1c of 6.1 and elevated cholesterol, which are now encrypted at-rest with AES-256."

## 2. The Analysis (0:30 – 1:00)
- **Action**: Click "Generate Recommendations".
- **Narration**: "The system now runs three models: an XGBoost classifier for risk, a SHAP engine for transparency, and a Cox survival model for claim trajectory."
- **Action**: Scroll to the "Risk Profile Summary" at the top.
- **Narration**: "Priya is placed in the Medium-High risk tier. Notice the SHAP trace below: it explicitly shows how her family history and pre-diabetic HbA1c increased her risk score."

## 3. Personalization & Trust (1:00 – 1:30)
- **Action**: Open the SHAP "Model Trace" on the #1 ranked plan.
- **Narration**: "For transparency, we show the exact feature attributions. We aren't just matching keywords; we're matching the clinical vector of the user to the feature vector of the insurance policy."
- **Action**: Adjust the **Affordability Simulator** slider to ₹4,000.
- **Narration**: "If Priya's budget changes, we can re-simulate the rankings instantly. Suitability isn't static."

## 4. Selection & Compliance (1:30 – 2:00)
- **Action**: Select 3 plans and go to the "Compare" tab.
- **Narration**: "Finally, we provide a side-by-side matrix of up to 3 plans, covering Health, Life, and Critical Illness."
- **Action**: Scroll to the bottom and click "Purge My Health Data".
- **Narration**: "And for GDPR/IRDAI compliance, the user has a 'Right to be Forgotten'. One click purges all sensitive clinical data from our session."

---
**Tip**: If the AI Guide chatbot asks a question, ignore it to save time, or ask "What is HbA1c?" for a quick AI delighter.
