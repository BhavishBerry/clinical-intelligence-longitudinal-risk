# Clinical Intelligence Platform for Longitudinal Patient Risk Monitoring

> An AI-powered early-warning intelligence layer that continuously monitors patients over time and alerts clinicians when slow, silent deterioration is happening.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Active-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/python-3.10+-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal.svg)]()
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)]()

---

## 🩺 The Problem

**Doctors see patients as isolated visits, but disease progression happens over time — and current systems fail to connect those dots.**

### Real-World Scenario

Consider a patient visiting a clinic over two years:

| Visit | Date | Blood Sugar | Blood Pressure | Observation |
|-------|------|-------------|----------------|-------------|
| 1 | Jan 2023 | 110 | 130/85 | Borderline glucose |
| 2 | Jul 2023 | 118 | 135/88 | Slight increase |
| 3 | Jan 2024 | 126 | 140/92 | Possible pre-diabetes |
| 4 | Jul 2024 | 142 | 150/95 | Medication started |

**What went wrong?**
- Each visit was treated independently
- No system highlighted long-term deterioration
- Risk accumulated silently over **18 months**
- Early intervention opportunity was **missed**

> **Trajectory matters more than thresholds.**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLINICAL INTELLIGENCE PLATFORM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   FRONTEND  │    │   BACKEND   │    │  DATABASE   │    │  ML MODELS  │   │
│  │  (React)    │◄──►│  (FastAPI)  │◄──►│  (SQLite)   │    │  (Sklearn)  │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘   │
│        │                   │                   │                  │          │
│        │                   │                   │                  │          │
│  ┌─────▼─────────────────────────────────────────────────────────▼─────┐    │
│  │                         6-STAGE PIPELINE                              │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │  │ 1.  │  │ 2.  │  │ 3.  │  │ 4.  │  │ 5.  │  │ 6.  │              │    │
│  │  │Data │─►│Trend│─►│Risk │─►│Alert│─►│Expl │─►│Feed │              │    │
│  │  │Ingest│  │Detect│  │Score│  │Gen  │  │Engine│  │back │              │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 6-Stage Clinical Intelligence Pipeline

### Stage 1: Data Ingestion & Normalization
**Purpose:** Collect and normalize patient data from multiple sources

| Data Type | Format | Storage |
|-----------|--------|---------|
| Vitals | BP, Heart Rate, Temperature, SpO2 | `vitals` table |
| Labs | Glucose, Creatinine, Cholesterol, HbA1c | `labs` table |
| Clinical Notes | Doctor observations, procedures | `clinical_notes` table |
| CSV Bulk Import | MRN-based batch uploads | Validated via `ClinicalImporter` |

**Validation Rules:**
- Blood Pressure: Systolic must be > Diastolic
- Temperature: 35°C - 42°C range
- Heart Rate: 30 - 200 bpm
- Timestamps: Cannot be in the future

### Stage 2: Trend Detection (No ML)
**Purpose:** Extract mathematical trends from time-series data

```python
# Pure math computation - no ML involved
features = {
    "sugar_percent_change": (latest - earliest) / earliest * 100,
    "sugar_trend_up": 1 if latest > earliest else 0,
    "bp_velocity": daily_change_rate,
    "bp_volatility": standard_deviation,
    "trend_duration_months": time_span_in_months,
    "medication_delay": days_until_intervention
}
```

### Stage 3: Risk Scoring (ML Model)
**Purpose:** Predict patient deterioration probability

| Component | Description |
|-----------|-------------|
| **Model Type** | Gradient Boosting Classifier (scikit-learn) |
| **Training Data** | Synthetic longitudinal patient data |
| **Input Features** | 12 trend features (glucose, BP, age, etc.) |
| **Output** | Risk probability (0.0 - 1.0) |
| **Model Routing** | Auto-selects: diabetes, cardiac, or general model |

**Risk Levels:**
| Score Range | Level | Clinical Action |
|-------------|-------|-----------------|
| 0.0 - 0.3 | LOW | Routine monitoring |
| 0.3 - 0.5 | MEDIUM | Enhanced surveillance |
| 0.5 - 0.7 | HIGH | Alert generated |
| 0.7 - 1.0 | CRITICAL | Immediate review |

### Stage 4: Alert Generation
**Purpose:** Notify clinicians of concerning patients

**Trigger Logic:**
```python
if risk_level in ["HIGH", "CRITICAL"]:
    if no_active_alert_for_patient():
        create_alert(
            severity=risk_level.lower(),
            title=f"{risk_level} Risk Detected",
            explanation=contributing_factors,
            auto_generated=True
        )
```

**Deduplication:** 
- Checks for existing active alerts per patient
- Prevents alert fatigue from repeated triggers

### Stage 5: Explanation Engine
**Purpose:** Generate human-readable explanations for risk scores

**Example Output:**
```json
{
  "summary": [
    "Blood glucose 156 mg/dL exceeds normal (>140)",
    "Systolic BP 148 mmHg is elevated (>140)",
    "Advanced age (68 years) increases baseline risk"
  ],
  "contributing_factors": [
    {"feature": "glucose", "value": 156, "severity": "high"},
    {"feature": "blood_pressure", "value": 148, "severity": "medium"},
    {"feature": "age", "value": 68, "severity": "low"}
  ]
}
```

### Stage 6: Feedback Loop
**Purpose:** Improve model with clinician feedback

| Feedback Type | Values | Storage |
|---------------|--------|---------|
| Alert Helpfulness | `helpful` / `not_helpful` | `alerts.feedback` column |

---

## 📁 Complete Project Structure

```
clinical_intelligence_platform/
├── backend/
│   ├── main.py                 # FastAPI app initialization, CORS, JSON patient API
│   ├── database.py             # SQLAlchemy models (User, Patient, Vital, Alert, Lab, etc.)
│   ├── routes.py               # Database CRUD API (52 endpoints)
│   ├── auth.py                 # JWT authentication + RBAC (require_admin/doctor/nurse)
│   └── utils/
│       └── importer.py         # ClinicalImporter for CSV bulk upload with validation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/         # TimelineChart, RiskGauge, VitalsChart
│   │   │   ├── clinical/       # RiskDriversPanel, SafetyDisclaimer, AlertCard
│   │   │   ├── patient/        # PatientCard, RiskBadge, AddPatientModal
│   │   │   └── ui/             # Button, Card, Badge, Input (shadcn-style)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx      # JWT token management
│   │   │   ├── PatientContext.tsx   # Patient state + API integration
│   │   │   └── AlertContext.tsx     # Alert state + feedback persistence
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx    # Patient overview with risk distribution
│   │   │   ├── PatientDetailPage.tsx # Full patient view with charts
│   │   │   ├── AlertsPage.tsx       # Alert management workflow
│   │   │   ├── SettingsPage.tsx     # Config toggles (admin only)
│   │   │   ├── UploadPage.tsx       # CSV import with preview
│   │   │   └── LoginPage.tsx        # Authentication
│   │   └── services/
│   │       └── api.ts          # Typed API client with auth headers
│   └── package.json
│
├── scripts/
│   ├── generate_synthetic_data.py   # Creates training data
│   ├── train_risk_model.py          # Trains ML models
│   └── explanation_engine.py        # Feature importance extraction
│
├── models/
│   ├── diabetes_model.pkl           # Diabetes-specific risk model
│   ├── cardiac_model.pkl            # Cardiac risk model
│   ├── general_model.pkl            # General population model
│   └── logistic_regression_scaler.pkl
│
├── alembic/
│   └── versions/                    # Database migrations
│       ├── 775d9d6a123b_initial.py
│       ├── fa8a5d1f08f3_add_app_config.py
│       ├── a794e469f31e_add_mrn_to_patients.py
│       └── 1ca59bbe2e79_add_feedback_to_alerts.py
│
├── data/
│   └── clinical.db                  # SQLite database
│
└── requirements-data.txt            # Python dependencies
```

---

## 🔐 Security & Authentication

### JWT-Based Authentication
```
Authorization: Bearer <token>
```

**Token Contents:**
```json
{
  "user_id": "uuid",
  "email": "doctor1@hospital",
  "role": "doctor",
  "exp": 1704499200
}
```

### Role-Based Access Control (RBAC)

| Endpoint | Admin | Doctor | Nurse | Public |
|----------|:-----:|:------:|:-----:|:------:|
| `POST /db/patients` | ✅ | ✅ | ❌ | ❌ |
| `DELETE /db/patients/{id}` | ✅ | ❌ | ❌ | ❌ |
| `POST /db/vitals` | ✅ | ✅ | ✅ | ❌ |
| `POST /db/labs` | ✅ | ✅ | ✅ | ❌ |
| `POST /db/notes` | ✅ | ✅ | ✅ | ❌ |
| `POST /db/alerts/{id}/acknowledge` | ✅ | ✅ | ✅ | ❌ |
| `POST /db/alerts/{id}/dismiss` | ✅ | ✅ | ❌ | ❌ |
| `POST /db/alerts/{id}/feedback` | ✅ | ✅ | ✅ | ❌ |
| `POST /db/config` | ✅ | ❌ | ❌ | ❌ |
| `POST /upload/import` | ✅ | ❌ | ❌ | ❌ |
| `GET /db/patients` | ✅ | ✅ | ✅ | ❌ |
| `GET /db/alerts` | ✅ | ✅ | ✅ | ❌ |

---

## 📊 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   patients  │       │    vitals   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │◄──────│ patient_id  │
│ email       │◄──────│ created_by  │       │ vital_type  │
│ password_hash│       │ name        │       │ value       │
│ name        │       │ age         │       │ value2      │
│ role        │       │ sex         │       │ unit        │
│ created_at  │       │ location    │       │ recorded_at │
└─────────────┘       │ mrn         │       └─────────────┘
                      │ current_risk│              │
                      │ risk_level  │              │
                      └─────────────┘              │
                            │                      │
              ┌─────────────┼─────────────┐       │
              │             │             │       │
              ▼             ▼             ▼       │
        ┌───────────┐ ┌───────────┐ ┌───────────┐│
        │   alerts  │ │   labs    │ │risk_scores││
        ├───────────┤ ├───────────┤ ├───────────┤│
        │ patient_id│ │ patient_id│ │ patient_id││
        │ severity  │ │ lab_type  │ │ risk_score││
        │ title     │ │ value     │ │ risk_level││
        │ explanation│ │ unit      │ │ model_used││
        │ status    │ │ recorded_at│ │ confidence││
        │ feedback  │ └───────────┘ │ computed_at│
        │ auto_gen  │               └───────────┘
        │ risk_snap │
        └───────────┘

        ┌───────────────┐    ┌───────────────┐
        │clinical_notes │    │  app_config   │
        ├───────────────┤    ├───────────────┤
        │ patient_id    │    │ key (PK)      │
        │ note_type     │    │ value         │
        │ content       │    │ updated_at    │
        │ created_by    │    └───────────────┘
        │ created_at    │
        └───────────────┘
```

---

## 🚀 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login and receive JWT token |

### Patients
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/db/patients` | List all patients | Nurse+ |
| GET | `/db/patients/{id}` | Get patient details | Nurse+ |
| POST | `/db/patients` | Create patient | Doctor+ |
| DELETE | `/db/patients/{id}` | Delete patient | Admin |

### Vitals & Labs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/db/patients/{id}/vitals` | Get patient vitals | Nurse+ |
| POST | `/db/vitals` | Record vital (auto-triggers risk calc) | Nurse+ |
| GET | `/db/patients/{id}/labs` | Get patient labs | Nurse+ |
| POST | `/db/labs` | Record lab result | Nurse+ |

### Alerts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/db/alerts` | List all alerts | Nurse+ |
| GET | `/db/patients/{id}/alerts` | Patient alerts | Nurse+ |
| POST | `/db/alerts/{id}/acknowledge` | Acknowledge alert | Nurse+ |
| POST | `/db/alerts/{id}/dismiss` | Dismiss alert | Doctor+ |
| POST | `/db/alerts/{id}/feedback` | Set helpful/not_helpful | Nurse+ |

### Risk Scoring
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/db/patients/{id}/risk-history` | Get risk score history | Nurse+ |
| POST | `/db/patients/{id}/compute-risk` | Manually trigger risk calc | Doctor+ |

### Data Import
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/upload/preview` | Validate CSV without saving | Public |
| POST | `/upload/import` | Import CSV data | Admin |

### Configuration
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/db/config` | Get app configuration | Public |
| POST | `/db/config` | Update configuration | Admin |

---

## 🖥️ Frontend Pages

### 1. Dashboard (`/`)
- **Patient Cards** with risk score badges
- **Risk Distribution Pie Chart** (Low/Medium/High/Critical)
- **Search & Sort** by name, risk level
- **Add Patient Modal**
- **Active Alert Count**

### 2. Patient Detail (`/patients/:id`)
- **Risk Score Gauge** (0-100%)
- **Risk Velocity Indicator** (stable/worsening/deteriorating)
- **Risk Drivers Panel** with contributing factors
- **Vitals Charts** (Glucose, BP, Heart Rate)
- **Labs Charts** (Creatinine, Cholesterol)
- **Risk History Chart**
- **Timeline View** (vitals, labs, notes grouped by day)
- **Record Data Form** (add vitals, labs, notes)
- **Recompute Risk Button**

### 3. Alerts (`/alerts`)
- **Filter Tabs** (All/Active/Acknowledged/Dismissed)
- **Alert Cards** with severity badges
- **Bot Badge** for auto-generated alerts
- **Acknowledge/Dismiss Actions**
- **Feedback Buttons** (Helpful/Not Helpful)
- **Link to Patient**

### 4. Settings (`/settings`) - Admin Only
- **Enable Alerts Toggle** (global on/off)
- **Enable Risk Scoring Toggle**
- **Reset Session Button**

### 5. Upload (`/upload`) - Admin Only
- **File Upload** (CSV/Excel)
- **Preview Validation** (shows valid/invalid rows)
- **Import Button** (commits to database)
- **Error Details** per row

### 6. Login (`/login`)
- **Email/Password Form**
- **Role Display** after login

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/BhavishBerry/clinical-intelligence-longitudinal-risk.git
cd clinical-intelligence-longitudinal-risk
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements-data.txt

# Initialize database (creates tables + demo data)
python -m backend.database --init --seed

# Start the backend server
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

### 4. Access the Application
| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Docs (ReDoc)** | http://localhost:8000/redoc |

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor1@hospital | password |
| Nurse | nurse1@hospital | password |
| Admin | admin@hospital | adminpass |

---

## 📈 Data Flow: End-to-End Example

### 1. Nurse Records Vital
```
POST /db/vitals
{
  "patient_id": "patient-1",
  "vital_type": "blood_sugar",
  "value": 185,
  "unit": "mg/dL"
}
```

### 2. Backend Auto-Computes Risk
```python
# Triggered automatically after vital insert
result = compute_risk_for_db_patient(patient_id, db)
# Returns: {"risk_score": 0.72, "risk_level": "HIGH", "explanation": {...}}
```

### 3. Risk Score Saved to History
```sql
INSERT INTO risk_scores (patient_id, risk_score, risk_level, model_used)
VALUES ('patient-1', 0.72, 'HIGH', 'diabetes');
```

### 4. Alert Auto-Generated (if HIGH/CRITICAL)
```sql
INSERT INTO alerts (patient_id, severity, title, auto_generated)
VALUES ('patient-1', 'high', 'HIGH Risk Detected', true);
```

### 5. Frontend Displays Alert
```
🔔 HIGH Risk Detected
   Patient: Raj Kumar
   Contributing Factors:
   • Blood glucose 185 mg/dL exceeds normal (>140)
   
   [Acknowledge] [Dismiss] [👍 Helpful] [👎 Not Helpful]
```

---

## 🧪 Testing

### Backend API Tests
```bash
# Test endpoint returns 401 without auth
curl -X POST http://localhost:8000/db/patients -H "Content-Type: application/json"
# Expected: {"detail":"Authentication required"}

# Test with auth
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor1@hospital","password":"password"}'
```

### Frontend Type Check
```bash
cd frontend
npx tsc --noEmit
```

### CSV Import Validation
```bash
# Preview without committing
curl -X POST -F "file=@test.csv" http://localhost:8000/upload/preview
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 The Real-World Impact

> **Hospitals don't lose patients because they lack data. They lose patients because risk is detected too late and slow deterioration goes unnoticed.**

This platform functions as an **early-warning intelligence layer** for clinical decision support.

---

<p align="center">
  <strong>An AI system that continuously watches patients over time and warns clinicians when slow, silent deterioration is happening.</strong>
</p>
