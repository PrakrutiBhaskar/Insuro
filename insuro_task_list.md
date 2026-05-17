# Insuro — Hackathon Task List
> Fidelity Hackathon 2026 · Problem Statement 04 · Sorted by priority


## P1 — Must Fix
> Breaks the demo or fails PS04 requirements. Do these first, in order.

- [x] **Replace `get_nlp_explanation()` stub with live Claude API call** `Backend` 
  Returns a hardcoded string in V1.0. The core PS04 requirement — "plain-English explanation of why a plan was suggested" — is not working without this.

- [x] **Build plan comparison component** `Frontend` 
  PS04 explicitly requires side-by-side comparison of up to 3 plans. Add checkboxes on recommendation cards that open a feature matrix comparison view.

- [x] **Add filter UI on plan listing page** `Frontend`
  Price range, coverage type, and insurer filters are a verbatim must-have in PS04. Filter pills above the plan grid, reactive to React state.

- [x] **Build plan detail page** `Frontend` 
  PS04 requires a "dedicated detail page with coverage highlights, premium breakdown, benefits, exclusions, and pros/cons" for each plan.

- [x] **Pre-compute DiCE result for demo profile (Priya Sharma)** `Backend`
  DiCE takes 2–5s synchronously. A judge will stare at a spinner. Cache the result for your demo patient at startup to make it instant.

- [x] **Start `docker-compose up --build` before entering the demo room** `DevOps`
  The V1.3 model bundle has a 30–60s cold start. Never restart live. Have a logged-in browser tab open and ready before judges arrive.

---

## P2 — High Value

- [x] **Replace raw SHAP floats with readable impact sentences** `Frontend`
  "0.234" means nothing to a non-technical judge. Show: "Your BMI of 28.9 increased your risk score by +2.4 pts" instead.

- [x] **Add risk profile summary card at dashboard top** `Frontend`
  Show age, BMI, HbA1c, and risk tier with a colour badge (🔴 High / 🟡 Medium / 🟢 Low) at the top of the dashboard. Gives judges immediate context before they scroll to plans.

- [x] **Verify `/auth/token` requires real credentials** `Backend`
  V1.0 issued tokens to anyone with no credentials. V1.3 claims RBAC — if still unauthenticated, any judge who tests the API will flag it.

- [x] **Scope CORS to frontend origin** `Backend`
  `allow_origins=['*']` is an immediate red flag if a judge looks at the code. Replace with your Vercel/frontend domain. Five-minute fix.

- [x] **Test full flow at 375px mobile viewport** `Frontend`
  PS04 requires responsive UI across desktop and mobile. Tailwind helps but needs manual verification — judges often check on their phones.

- [x] **Test lab report upload with Priya Sharma PDF 10 times** `QA`
  If NLP extraction fails mid-demo it's catastrophic. Know exactly which PDF parses cleanly every single time before you walk in.

---

## P3 — Polish


## P3 — Polish


- [x] **Surface model confidence indicator per recommendation** `Frontend + ML`
  Compute entropy of XGBoost probability distribution. Show as a "High Confidence" / "Moderate Confidence" badge on each plan card.

- [x] **Add error boundaries on all API-dependent components** `Frontend` 
  An API failure currently shows a blank screen. A friendly error state with a retry button is 30 minutes of React work and prevents a demo disaster.

- [x] **Add "Delete my health data" privacy control in settings** `Full Stack` 
  PS04 requires privacy controls for sensitive health and financial data. A UI toggle plus one API endpoint satisfies this requirement visibly during judging.

- [x] **Verify `Processing.tsx` timeline matches real backend timing** `Frontend` 
  The animated step-by-step pipeline should reflect actual inference time — not a fake timer that finishes before the API responds. Judges notice the mismatch.



---

## P4 — Brownie Points
- [x] **Affordability simulator — "what if my income changes?"** `Frontend` 
  A slider for monthly budget that re-ranks visible plans in real time. PS04 lists this as a good-to-have optional feature — it will stand out.

- [x] **Hindi language toggle on intake form** `Frontend`
  PS04 good-to-have: "multi-language support including at least one regional Indian language." No other team will have this.

- [x] **Chatbot guide through profile intake** `Full Stack`
  PS04 good-to-have. Claude Sonnet is already integrated — a floating chat bubble that asks "what's your BMI?" as users fill the form would close the loop elegantly.

- [x] **Surface survival analysis output on dashboard** `Frontend + ML` 
  If Lifelines is integrated, show a "5-year risk trajectory" sparkline on the dashboard. This is a genuine differentiator — no other team in PS04 will have it.

- [x] **Add a "why this plan" one-liner on each recommendation card** `Backend`
  Beyond the SHAP breakdown — a single sentence from Claude specific to each plan. "Covers pre-diabetic monitoring and HbA1c tests from day one." Direct, specific, memorable.

---

## P4+ — Final Hardening
- [x] **Connect AI Guide chatbot to a real LLM** `AI` 
  Swapped static bubble for Claude-Haiku with /chat endpoint.
- [x] **Expand insurance catalogue to 20+ plans** `ML/DB` 
  Added Life and Critical Illness plans to seed script.
- [x] **Migrate plans from JSON to Postgres DB** `DB` 
  Implemented `seed_db.py` and DB-aware `PlanScorer`.
- [x] **Document training dataset used** `ML` 
  Created `RESEARCH.md` with UCI/Kaggle dataset specs.
- [x] **Pre-warm containers before demo** `DevOps` 
  Created `warmup.py` script to trigger cold-starts.

**STATUS: SYSTEM ARCHITECTURE FULLY HARDENED.**

