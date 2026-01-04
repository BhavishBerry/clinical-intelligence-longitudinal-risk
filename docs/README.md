# Clinical Intelligence Platform for Longitudinal Patient Risk Monitoring

> An AI-powered early-warning intelligence layer that continuously monitors patients over time and alerts clinicians when slow, silent deterioration is happening.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)]()
[![Python](https://img.shields.io/badge/python-3.10+-brightgreen.svg)]()

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

---

## ❌ Why Current Systems Fail

### 1. EMRs Store Data, Not Meaning
- Lab values, notes, and prescriptions are stored
- **No reasoning over time** — no trajectory awareness
- Doctors see isolated numbers, not evolution

### 2. Humans Are Bad at Trend Detection
- Doctors see dozens of patients daily
- Cannot mentally plot multi-year trends
- Slow deterioration is easily missed

### 3. Rule-Based Alerts Are Insufficient
Traditional logic: `IF glucose > 140 → alert`

But this **misses**:
```
110 → 118 → 126 → 142 (over time)
```

> **Trajectory matters more than thresholds.**

---

## ✅ The Solution

This platform answers a critical question:

> **"Is this patient getting worse over time, even if nothing looks dangerous today?"**

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Longitudinal Tracking** | Treat patients as continuous stories, not isolated records |
| **Trend-Based Reasoning** | Analyze direction, rate, and duration of changes |
| **Explainable Alerts** | No black-box outputs — explain what changed, over how long, and why it matters |
| **Actionable Insights** | Risk levels, trend explanations, and timeline visualizations |

---

## 🔧 How It Works

### 1. Longitudinal Data Ingestion
Ingests multiple data types:
- Lab reports (PDFs)
- Vitals
- Visit notes
- Prescriptions
- Dates

Data is organized by **patient** and **timeline**.

### 2. Normalize and Track Trends
For each patient, the system tracks:
- Blood glucose
- Blood pressure
- Cholesterol
- Other key biomarkers

Computing:
- Direction of change
- Rate of change
- Duration of abnormal trend

### 3. Risk Reasoning (Core Intelligence)
Instead of hard threshold rules, the system reasons:

```
IF a metric is consistently worsening
AND the duration exceeds a meaningful window
AND patient context increases risk
THEN overall risk is escalating
```

### 4. Explainability
Every alert includes:
- What changed
- Over how long
- Why it matters

**Example:**
> Blood glucose increased 29% over 18 months. Blood pressure rose steadily across four visits. No medication intervention during this period.

### 5. Actionable Output
The system produces:
- **Risk Level:** Low / Medium / High
- **Trend Explanation:** Human-readable insights
- **Timeline Visualization:** Visual progression
- **Suggested Clinical Review:** (not diagnosis)

---

## 📊 Example Output

```
Patient: Raj
Risk Level: High (↑ from Medium)

Key Drivers:
  • Sustained glucose increase
  • Rising blood pressure trend
  • Delayed intervention
```

---

## 🎯 Use Cases

### Metabolic Risk Monitoring
Track glucose, blood pressure, and cholesterol trends to catch pre-diabetes and cardiovascular risk early.

### Renal Function Monitoring
Detect slow but consistent creatinine increases (e.g., 0.9 → 1.1 → 1.3) before irreversible kidney damage.

### General Chronic Disease Management
Monitor any biomarker trajectory for patients with chronic conditions.

---

## 🏗️ Project Scope

This is a **large, serious project** requiring:

- [ ] Persistent patient timelines
- [ ] Temporal reasoning logic
- [ ] Risk aggregation strategies
- [ ] Explainable alerts
- [ ] Safety-first outputs
- [ ] Feedback and evaluation loops

> **Note:** This is weeks of system thinking, not a quick demo.

---

## 📁 Project Structure

```
clinical_intelligence_platform/
├── backend/                    # FastAPI backend
│   ├── main.py                 # Main application entry point
│   ├── database.py             # SQLite/PostgreSQL database models
│   └── routes.py               # REST API endpoints
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── charts/         # TimelineChart, RiskGauge
│   │   │   ├── clinical/       # RiskDriverPanel, SafetyDisclaimer, etc.
│   │   │   ├── patient/        # PatientCard, RiskBadge, etc.
│   │   │   └── ui/             # Button, Card, Badge, etc.
│   │   ├── context/            # AuthContext, PatientContext, AlertContext
│   │   ├── pages/              # DashboardPage, PatientDetailPage, AlertsPage
│   │   └── services/           # API service layer
│   └── package.json
├── scripts/                    # Data and training scripts
│   ├── generate_synthetic_data.py
│   ├── train_risk_model.py
│   └── explanation_engine.py
├── models/                     # Trained ML models (.pkl files)
├── docs/                       # Documentation
├── data/                       # Database files
└── requirements-data.txt       # Python dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/clinical-intelligence-platform.git
cd clinical-intelligence-platform
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements-data.txt

# Start the backend server
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

### 4. Access the Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor1@hospital | password |
| Nurse | nurse1@hospital | password |
| Admin | admin@hospital | adminpass |

---

## 🆕 New Features (Phase 6 UI Enhancements)

### Clinical Risk Reasoning
- **Risk Driver Panel** - Shows why risk changed with contributing factors
- **Confidence Indicator** - Displays model confidence level
- **Risk Velocity Badge** - Shows if patient is stable, worsening, or rapidly deteriorating

### Event-Context Integration
- **Event-Anchored Graphs** - Vertical markers on timeline for clinical events
- **Patient Baseline Bands** - Personal norm shading on charts
- **Data Provenance** - Shows timestamp, source, and who entered each data point

### Timeline & Dashboard
- **Time Window Selector** - Filter charts by 24h, 7d, 30d, 6mo, or all time
- **Event Grouping** - Collapsible groups of related timeline events
- **"Getting Worse" Sort Mode** - Prioritize patients with rapidly increasing risk

### Safety Guardrails
- **Decision Support Disclaimer** - Clinical decision support footer on all pages
- **Structured Note Tags** - Safe clinical context signals without diagnosis
- **"Why this alert?" Tooltip** - Explains alert trigger conditions

---

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 References

- [Clinical Intelligence Platform Problem Statement (PDF)](./Clinical%20Intelligence%20Platform%20for%20Longitudinal%20Patient%20Risk%20Monitoring.pdf)
- [Problem Dry Run](./clinical_intelligence_platform_problem_dry_run.md)

---

## 💡 The Real-World Impact

> **Hospitals don't lose patients because they lack data. They lose patients because risk is detected too late and slow deterioration goes unnoticed.**

This platform functions as an **early-warning intelligence layer** for clinical decision support.

---

<p align="center">
  <strong>An AI system that continuously watches patients over time and warns clinicians when slow, silent deterioration is happening.</strong>
</p>
