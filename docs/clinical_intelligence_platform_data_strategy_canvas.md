# Clinical Intelligence Platform
## Data Strategy Canvas (Structured)

---

## 1. Purpose of This Canvas

This document defines **how data enters the system, how it is transformed, stored, and governed**, and how it safely flows into intelligence layers.

This is the **data backbone** of the platform.

---

## 2. Design Principles (Non-Negotiable)

1. **Patient = Timeline, not records**  
2. **Events over states** (append-only, time-stamped)
3. **Raw data is preserved, never overwritten**
4. **Processed data is explainable and auditable**
5. **AI never consumes raw documents directly**

---

## 3. Data Acquisition Plan

### 3.1 Primary Data Sources

| Source | Data Type | Frequency | Notes |
|-----|---------|-----------|------|
| EMR / EHR | Demographics, visits, notes | Event-based | FHIR / HL7 compatible |
| Lab Systems | Lab results | Irregular | High clinical importance |
| Bedside Monitors | Vitals | High frequency | ICU / ward |
| Pharmacy | Med orders | Event-based | Contextual modifier |
| Radiology | Text reports | Event-based | Parsed selectively |

---

### 3.2 Acquisition Modes

- **Batch ingestion** (historical backfill)
- **Near-real-time streaming** (inpatient monitoring)
- **Event-triggered ingestion** (labs, procedures)

All data is time-stamped at **source + ingestion time**.

---

## 4. Raw Data Layer (Immutable)

### What Lives Here
- PDFs (lab reports)
- Clinical notes
- Discharge summaries
- Imaging reports (text)

### Characteristics
- Read-only
- Legally auditable
- No transformation

### Storage
- Object / blob storage
- Linked by patient_id + encounter_id

---

## 5. Processing & Normalization Layer

### Purpose
Convert messy clinical inputs into **atomic, structured events**.

### Processing Steps
1. Text extraction (if needed)
2. Unit normalization
3. Metric standardization
4. Timestamp alignment
5. Source tagging

---

## 6. Structured Event Store (Canonical Layer)

### Event Types

1. **Patient Context Events**
2. **Encounter Metadata Events**
3. **Measurement Events**
4. **Intervention Events**
5. **Derived Note Signals**
6. **Outcome Events**

Each event is:
- JSON-based
- Append-only
- Independently meaningful

This layer defines the **patient timeline**.

---

## 7. Patient Timeline Assembly

Timeline is created by:
- Ordering all events by timestamp
- Grouping by patient_id
- Linking events to encounters (when available)

No aggregation happens here.

---

## 8. Feature Extraction Layer

### Purpose
Convert timelines → **numerical representations of change**.

### Feature Classes

- Trend direction (↑ ↓ →)
- Rate of change (slope)
- Trend persistence
- Volatility
- Deviation from patient baseline

### Important Rule
Features are **computed, not stored permanently**.

---

## 9. Intelligence & Risk Layer (Downstream Consumer)

Consumes:
- Feature outputs
- Patient context
- Intervention context

Produces:
- Risk scores
- Risk trajectories
- Confidence levels

No raw documents or free text reach this layer.

---

## 10. Explainability Data Layer

### Purpose
Answer: *Why did this alert fire?*

### Inputs
- Feature contributions
- Time windows
- Event references

### Outputs
- Structured explanations
- Human-readable summaries

Stored separately for audit and trust.

---

## 11. Feedback & Outcome Data

### Collected Signals
- Alert acknowledged / dismissed
- Action taken
- Clinical outcome events

### Usage
- Evaluation
- Calibration
- Threshold tuning

Never used in real-time prediction.

---

## 12. End-to-End Data Flow Diagram

```
Clinical Systems
   ↓
Raw Documents (PDFs / Notes)
   ↓
Normalization & Parsing
   ↓
Structured JSON Events
   ↓
Patient Timeline (ordered events)
   ↓
Feature Extraction (temporal)
   ↓
Risk Reasoning Engine
   ↓
Explainable Alerts
   ↓
Clinician Action
   ↓
Feedback & Outcomes
```

---

## 13. Data Governance & Safety

- Strict schema validation
- Versioned event formats
- Append-only logs
- Clear separation of layers
- No autonomous decisions

---

## 14. What This Architecture Enables

- Longitudinal reasoning
- Early deterioration detection
- Safe explainability
- Reprocessing with new logic
- Regulatory auditability

---

## 15. Final Lock-In Insight

> **Documents are evidence.**  
> **Events are truth.**  
> **Timelines create intelligence.**

This canvas defines the foundation of the platform.
