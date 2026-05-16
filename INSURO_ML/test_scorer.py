"""
Unit tests for scorer.py — no model dependency.
Run: python test_scorer.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

from scorer import PlanScorer, _cosine_similarity, _build_user_vector, _passes_hard_filters

CATALOGUE = os.path.join(os.path.dirname(__file__), "api", "plans_catalogue.json")


def test_cosine_similarity():
    assert abs(_cosine_similarity([1, 0, 0], [1, 0, 0]) - 1.0) < 1e-6
    assert abs(_cosine_similarity([1, 0, 0], [0, 1, 0]) - 0.0) < 1e-6
    assert _cosine_similarity([0, 0], [0, 0]) == 0.0
    print("cosine_similarity")


def test_user_vector_shape():
    u = {"age": 35, "bmi": 28.5, "hba1c": 6.1, "cholesterol": 215,
         "smoker": 0, "diabetes_family_hx": 1, "heart_disease_family_hx": 0,
         "hypertension_hx": 0, "currently_medicated": 0,
         "gender": 1, "coverage_type_pref": 0, "income_band": 3, "budget_range": 4000}
    v = _build_user_vector(u, "Medium")
    assert len(v) == 10, f"Expected 10-dim, got {len(v)}"
    assert all(0.0 <= x <= 1.0 for x in v), f"Out of range: {v}"
    print("user_vector dims + range")


def test_hard_filters_risk_mismatch():
    import json
    with open(CATALOGUE) as f:
        plans = json.load(f)
    low_plan = next(p for p in plans if p["tier"] == "low")
    user = {"age": 35, "bmi": 25, "smoker": 0, "income_band": 2, "budget_range": 5000,
            "currently_medicated": 0, "hypertension_hx": 0, "hba1c": 5.5, "cholesterol": 200}
    passes, reason = _passes_hard_filters(low_plan, user, "High")
    assert not passes, "Low-tier plan should fail for High risk user"
    print(f"hard filter risk mismatch: '{reason}'")


def test_hard_filters_smoker():
    import json
    with open(CATALOGUE) as f:
        plans = json.load(f)
    nonsmoker_plan = next(p for p in plans if not p["suitable_for"]["smoker_ok"] and "Low" in p["suitable_for"]["risk_labels"])
    user = {"age": 35, "bmi": 25, "smoker": 1, "income_band": 2, "budget_range": 5000,
            "currently_medicated": 0, "hypertension_hx": 0, "hba1c": 5.5, "cholesterol": 200}
    passes, reason = _passes_hard_filters(nonsmoker_plan, user, "Low")
    assert not passes, "Non-smoker plan should reject smoker"
    print(f"hard filter smoker: '{reason}'")


def test_scorer_low_risk():
    scorer = PlanScorer(CATALOGUE)
    predict_mock = {
        "risk_label": "Low",
        "risk_score": 0.92,
        "top_shap_features": [{"feature": "bmi", "shap_value": -0.8}],
    }
    user = {"age": 28, "bmi": 23.0, "hba1c": 5.2, "cholesterol": 185,
            "smoker": 0, "diabetes_family_hx": 0, "heart_disease_family_hx": 0,
            "hypertension_hx": 0, "currently_medicated": 0,
            "gender": 1, "coverage_type_pref": 0, "income_band": 2, "budget_range": 1500,
            "systolic_bp": 115, "diastolic_bp": 75, "fasting_glucose": 90}
    result = scorer.score(predict_mock, user, top_n=3)
    assert result["risk_label"] == "Low"
    assert len(result["top_plans"]) >= 1
    for p in result["top_plans"]:
        assert p["suitability_score"] > 0
        assert "Low" in p["tier"] or p["tier"] == "low"
    print(f"scorer low risk - {len(result['top_plans'])} plans returned, top score: {result['top_plans'][0]['suitability_score']}")
    print(f"  Top plan: {result['top_plans'][0]['name']} — {result['top_plans'][0]['explanation']}")


def test_scorer_high_risk_smoker():
    scorer = PlanScorer(CATALOGUE)
    predict_mock = {
        "risk_label": "High",
        "risk_score": 0.88,
        "top_shap_features": [],
    }
    user = {"age": 55, "bmi": 34.0, "hba1c": 8.5, "cholesterol": 270,
            "smoker": 1, "diabetes_family_hx": 1, "heart_disease_family_hx": 1,
            "hypertension_hx": 1, "currently_medicated": 1,
            "gender": 1, "coverage_type_pref": 0, "income_band": 4, "budget_range": 6000,
            "systolic_bp": 150, "diastolic_bp": 95, "fasting_glucose": 180}
    result = scorer.score(predict_mock, user, top_n=5)
    assert result["risk_label"] == "High"
    for p in result["top_plans"]:
        assert p["tier"] == "high"
    print(f"scorer high risk smoker - {len(result['top_plans'])} plans, eligible: {result['eligible_count']}")
    print(f"  Top plan: {result['top_plans'][0]['name']}")
    print(f"  Rejected: {result['rejected_count']} plans")


def test_scorer_budget_overflow():
    scorer = PlanScorer(CATALOGUE)
    predict_mock = {"risk_label": "High", "risk_score": 0.75, "top_shap_features": []}
    user = {"age": 45, "bmi": 30.0, "hba1c": 7.0, "cholesterol": 250,
            "smoker": 0, "diabetes_family_hx": 1, "heart_disease_family_hx": 0,
            "hypertension_hx": 1, "currently_medicated": 1,
            "gender": 0, "coverage_type_pref": 0, "income_band": 2, "budget_range": 1000,
            "systolic_bp": 140, "diastolic_bp": 90, "fasting_glucose": 130}
    result = scorer.score(predict_mock, user, top_n=5)
    # With ₹1000/month budget (~₹12,000/year) all High plans should be filtered
    print(f"budget overflow - eligible: {result['eligible_count']}, rejected: {result['rejected_count']}")
    for r in result["filters_applied"]:
        if "budget" in r.lower() or "Premium" in r:
            print(f"  Budget filter hit: {r[:80]}")
            break


def test_list_plans():
    scorer = PlanScorer(CATALOGUE)
    all_plans = scorer.list_plans()
    low_plans = scorer.list_plans(tier="low")
    high_plans = scorer.list_plans(tier="high")
    assert len(all_plans) == 18
    assert all(p["tier"] == "low" for p in low_plans)
    assert all(p["tier"] == "high" for p in high_plans)
    print(f"list_plans - total: {len(all_plans)}, low: {len(low_plans)}, high: {len(high_plans)}")


def test_get_plan():
    scorer = PlanScorer(CATALOGUE)
    plan = scorer.get_plan("ELITE_HEALTH_H1")
    assert plan is not None
    assert plan["name"] == "EliteHealth Premier"
    assert scorer.get_plan("DOES_NOT_EXIST") is None
    print("get_plan by ID")


if __name__ == "__main__":
    print("\n--- InsuReady Scorer Tests ---")
    test_cosine_similarity()
    test_user_vector_shape()
    test_hard_filters_risk_mismatch()
    test_hard_filters_smoker()
    test_scorer_low_risk()
    test_scorer_high_risk_smoker()
    test_scorer_budget_overflow()
    test_list_plans()
    test_get_plan()
    print("\nAll tests passed.\n")
