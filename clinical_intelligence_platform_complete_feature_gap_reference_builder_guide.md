# Clinical Intelligence Platform
## Complete Feature, Gap & Improvement Reference (Builder Guide)

**Purpose of this document**

This markdown file is the **single source of truth** an AI agent (or human developer) should use while building or extending the Clinical Intelligence Platform.

It consolidates:
- Original project intent (from problem statements & design docs)
- Verified current implementation state
- Missing must-have features
- Safety, credibility, and clinical trust requirements
- High-impact future enhancements

This is **not marketing**. This is a **build + reasoning guide**.

---

## 1. PROJECT INTENT (DO NOT DRIFT FROM THIS)

**Core Goal**
> Detect *longitudinal deterioration* in patients and warn clinicians early — with explanations.

**Non-goals**
- ❌ No diagnosis
- ❌ No treatment recommendations
- ❌ No autonomous decision-making
- ❌ No LLM-based free-form clinical reasoning

The system is **clinical decision support**, not a clinician replacement.

---

## 2. VERIFIED CURRENT STATE (GROUND TRUTH)

### 2.1 What Is REAL & WORKING

- Backend risk computation (ML + rule-based fallback)
- Automatic risk recomputation on vital insertion
- Stateful risk persistence (Patient + RiskScore history)
- Explanation engine (rule-based, backend-only)
- Patient CRUD, vitals, labs, notes
- Timeline ordering by timestamp
- UI routing (Dashboard → Patient → Overview / Timeline / Record Data)

### 2.2 What Is DEMO-ONLY / ASSUMED

- Risk trend charts (mock data)
- Glucose / creatinine charts (static arrays)
- Alerts visible in UI (seeded, not auto-generated)
- Authentication (UI-only, backend ignores tokens)

### 2.3 What Is NOT IMPLEMENTED

- Risk explanations exposed to UI
- Automatic alert creation on high risk
- Backend auth enforcement
- Data deduplication
- Server-authoritative timestamps

---

## 3. MUST-HAVE FEATURES (TO MATCH PROJECT VISION)

### 3.1 Risk Explanation Exposure (CRITICAL)

**Why**
- The platform claims *explainable* longitudinal risk

**Required Implementation**
- Modify compute-risk endpoint to return:
  - explanation.summary
  - explanation.contributing_factors
- Render a **Risk Drivers Panel** in Patient Overview

**UI Example**
```
Risk Drivers:
• Blood sugar increased 30% over 18 months
• Blood pressure trending upward
• Advanced age increased baseline risk
```

---

### 3.2 Replace Mock Charts with Real Longitudinal Data (CRITICAL)

**Why**
- Longitudinal trends are the system’s main value

**Required Implementation**
- Connect frontend charts to:
  - /db/patients/{id}/risk-history
  - /db/patients/{id}/vitals

**Rules**
- Charts must reflect DB state
- No static demo arrays in production paths

---

### 3.3 Automatic Alert Creation (CRITICAL)

**Why**
- Without alerts, this is monitoring — not early warning

**Required Implementation**
- When risk_level == HIGH:
  - Create Alert record
  - De-duplicate alerts for same patient + condition
  - Store snapshot of risk drivers

**Alert States**
- active
- acknowledged
- dismissed

---

## 4. SAFETY & CREDIBILITY REQUIREMENTS (NON-NEGOTIABLE)

### 4.1 Clear Risk Semantics

- risk_score ∈ [0,1] = **probability**, not diagnosis
- confidence = distance from decision boundary (NOT uncertainty)

**UI Requirement**
- Tooltip explaining both clearly

---

### 4.2 Data Provenance

Every data point should expose:
- recorded_at (server-generated)
- source (manual / lab / device)
- entered_by (role)

---

### 4.3 Server-Side Timestamp Authority

- Backend must always set recorded_at
- Client timestamp (if any) stored separately as reported_at

---

### 4.4 Authentication Enforcement (Post-MVP but Mandatory)

- JWT validation on all /db/* routes
- Role-based access control

---

## 5. IMPORTANT UX & CLINICAL TRUST IMPROVEMENTS

### 5.1 Event-Anchored Charts

- Vertical markers for:
  - Vital added
  - Lab added
  - Alert fired
- Click marker → jump to timeline event

---

### 5.2 Timeline Cleanliness

- Soft deduplication (same type + same timestamp)
- Group vitals by visit/day
- Collapse repeated entries

---

### 5.3 Risk Velocity Indicator

Show:
- Stable
- Slowly worsening
- Rapid deterioration

Based on slope of risk history.

---

## 6. EXPLANATION ENGINE IMPROVEMENTS

### 6.1 Coverage Completeness

Currently explained:
- sugar_percent_change
- bp_percent_change
- medication_delay
- trend_duration_months
- age

Not explained (but used):
- sex
- sugar_trend_up
- bp_trend_up

**Options**
- Add templates for missing features
- OR show disclaimer: "Some contributing factors not displayed"

---

## 7. DATA INTEGRITY & QUALITY CONTROLS

### 7.1 Deduplication & Validation

- Prevent identical vitals spam
- Optional validation rules (e.g., HR < 300)

---

### 7.2 Auditability

- Immutable historical records
- No silent overwrites

---

## 8. ADVANCED / HIGH-ROI FUTURE FEATURES (OPTIONAL)

### 8.1 Calibration & Model Health

- Calibration curves
- Drift detection
- Performance logging

---

### 8.2 Multi-Metric Trend Fusion

- Combine vitals + labs into composite trends
- Highlight divergence (e.g., BP stable, glucose worsening)

---

### 8.3 Patient Baseline Bands

- Show patient-specific historical normal range
- Highlight deviation from personal baseline

---

### 8.4 Alert Fatigue Controls

- Snooze alerts
- Escalation only if risk continues rising

---

## 9. FEATURES TO EXPLICITLY AVOID

- ❌ Diagnosis labels
- ❌ Treatment advice
- ❌ Chatbots in patient view
- ❌ Autonomous actions

---

## 10. BUILD PRIORITY ORDER (IMPORTANT)

1. Expose explanations to UI
2. Replace mock charts
3. Auto-generate alerts
4. Add risk velocity
5. Timeline cleanup
6. Auth enforcement

---

## 11. FINAL BUILD PRINCIPLE

> If the system cannot explain *why* risk changed over time, it is not clinical intelligence.

Always prioritize:
- Longitudinal reasoning
- Explainability
- Safety
- Trust

---

**This document should be loaded into the AI context before any new feature is built.**

