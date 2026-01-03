# Backend Architecture & Data Fabrication Plan  
## Clinical Intelligence Platform (Web App)

---

## 1. Backend Philosophy (READ FIRST)

This backend is **not a CRUD hospital app**.

Its single responsibility is:

> Convert scattered patient visits into a longitudinal timeline,  
> extract trends,  
> compute risk,  
> and explain *why* risk is rising.

❌ No diagnosis  
❌ No treatment decisions  
✅ Decision support only

---

## 2. High-Level Backend Architecture

```
[ External / Uploaded Data ]
        ↓
[ Ingestion Layer ]
        ↓
[ Normalization + Timeline Store ]
        ↓
[ Trend Extraction Engine ]
        ↓
[ Risk Scoring Engine ]
        ↓
[ Explanation Engine ]
        ↓
[ API Layer ]
        ↓
[ Web UI ]
```

Each box is **independently testable**.

---

## 3. Core Backend Services (Logical)

### 3.1 Ingestion Service
**Responsibility**
- Accept raw clinical inputs
- Do NOT interpret meaning

**Inputs**
- Manual form entry (for demo)
- CSV / JSON upload
- Synthetic data generator
- (Future: FHIR / HL7 adapters)

**Outputs**
- Clean, timestamped events

**Key Rule**
> Never overwrite history — events are immutable.

---

### 3.2 Patient Timeline Service (MOST IMPORTANT)

**Why**  
Current EMRs store rows.  
We store **stories**.

**Canonical Data Model**

```json
{
  "patient_id": "raj_001",
  "demographics": {
    "age": 52,
    "sex": "M"
  },
  "timeline": {
    "blood_sugar": [
      {"date": "2023-01-01", "value": 110},
      {"date": "2023-07-01", "value": 118},
      {"date": "2024-01-01", "value": 126},
      {"date": "2024-07-01", "value": 142}
    ],
    "blood_pressure": [
      {"date": "2023-01-01", "systolic": 130, "diastolic": 85},
      {"date": "2024-07-01", "systolic": 150, "diastolic": 95}
    ],
    "notes": [
      {"date": "2023-01-01", "text": "Borderline"}
    ],
    "medications": [
      {"date": "2024-07-01", "name": "Metformin"}
    ]
  }
}
```

**Used by**
- UI graphs
- Trend detector
- Risk engine

---

## 4. Data Storage Strategy

### 4.1 Database Choice (Early Phase)

**Recommended**
- PostgreSQL (JSONB columns)
- OR MongoDB (document-native)

**Why**
- Flexible schemas
- Timeline-friendly
- Easy iteration

---

### 4.2 Tables / Collections (Minimal)

#### patients
- patient_id (PK)
- demographics
- created_at

#### patient_events
- event_id (PK)
- patient_id (FK)
- event_type (lab / vital / note / medication)
- payload (JSON)
- timestamp

#### trend_features
- patient_id
- metric
- computed_at
- features (JSON)

#### risk_scores
- patient_id
- score
- level
- confidence
- computed_at

#### clinician_feedback (future)
- alert_id
- action (ack / dismiss)
- timestamp

---

## 5. Trend Extraction Engine (NO ML)

**Purpose**  
Turn raw timelines into **signals**.

**Output Example**
```json
{
  "metric": "blood_sugar",
  "trend_direction": "UP",
  "percent_change": 29,
  "slope": 0.8,
  "duration_months": 18,
  "persistence": true
}
```

**Algorithms**
- Percent change
- Linear regression slope
- Consecutive increase count
- Time window checks

---

## 6. Risk Scoring Engine (ML – Controlled)

**Purpose**  
Answer: *Given these trends, how concerned should we be?*

**Model Inputs**
```json
{
  "age": 52,
  "sugar_percent_change": 29,
  "sugar_trend_up": 1,
  "bp_trend_up": 1,
  "trend_duration_months": 18,
  "medication_delay": 1
}
```

**Outputs**
```json
{
  "risk_score": 0.78,
  "risk_level": "HIGH",
  "confidence": 0.82
}
```

**Model Order**
1. Logistic Regression
2. Gradient Boosted Trees
3. Small Neural Network (later)

---

## 7. Explanation Engine (NO ML)

**Purpose**  
Explain risk in plain language.

**Output Example**
```json
{
  "summary": [
    "Blood sugar increased 29% over 18 months",
    "Blood pressure rose across multiple visits",
    "Medication was initiated late"
  ]
}
```

**Rules**
- Facts only
- Time-aware
- No diagnosis
- No advice

---

## 8. Synthetic Data Fabrication Plan (CRITICAL)

### Phase 1: Manual Synthetic Generator

**Why**  
You cannot start with real hospital data.

**Rule Example**
```
IF percent_change > 25%
AND duration > 12 months
THEN label = 1
```

---

### Phase 2: Public Datasets (Later)

- MIMIC / eICU
- Convert rows → timelines
- Extract trends
- Label via outcomes

---

## 9. Backend API Design (Minimal)

- GET /patients/{id}/timeline
- GET /patients/{id}/trends
- GET /patients/{id}/risk
- POST /patients
- POST /events

---

## 10. Build Order (DO NOT SKIP)

1. Patient timeline data model
2. Event ingestion
3. Timeline visualization
4. Trend extraction
5. Synthetic data generator
6. Risk scoring
7. Explanation engine
8. Feedback loop

---

## 11. One-Line Summary

> This backend turns medical history into a computable timeline, detects slow deterioration, and explains *why* — safely.
