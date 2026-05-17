# Design Document — Smart Insurance Recommendation Platform
### Fidelity Hackathon 2026 · Problem Statement 04 · FinTech / HealthTech / AI-ML

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Design Vision & Philosophy](#2-design-vision--philosophy)
3. [Design System](#3-design-system)
4. [Information Architecture](#4-information-architecture)
5. [Page-by-Page Design Breakdown](#5-page-by-page-design-breakdown)
6. [Component Library](#6-component-library)
7. [Motion & Animation Guidelines](#7-motion--animation-guidelines)
8. [Responsive Design Strategy](#8-responsive-design-strategy)
9. [Tech Stack & Implementation Notes](#9-tech-stack--implementation-notes)
10. [Accessibility & Trust Signals](#10-accessibility--trust-signals)

---

## 1. Product Overview

### What It Is

A full-stack, AI-assisted insurance recommendation platform that:
- Collects a user's **health, demographic, and financial profile** via a guided multi-step form
- Extracts health indicators from **uploaded clinical documents** (lab reports, prescriptions, PDFs) using AI
- Runs a **trained ML model** to assess health risk and care needs
- Delivers **top-5 personalized plan recommendations** with plain-English explanations
- Allows **side-by-side plan comparison** and filtering

### Target User

Everyday individuals — salaried professionals, self-employed adults, senior citizens — who are uninsured, underinsured, or confused by existing insurance portals.

### Core User Journey

```
Sign Up → Profile Intake Form → Upload Documents (optional)
→ AI Risk Assessment → Recommendations Dashboard
→ Plan Comparison → Plan Detail → (Future) Purchase
```

---

## 2. Design Vision & Philosophy

### Theme

**Premium dark-light hybrid** — rooted in trust, intelligence, and calm authority.

The platform must communicate:
- **Trust** — users share sensitive health and financial data
- **Intelligence** — AI recommendations must feel credible, not gimmicky
- **Clarity** — insurance is complex; the UI must simplify, not add noise
- **Security** — privacy controls must be visible and reassuring

### Aesthetic Direction

| Attribute | Direction |
|---|---|
| Overall feel | Enterprise fintech · calm luxury · clinical precision |
| Color mode | Dark-primary with frosted-glass light panels |
| Motion | Purposeful, fluid, never distracting |
| Typography | Serif display + geometric sans body |
| Density | Spacious with controlled information hierarchy |

### What to Avoid

- Generic Tailwind card grids
- Cyberpunk neon overload
- Childish health app illustrations
- Busy dashboards with no visual hierarchy
- Overly colorful startup palette

---

## 3. Design System

### 3.1 Color Palette

```
Primary Background       #050D1F   Deep navy (page background)
Surface / Card           #0A1628   Midnight navy (cards, sidebars)
Elevated Surface         #0E1F3C   Lighter navy (hover states, modals)

Primary Blue             #1A54D4   Brand blue (links, active states)
Bright Blue              #2E6FFF   CTAs, highlights
Blue Glow                rgba(46, 111, 255, 0.18)   Glow effects

Emerald (Positive)       #00D97E   Success, low risk, positive actions
Emerald Dim              rgba(0, 217, 126, 0.12)    Subtle emerald fills

Amber (Warning)          #F5A623   Medium risk, caution states
Red (Alert)              #FF4D4D   High risk, critical alerts, errors

Silver / Glass           rgba(255, 255, 255, 0.06)  Card backgrounds
Silver Border            rgba(255, 255, 255, 0.10)  Borders, dividers
White 90                 rgba(255, 255, 255, 0.90)  Primary text
White 60                 rgba(255, 255, 255, 0.60)  Secondary text
White 40                 rgba(255, 255, 255, 0.40)  Placeholder / muted
```

**Risk Color Mapping (critical for this product):**

| Risk Level | Color | Use |
|---|---|---|
| Low Risk | `#00D97E` Emerald | Risk badge, score bar, recommendation tag |
| Medium Risk | `#F5A623` Amber | Warning pills, moderate-risk plans |
| High Risk | `#FF4D4D` Red | Alerts, high-risk indicators |
| Unknown | `rgba(255,255,255,0.40)` | Awaiting assessment |

### 3.2 Typography

```
Display / Hero Headings   →   Instrument Serif (italic for emphasis)
Section Headings          →   DM Sans, weight 700, tracking -1.5px
Body Text                 →   DM Sans, weight 300–400, line-height 1.7
UI Labels / Captions      →   DM Sans, weight 500–600, uppercase + tracking
Monospace (scores, IDs)   →   JetBrains Mono
```

**Type Scale:**

| Role | Size | Weight |
|---|---|---|
| Hero Title | 72–88px | Serif |
| Page Title | 40–52px | 700 |
| Section Header | 28–36px | 700 |
| Card Title | 18–20px | 600 |
| Body | 15–17px | 300–400 |
| Caption / Label | 12–13px | 500–600 |

### 3.3 Spacing System

Base unit: `8px`

```
4px    Micro gaps (badge internals, icon spacing)
8px    Tight element spacing
16px   Component internal padding
24px   Card padding
32px   Section sub-spacing
48px   Section padding (mobile)
80px   Section padding (desktop)
120px  Hero vertical rhythm
```

### 3.4 Border Radius

```
4px    Badges, chips, small tags
8px    Inputs, small buttons
12px   Cards, panels
16px   Large cards, modals
20px   Hero panels, feature blocks
100px  Pills, rounded CTAs
```

### 3.5 Shadow & Glow System

```css
/* Subtle card elevation */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

/* Hover card elevation */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

/* Blue CTA glow */
box-shadow: 0 0 32px rgba(46, 111, 255, 0.35);

/* Modal / dashboard preview */
box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(46, 111, 255, 0.08);

/* Emerald positive glow */
box-shadow: 0 0 20px rgba(0, 217, 126, 0.25);
```

---

## 4. Information Architecture

```
/                          Landing Page
/auth/signup               Registration
/auth/login                Login
/onboarding                Multi-step Profile Intake (4 steps)
  └── Step 1: Personal & Demographic
  └── Step 2: Health Information
  └── Step 3: Financial Profile
  └── Step 4: Document Upload (optional)
/dashboard                 User Dashboard (recommendations + summary)
/plans                     Plan Explorer (filterable listing)
/plans/:id                 Plan Detail Page
/compare                   Side-by-Side Plan Comparison (up to 3)
/profile                   User Profile & Privacy Settings
/ai-assistant              AI Chat Assistant
/about                     About Page
/support                   Support & Contact
```

---

## 5. Page-by-Page Design Breakdown

---

### 5.1 Landing Page

**Goal:** Convert visitors into sign-ups by communicating trust, intelligence, and simplicity.

#### Hero Section

- **Full-viewport height**, dark navy background with animated radial gradient blobs
- Subtle `60px` grid overlay at `4% opacity` for depth
- Animated badge: `● AI-Powered · IRDAI Compliant` in emerald
- **Headline** (Instrument Serif, 80px): *"The Smarter Way to Find Insurance That Fits You"*
- Sub-headline (DM Sans Light, 18px): Two-line value proposition
- Two CTAs: `Get Your Free Recommendation` (blue gradient) + `See How It Works` (ghost)
- **Floating stats row** below CTAs: `2M+ Users | ₹50Cr+ Claims Processed | 200+ Plans | 4.9★ Rating`
- Background: animated floating orbs using `@keyframes float` with 6–10s duration

**Hero Visual (right panel or center):**
A floating glassmorphism dashboard card showing:
- A risk score dial animated to `72 / 100 — Low Risk`
- Top 3 recommended plan previews sliding in with stagger
- A document upload zone with a scanning animation

#### Trust Strip
Logos or names of: IRDAI · ISO 27001 · HIPAA-compliant · 256-bit Encryption · RBI Registered

#### Features Section
Six animated cards, each revealing on scroll:

| # | Icon | Title | Description |
|---|---|---|---|
| 1 | 🧬 | AI Risk Profiling | Upload your health records; our model extracts and evaluates key indicators |
| 2 | 📋 | Smart Recommendations | Top plans matched to your health risk, age, and budget |
| 3 | ⚡ | Instant Comparison | Compare up to 3 plans side by side with coverage breakdown |
| 4 | 🔒 | Privacy First | Your health data is encrypted, anonymized, and never sold |
| 5 | 📄 | Document Intelligence | AI reads lab reports, extracts HbA1c, BP, BMI automatically |
| 6 | 💬 | AI Assistant | Ask anything about coverage, premiums, or claim processes |

Card design: glassmorphism panel, icon in gradient circle, hover lifts card + blue left-border glow activates.

#### How It Works
A **3-step horizontal progression** with animated connecting line:

```
[1. Build Your Profile] ──────── [2. AI Analyses Your Data] ──────── [3. Get Your Matches]
 Fill a 4-step form              Model scores your risk                 Top plans, explained
 in under 5 minutes              and identifies care needs              in plain language
```

Each step is a card; active step pulses with a blue ring. On scroll, the connecting line animates from left to right.

#### Live Dashboard Preview
An **embedded interactive mock** of the recommendations dashboard — not a screenshot, but real rendered HTML/React components with mock data. Shows:
- Risk score gauge
- Top 3 recommended plans with suitability scores
- A document upload indicator

#### Testimonials
Three glassmorphism cards, auto-rotating every 4s:
- Quote, user name, city, plan they chose, risk level badge

#### Footer CTA
Large dark section: *"Find Your Perfect Plan Today — Free, Instant, AI-Powered"*
Single large CTA button with blue glow. Below it: security badges in a row.

---

### 5.2 Multi-Step Onboarding / Profile Intake

**Goal:** Collect health, demographic, and financial data in a non-intimidating, guided flow.

#### Layout
- **Left sidebar:** Step progress indicator (vertical stepper with labels and connecting lines)
- **Right panel:** Active form — one focused step at a time
- **Top bar:** Logo + `Save & Exit` ghost button
- **Bottom bar:** `← Back` and `Continue →` with progress percentage

#### Step 1 — Personal & Demographic

Fields:
- Full Name, Date of Birth (date picker with age auto-calculated)
- Gender (segmented toggle: Male / Female / Other)
- City / State (searchable dropdown)
- Occupation (dropdown: Salaried / Self-Employed / Freelancer / Retired / Student)
- Family Size (stepper: 1–8 members)

Design notes:
- Each field slides in with a `20ms` stagger on mount
- Active input has a glowing blue bottom-border
- Age displays in real-time next to DOB: `28 years old`

#### Step 2 — Health Information

Fields:
- Height (cm) + Weight (kg) → BMI auto-calculated and shown in a colored badge
- Smoking status (toggle)
- Alcohol consumption (toggle)
- Pre-existing conditions (multi-select chip group: Diabetes / Hypertension / Heart Disease / Cancer / None / Other)
- Family medical history (same chip group)
- Last health check-up (date picker)

Design notes:
- BMI badge updates live: `22.5 — Healthy` (emerald) / `28.1 — Overweight` (amber) / `32+ — Obese` (red)
- Conditions chips use subtle red tint when selected to indicate sensitivity, with a privacy note: `🔒 This data is encrypted and never shared`

#### Step 3 — Financial Profile

Fields:
- Annual income bracket (segmented slider with labeled stops)
- Monthly budget for insurance premium (range slider: ₹500–₹20,000)
- Coverage type preference (checkbox cards: Health / Life / Critical Illness / All)
- Coverage amount needed (slider: ₹1L–₹2Cr)
- Existing policies? (yes/no toggle → if yes, which type)

Design notes:
- Slider thumbs show live value tooltips
- A **premium affordability indicator** shows: `Your budget covers 87% of plans in our catalogue`

#### Step 4 — Document Upload (Optional)

Components:
- Drag-and-drop upload zone with dashed animated border
- Supported formats: PDF, JPG, PNG — Lab reports, prescriptions, health summaries
- After upload: animated scanning bar → AI extraction preview panel showing detected values:
  ```
  ✓ HbA1c: 5.8%   ✓ Blood Pressure: 124/82   ✓ Cholesterol: 188 mg/dL
  ```
- Skip option clearly available — not mandatory

Design notes:
- File upload zone: `2px dashed rgba(46,111,255,0.4)` border, pulses on drag-over
- Scanning animation: horizontal light sweep across uploaded document thumbnail
- Extracted values appear with a typewriter effect

---

### 5.3 Recommendations Dashboard

**Goal:** The payoff screen. Must feel intelligent, personalized, and instantly trustworthy.

#### Layout
- **Sidebar** (collapsible, 240px wide): navigation links with active state indicators
- **Main content**: scrollable, 3-column grid collapsing to 1 on mobile

#### Top Section — Risk Profile Summary Card

A full-width hero card with:

**Left:** Circular gauge (SVG arc, animated on load) showing Risk Score 0–100
- 0–40: Emerald — Low Risk
- 41–70: Amber — Moderate Risk
- 71–100: Red — High Risk

**Center:** Extracted profile summary:
```
Age: 35   BMI: 24.1 (Healthy)   HbA1c: 5.8% (Pre-diabetic range)
Smoker: No   Family History: Diabetes
```

**Right:** AI-generated insight text (plain English):
> *"Your pre-diabetic HbA1c reading and family history of diabetes place you in the moderate-risk category. We prioritise plans with Day-1 diabetes coverage and no waiting periods for metabolic conditions."*

#### Recommended Plans Grid

Five cards (or fewer), ranked by suitability. Each card:

```
┌─────────────────────────────────────────────┐
│  [Insurer Logo]        ★ 94% Match           │
│  Star Health Comprehensive Care              │
│  ─────────────────────────────────────────  │
│  ₹8,200/yr · ₹10L Coverage                  │
│  ──────────────────────────────────────────  │
│  ✓ Diabetes covered from Day 1               │
│  ✓ No pre-existing waiting period            │
│  ✓ Cashless at 5,000+ hospitals              │
│  ──────────────────────────────────────────  │
│  Why recommended:                            │
│  "Your HbA1c of 5.8% places you at pre-     │
│   diabetic risk. This plan covers diabetes   │
│   hospitalisation from day one..."           │
│  ──────────────────────────────────────────  │
│  [View Details]    [+ Add to Compare]        │
└─────────────────────────────────────────────┘
```

Card states:
- Default: dark navy + silver border
- Hover: lifts 4px, border glows blue
- Top pick (rank 1): emerald left-border accent + `Best Match` badge

#### Side Panel — Analytics Widgets

- **Coverage Gap Analyser:** A horizontal bar chart comparing user's budget vs. plan costs
- **Waiting Period Comparison:** Timeline bars for each recommended plan
- **Claim Settlement Ratio:** Sparkline bars per insurer (sourced from IRDAI public data)

---

### 5.4 Plan Explorer (Browse All Plans)

**Goal:** Let users browse the full catalogue with powerful filters.

#### Layout
- **Left panel (280px):** Filter sidebar
- **Right panel:** Responsive plan card grid

#### Filter Sidebar

Filter groups (each collapsible):
- **Plan Type:** Health / Life / Critical Illness / Top-Up (checkbox)
- **Premium Range:** Dual-handle range slider (₹500 – ₹25,000/mo)
- **Coverage Amount:** Range slider (₹1L – ₹2Cr)
- **Insurer:** Multi-select (Star Health, HDFC Ergo, ICICI Lombard, etc.)
- **Waiting Period:** Toggle chips (None / 30 days / 1 year / 2 years / 4 years)
- **Special Features:** Checkbox list (OPD cover / Maternity / Mental Health / Dental)
- **Claim Settlement Ratio:** Minimum threshold slider (80%–100%)

Active filters appear as dismissible chips above the results grid.

#### Plan Cards (Grid View)

Each card shows:
- Insurer name + logo placeholder
- Plan name
- Premium (monthly / annual toggle)
- Coverage amount
- Top 3 benefits (icon + label)
- Suitability score badge (if user has completed profile)
- `View Details` + `Compare` buttons

Toggle between **Grid** and **List** view (list shows a table-style layout with more detail per row).

---

### 5.5 Plan Detail Page

**Goal:** Give complete information to support a confident purchase decision.

#### Layout: Single-column with sticky sidebar

**Sticky Sidebar (right, 320px):**
- Premium breakdown (monthly / quarterly / annual)
- Suitability score gauge
- `Get Recommended` primary CTA
- `+ Add to Compare` secondary CTA
- Share button

**Main Content (scrollable sections):**

1. **Overview** — Plan name, insurer, type, coverage amount, key highlights in pills
2. **Coverage Details** — Expandable accordion: Hospitalization / OPD / Maternity / Mental Health / Critical Illness
3. **Benefits Table** — Two-column table: benefit name vs. coverage limit
4. **Exclusions** — Red-tinted list of what's not covered
5. **Waiting Periods** — Visual timeline: `Day 1 | 30 days | 1 year | 2 years | 4 years` with markers per condition
6. **Pros & Cons** — Two-column layout, emerald checkmarks vs. red X marks
7. **Claim Settlement Ratio** — Bar chart (last 3 years from IRDAI data)
8. **Eligibility** — Age range, BMI limits, pre-conditions accepted/rejected list
9. **Similar Plans** — Horizontal scroll of 3 alternative plan cards

---

### 5.6 Plan Comparison Page

**Goal:** Make the decision between 2–3 plans visually obvious.

#### Layout

Sticky top header row with plan names and `Remove` buttons.
Below: scrollable comparison table rows.

```
                        Plan A              Plan B              Plan C
───────────────────────────────────────────────────────────────────────
Suitability Score       ★ 94%               ★ 87%               ★ 79%
Premium (Annual)        ₹8,200              ₹11,400             ₹6,800
Coverage Amount         ₹10 Lakhs           ₹15 Lakhs           ₹5 Lakhs
Diabetes (Day 1)        ✓                   ✓                   ✗
Waiting Period          30 days             30 days             2 years
OPD Cover               ✓                   ✓                   ✗
Maternity               ✗                   ✓                   ✗
Cashless Hospitals      5,200+              8,000+              3,100+
Claim Settlement %      98.1%               96.8%               94.2%
───────────────────────────────────────────────────────────────────────
                        [Select Plan]       [Select Plan]       [Select Plan]
```

Design notes:
- Best value in each row gets a subtle emerald background highlight
- Worst value gets a subtle red tint
- Sticky plan headers scroll with the page horizontally
- On mobile: horizontal scroll with frozen first column

---

### 5.7 AI Assistant Page

A full-screen conversational interface.

#### Layout
- Left panel (300px): Conversation history + suggested questions
- Right panel: Active chat area

#### Chat Design
- Dark navy chat container
- User messages: right-aligned, blue bubble
- AI messages: left-aligned, dark glassmorphism panel with typewriter animation
- Each AI response includes:
  - Answer text
  - Source tag: `Based on your risk profile` or `IRDAI guidelines`
  - Quick reply chips below: `Tell me more`, `Compare plans`, `What does this cover?`

#### Suggested Questions (left panel)
Pre-loaded contextual prompts based on user's profile:
- "Which plan covers my pre-diabetic condition from day one?"
- "What is a waiting period and how does it affect me?"
- "Explain the difference between Health and Critical Illness cover"
- "What happens if I miss a premium payment?"

---

### 5.8 User Profile & Privacy Settings

Sections:
- **Personal Info** — editable fields with inline save
- **Health Data** — view extracted values, option to re-upload documents
- **Privacy Controls** — toggle switches for: data used for model training / anonymised analytics / marketing communications
- **Security** — change password, active sessions, 2FA toggle
- **Data Export / Delete** — GDPR-style controls, clearly visible

Privacy section uses emerald icons and reassuring copy. Data deletion uses a red confirmation modal with a 5-second delay button (pattern used in high-trust finance apps).

---

## 6. Component Library

### Buttons

```
Primary CTA      Blue gradient, 12px radius, glow shadow on hover
Secondary        Ghost — white border, transparent fill
Danger           Red background, used only for destructive actions
Disabled         40% opacity, no pointer events
Icon Button      Square, 40×40px, border + hover fill
```

### Form Inputs

```
Text Input       Dark fill, blue focus ring (2px glow), floating label
Range Slider     Custom track (silver) + thumb (blue gradient)
Segmented Toggle Full-width button group, active = blue fill
Chip Select      Multi-select rounded chips, selected = blue fill
File Upload Zone Dashed border, drag-over = pulsing blue border
```

### Data Display

```
Suitability Badge   Pill with % score + color-coded background
Risk Badge          EMERALD / AMBER / RED pill, uppercase
Coverage Pill       Dark chip with ₹ amount + type label
Claim Ratio Bar     Horizontal bar, fill color = ratio level
Progress Ring       SVG arc, animated on mount
```

### Feedback & Status

```
Toast           Slides in from top-right, auto-dismiss 4s
Loading Skeleton Shimmer animation on card placeholders
Empty State     Illustration + heading + CTA
Success Screen  Full-panel emerald animation + confirmation
Error State     Red border + icon + retry CTA
```

### Navigation

```
Sidebar         240px, collapsible to 64px icon-only mode
Active Link     Left blue border accent + blue icon + white text
Breadcrumb      Small, muted, separator with chevron
Tab Bar         Underline active tab with animated indicator
```

---

## 7. Motion & Animation Guidelines

### Principles
- **Purposeful** — every animation communicates state change or guides attention
- **Fast** — interactions under 200ms; reveals under 400ms
- **Consistent** — use the same easing (`cubic-bezier(0.4, 0, 0.2, 1)`) throughout

### Animation Catalogue

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Page mount | Fade + translateY(20px) → 0 | 500ms | ease-out |
| Card scroll-reveal | Fade + translateY(32px) → 0, staggered | 400ms | ease-out |
| Button hover | translateY(-2px) + shadow increase | 200ms | ease |
| Card hover | translateY(-4px) + border glow | 250ms | ease |
| Risk gauge fill | SVG stroke-dashoffset sweep | 800ms | ease-in-out |
| Counter (stats) | Count from 0 to target | 1200ms | ease-out |
| Step transition | Slide left/right (like carousel) | 350ms | ease-in-out |
| Skeleton → content | Fade from shimmer to content | 300ms | ease |
| Toast entry | SlideIn from right | 300ms | ease-out |
| Modal open | Scale(0.95→1) + fade | 250ms | ease-out |
| Document scan | Horizontal light sweep | 1500ms | linear, loop |
| Floating orbs (hero) | translateY ±8px loop | 6–10s | ease-in-out |
| Connecting line (HIW) | width: 0 → 100% on scroll | 600ms | ease-out |

### Scroll-Triggered Reveals

Use `IntersectionObserver` with a `0.15` threshold. Elements start with:
```css
opacity: 0;
transform: translateY(24px);
```
And transition to:
```css
opacity: 1;
transform: translateY(0);
transition: all 0.4s ease-out;
```

Apply stagger delays in increments of `80ms` for sibling elements (feature cards, plan cards, stat items).

---

## 8. Responsive Design Strategy

### Breakpoints

```
Mobile       < 640px
Tablet       640px – 1024px
Laptop       1024px – 1280px
Desktop      > 1280px
```

### Key Responsive Behaviors

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero headline | 80px serif | 56px | 40px |
| Features grid | 3 columns | 2 columns | 1 column |
| Dashboard sidebar | 240px fixed | Collapsible overlay | Hidden, bottom nav |
| Onboarding layout | Left stepper + right form | Top stepper + form below | Top progress bar + form |
| Plan comparison | 3-column table | 2-column table | Horizontal scroll |
| Plan cards | 3-column grid | 2-column grid | 1-column list |
| Navigation | Full nav bar | Hamburger | Bottom tab bar |
| Filter sidebar | 280px fixed panel | Slide-in drawer | Bottom sheet |

### Mobile-Specific Rules
- Bottom navigation bar with 5 icons (Dashboard, Plans, Compare, Assistant, Profile)
- All tap targets minimum `44×44px`
- No hover-only interactions — all hovers have tap equivalents
- File upload falls back to native `<input type="file">` on mobile
- Range sliders have larger thumb size (`28px`) on touch devices

---

## 9. Tech Stack & Implementation Notes

### Recommended Stack

```
Framework       Next.js 14 (App Router)
Language        TypeScript
Styling         TailwindCSS (heavily customised config)
UI Primitives   ShadCN UI (restyled to match dark theme)
Animation       Framer Motion (scroll + page transitions)
Charts          Recharts or Chart.js (risk gauge, comparison bars)
Forms           React Hook Form + Zod validation
HTTP            Axios + React Query (TanStack)
Auth            JWT stored in httpOnly cookies
File Upload     react-dropzone
PDF Parsing     pdf-parse (backend)
AI Extraction   Anthropic Claude API (document parsing)
ML Model        scikit-learn (Python backend) or ONNX.js (client)
```

### Architecture Notes

```
/app
  /(auth)
    /login
    /signup
  /(main)
    /dashboard          ← Recommendations home
    /onboarding         ← 4-step form
    /plans              ← Plan explorer
    /plans/[id]         ← Plan detail
    /compare            ← Comparison view
    /ai-assistant       ← Chat interface
    /profile            ← Settings & privacy
/components
  /ui                   ← ShadCN base components
  /insurance            ← Domain-specific components
  /charts               ← All chart components
  /forms                ← Form step components
/lib
  /api                  ← API client functions
  /utils                ← Formatters, helpers
  /hooks                ← Custom React hooks
/types                  ← Shared TypeScript interfaces
```

### Performance Targets

- First Contentful Paint: `< 1.2s`
- Largest Contentful Paint: `< 2.5s`
- Total Blocking Time: `< 200ms`
- Images: WebP with blur placeholder via `next/image`
- Fonts: Self-hosted via `next/font` (no layout shift)
- Code split per route, lazy-load chart libraries

---

## 10. Accessibility & Trust Signals

### Accessibility

- All color contrasts meet **WCAG AA** (4.5:1 for body text, 3:1 for large text)
- All interactive elements are keyboard-navigable with visible `:focus-visible` rings
- Form fields have explicit `<label>` associations
- Risk color coding is **never the only indicator** — always paired with text labels (Low / Medium / High)
- Screen reader announcements for dynamic content (toast messages, step changes, loading states)
- Reduced motion: all animations wrapped in `@media (prefers-reduced-motion: no-preference)`

### Trust Signal Checklist

| Signal | Where |
|---|---|
| IRDAI compliance badge | Nav bar, footer, plan detail pages |
| SSL / 256-bit encryption note | Document upload step, profile page |
| `🔒 Your data is encrypted` | Inline on sensitive form fields |
| Privacy controls | Dedicated settings section |
| Data source attribution | Recommendation cards ("Source: IRDAI 2024") |
| Claim settlement ratio | Sourced and dated per insurer |
| No-spam commitment | On email input fields |
| GDPR/DPDP data rights | Profile page — export, delete options |

---

## Summary

This design document defines a complete, production-grade frontend for the Smart Insurance Recommendation Platform. The design language — dark navy, intelligent typography, emerald/amber/red risk coding, glassmorphism panels, and purposeful motion — is built specifically to make users feel **safe sharing sensitive data** and **confident acting on AI recommendations**.

Every page has a single primary job. Every animation serves a purpose. Every color choice maps to meaning.

The result should feel like a real venture-backed insurtech platform — not a hackathon project.

---

*Fidelity Hackathon 2026 · Team of 4 · Track: FinTech / HealthTech / AI-ML*
