"""
INSURO ML — Plan Suitability Scorer
---------------------------------------
Combines hard eligibility filtering with cosine-similarity
scoring against a user feature vector.

Usage:
    from scorer import PlanScorer
    scorer = PlanScorer()
    results = scorer.score(predict_response, user_input)
"""

import json
import math
import os
from typing import Optional

CATALOGUE_PATH = os.path.join(os.path.dirname(__file__), "plans_catalogue.json")

# ── Tag vector index → feature meaning ────────────────────────────────────────
# [0] hospitalization  [1] pre_existing_cover  [2] maternity
# [3] dental           [4] vision              [5] critical_illness
# [6] mental_health    [7] teleconsultation    [8] chronic_flag
# [9] family_floater
# ──────────────────────────────────────────────────────────────────────────────


def _build_user_vector(user_input: dict, risk_label: str) -> list[float]:
    """
    Build a 10-dim preference vector from user health input.
    All dims stay in [0, 1] — higher means more important/needed.
    """
    smoker       = int(user_input.get("smoker", 0))
    diab_hx      = int(user_input.get("diabetes_family_hx", 0))
    heart_hx     = int(user_input.get("heart_disease_family_hx", 0))
    hypert_hx    = int(user_input.get("hypertension_hx", 0))
    medicated    = int(user_input.get("currently_medicated", 0))
    hba1c        = float(user_input.get("hba1c") if user_input.get("hba1c") is not None else 5.0)
    cholesterol  = float(user_input.get("cholesterol") if user_input.get("cholesterol") is not None else 180)
    bmi          = float(user_input.get("bmi") if user_input.get("bmi") is not None else 22)
    age          = int(user_input.get("age") if user_input.get("age") is not None else 30)

    chronic_flag = 1.0 if (medicated or hypert_hx or hba1c > 6.4 or cholesterol > 240) else 0.5 if (diab_hx or heart_hx) else 0.0
    family_need  = 1.0 if user_input.get("coverage_type_pref", 0) == 2 else 0.0

    # Maternity signal: explicit preference
    maternity_want = 1.0 if user_input.get("wants_maternity", False) else 0.0

    # Critical illness signal scales with risk
    ci_need = {"Low": 0.1, "Medium": 0.5, "High": 1.0}.get(risk_label, 0.3)

    # Mental health signal
    mh_need = 0.6 if (smoker or chronic_flag > 0 or risk_label == "High") else 0.2

    return [
        1.0,                # [0] hospitalization — always needed
        chronic_flag,       # [1] pre-existing cover need
        maternity_want,     # [2] maternity
        0.3,                # [3] dental — mild generic preference
        0.3,                # [4] vision — mild generic preference
        ci_need,            # [5] critical illness
        mh_need,            # [6] mental health
        1.0,                # [7] teleconsultation — always preferred
        chronic_flag,       # [8] chronic condition compatibility
        family_need,        # [9] family floater preference
    ]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x ** 2 for x in a))
    mag_b = math.sqrt(sum(x ** 2 for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _budget_score(plan: dict, budget_inr: float) -> float:
    """Returns 1.0 if well within budget, scales down toward 0 as it approaches limit."""
    annual = plan["annual_premium_inr"]
    if budget_inr <= 0:
        return 0.5
    ratio = annual / budget_inr
    if ratio <= 0.7:
        return 1.0
    elif ratio <= 1.0:
        return 1.0 - (ratio - 0.7) / 0.3 * 0.4   # 1.0 -> 0.6
    elif ratio <= 1.5:
        return 0.6 - (ratio - 1.0) / 0.5 * 0.6   # 0.6 -> 0.0 (Near match)
    else:
        return 0.0


def _passes_hard_filters(plan: dict, user_input: dict, risk_label: str, allow_budget_overage: bool = False) -> tuple[bool, str]:
    """
    Returns (passes: bool, reason: str).
    Hard filters remove plans that are categorically wrong, not just suboptimal.
    """
    sf = plan["suitable_for"]
    age    = user_input.get("age") if user_input.get("age") is not None else 30
    bmi    = user_input.get("bmi") if user_input.get("bmi") is not None else 22
    smoker = user_input.get("smoker") if user_input.get("smoker") is not None else 0
    income = user_input.get("income_band") if user_input.get("income_band") is not None else 1
    budget = (user_input.get("budget_range") if user_input.get("budget_range") is not None else 5000) * 12
    medicated   = user_input.get("currently_medicated") if user_input.get("currently_medicated") is not None else 0
    hypert_hx   = user_input.get("hypertension_hx") if user_input.get("hypertension_hx") is not None else 0
    hba1c       = user_input.get("hba1c") if user_input.get("hba1c") is not None else 5.0
    cholesterol = user_input.get("cholesterol") if user_input.get("cholesterol") is not None else 180

    has_chronic = bool(medicated or hypert_hx or hba1c > 6.4 or cholesterol > 240)

    # Risk label must match
    if risk_label not in sf["risk_labels"]:
        return False, f"Risk tier mismatch (plan: {sf['risk_labels']}, user: {risk_label})"

    # Age range
    if not (sf["min_age"] <= age <= sf["max_age"]):
        return False, f"Age {age} outside plan range {sf['min_age']}–{sf['max_age']}"

    # BMI ceiling (insurer underwriting cutoff)
    if bmi > sf["max_bmi"]:
        return False, f"BMI {bmi:.1f} exceeds plan max {sf['max_bmi']}"

    # Smoker eligibility
    if smoker and not sf["smoker_ok"]:
        return False, "Plan does not cover smokers"

    # Chronic condition cover check
    if has_chronic and not sf["chronic_conditions_ok"]:
        return False, "Plan does not cover pre-existing/chronic conditions"

    # Income band (proxy for ability to pay premiums long-term)
    # Relax this in the second pass if allow_budget_overage is True
    min_income = sf["min_income_band"] if not allow_budget_overage else max(1, sf["min_income_band"] - 1)
    if income < min_income:
        return False, f"Income band {income} below plan minimum {sf['min_income_band']}"

    # Budget — allow 20% overage by default, or 50% if allowed
    multiplier = 1.50 if allow_budget_overage else 1.20
    if plan["annual_premium_inr"] > budget * multiplier:
        diff = plan["annual_premium_inr"] - budget
        return False, f"Premium exceeds budget by ₹{diff//12:,}/mo"

    return True, "ok"


def _explain_plan(plan: dict, user_input: dict, scores: dict) -> str:
    """Generate a human-readable suitability explanation."""
    reasons = []
    feats = plan["features"]
    budget = user_input.get("budget_range", 5000) * 12
    premium = plan["annual_premium_inr"]

    if premium > budget:
        diff = (premium - budget) // 12
        reasons.append(f"premium is ₹{diff:,}/mo above your target budget")

    if feats.get("pre_existing_disease_cover"):
        wait = feats.get("pre_existing_waiting_years")
        reasons.append(f"covers pre-existing conditions after {wait}-year waiting period")

    if feats.get("critical_illness"):
        reasons.append("includes critical illness benefit")

    if feats.get("no_claim_bonus_pct", 0) >= 30:
        reasons.append(f"generous {feats['no_claim_bonus_pct']}% no-claim bonus")

    if feats.get("copay_pct", 0) == 0:
        reasons.append("zero co-payment")

    if feats.get("teleconsultation"):
        reasons.append("unlimited teleconsultation")

    # Use clinical expansion features for explanation if provided
    if user_input.get("prior_hosp_count", 0) > 0:
        reasons.append(f"tailored for users with prior hospitalization history")
    
    if user_input.get("smoking_pack_years", 0) > 20:
        reasons.append(f"enhanced critical illness cover for heavy smoking history")

    if not reasons:
        reasons.append("solid hospitalization and cashless network")

    similarity = scores["coverage_match"]
    score_text = (
        "Excellent match" if similarity >= 0.90
        else "Strong match" if similarity >= 0.80
        else "Good match" if similarity >= 0.70
        else "Moderate match"
    )
    return f"{score_text} — {'; '.join(reasons[:3])}."


class PlanScorer:
    def __init__(self, catalogue_path: str = CATALOGUE_PATH):
        self._plans = []
        self._load_plans(catalogue_path)

    def _load_plans(self, catalogue_path):
        # Try loading from DB first
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            try:
                if db_url.startswith("sqlite"):
                    import sqlite3
                    conn = sqlite3.connect(db_url.replace("sqlite:///", ""))
                    conn.row_factory = lambda cursor, row: dict(zip([col[0] for col in cursor.description], row))
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM insurance_plans")
                    db_plans = cur.fetchall()
                    for p in db_plans:
                        p["monthly_premium_inr"] = int(p["price"])
                        p["annual_premium_inr"] = int(p["price"] * 12)
                        p["sum_insured_inr"] = int(p["sum_insured"])
                        p["tag_vector"] = json.loads(p["plan_vector"])
                        p["features"] = json.loads(p["features"])
                        p["suitable_for"] = json.loads(p["suitable_for"])
                    self._plans = db_plans
                    print(f"Loaded {len(self._plans)} plans from SQLite.")
                    conn.close()
                    return
                else:
                    # Postgres path... (omitted for brevity but kept in original)
                    import psycopg2
                    from psycopg2.extras import RealDictCursor
                    conn = psycopg2.connect(db_url)
                    cur = conn.cursor(cursor_factory=RealDictCursor)
                    cur.execute("SELECT * FROM insurance_plans")
                    db_plans = cur.fetchall()
                    for p in db_plans:
                        p["monthly_premium_inr"] = int(p["price"])
                        p["tag_vector"] = p["plan_vector"]
                    self._plans = db_plans
                    print(f"Loaded {len(self._plans)} plans from PostgreSQL.")
                    conn.close()
                    return
            except Exception as e:
                print(f"DB Load failed, falling back to JSON: {e}")

        # Fallback to JSON
        with open(catalogue_path, "r") as f:
            self._plans = json.load(f)
            print(f"Loaded {len(self._plans)} plans from local JSON.")

    def score(
        self,
        predict_response: dict,
        user_input: dict,
        top_n: int = 5,
    ) -> dict:
        """
        Parameters
        ----------
        predict_response : dict
            Full JSON body from /predict endpoint.
        user_input : dict
            Original user health fields sent to /predict.
        top_n : int
            How many plans to return (default 5).

        Returns
        -------
        dict with keys: risk_label, risk_score, eligible_count,
                        top_plans (list), filters_applied (list)
        """
        risk_label = predict_response.get("risk_label", "Medium")
        risk_score = predict_response.get("risk_score", 0.5)
        user_vector = _build_user_vector(user_input, risk_label)
        budget_annual = user_input.get("budget_range", 5000) * 12

        scored = []
        rejected = []

        # Try with strict budget first, then relax if no results
        for allow_overage in [False, True]:
            for plan in self._plans:
                # Skip if already scored
                if any(p["plan_id"] == plan["plan_id"] for p in scored):
                    continue

                passes, reason = _passes_hard_filters(plan, user_input, risk_label, allow_budget_overage=allow_overage)
                if not passes:
                    if not allow_overage: # Only record rejection reason on first pass
                        rejected.append({"plan_id": plan["plan_id"], "reason": reason})
                    continue

                sim = _cosine_similarity(user_vector, plan["tag_vector"])
                bscore = _budget_score(plan, budget_annual)
                
                # Decomposed scores
                score_breakdown = {
                    "coverage_match": round(sim, 4),
                    "budget_fit":     round(bscore, 4),
                    "tier_alignment": 1.0 if plan["tier"] == risk_label.lower() else 0.5
                }
                
                combined = 0.60 * sim + 0.30 * bscore + 0.10 * score_breakdown["tier_alignment"]

                scored.append({
                    "plan_id":          plan["plan_id"],
                    "name":             plan["name"],
                    "insurer":          plan["insurer"],
                    "tier":             plan["tier"],
                    "coverage_type":    plan["coverage_type"],
                    "monthly_premium_inr": plan["monthly_premium_inr"],
                    "annual_premium_inr":  plan["annual_premium_inr"],
                    "sum_insured_inr":     plan["sum_insured_inr"],
                    "features":         plan["features"],
                    "suitability_score": round(combined, 4),
                    "score_breakdown":   score_breakdown,
                    "explanation":       _explain_plan(plan, user_input, score_breakdown),
                    "is_near_match":     plan["annual_premium_inr"] > budget_annual * 1.20
                })
            
            if scored: # If we found plans in first pass, don't need second pass
                break

        scored.sort(key=lambda x: x["suitability_score"], reverse=True)
        top_plans = scored[:top_n]

        # Government Fallbacks if private eligibility is low
        fallbacks = []
        if len(scored) < 2 or risk_label == "High":
            fallbacks.append({
                "name": "Ayushman Bharat (PM-JAY)",
                "type": "Government Scheme",
                "coverage": "₹5 Lakh per family/year",
                "eligibility": "Based on SECC 2011 criteria / Ration card",
                "description": "National public health insurance fund that aims to provide free access to health insurance coverage for low income earners in the country."
            })

        return {
            "risk_label":      risk_label,
            "risk_score":      risk_score,
            "eligible_count":  len(scored),
            "rejected_count":  len(rejected),
            "top_plans":       top_plans,
            "government_fallbacks": fallbacks,
            "shap_features":   predict_response.get("top_shap_features", []),
            "filters_applied": list(set([r["reason"] for r in rejected])),
        }

    def get_plan(self, plan_id: str) -> Optional[dict]:
        for p in self._plans:
            if p["plan_id"] == plan_id:
                return p
        return None

    def list_plans(self, tier: Optional[str] = None) -> list[dict]:
        if tier:
            return [p for p in self._plans if p["tier"] == tier.lower()]
        return self._plans
