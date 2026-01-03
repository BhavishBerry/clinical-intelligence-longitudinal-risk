"""
FastAPI Backend - Clinical Intelligence Platform
=================================================
REST API for the clinical intelligence pipeline.

Endpoints (from Backend Architecture):
- GET  /patients/{id}/timeline  - Get patient timeline
- GET  /patients/{id}/trends    - Get computed trends
- GET  /patients/{id}/risk      - Get risk score + explanation
- POST /patients                - Create patient
- POST /events                  - Add event to timeline

Usage:
    uvicorn backend.main:app --reload --port 8000
"""

import json
import pickle
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our engines
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from explanation_engine import ExplanationEngine, load_feature_importance


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "synthetic"
MODELS_DIR = PROJECT_ROOT / "models"

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class TimelineEvent(BaseModel):
    date: str
    value: Optional[float] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    text: Optional[str] = None
    name: Optional[str] = None


class PatientTimeline(BaseModel):
    patient_id: str
    demographics: Dict[str, Any]
    timeline: Dict[str, List[Dict[str, Any]]]


class TrendFeatures(BaseModel):
    sugar_percent_change: Optional[float] = 0
    sugar_trend_up: Optional[int] = 0
    bp_percent_change: Optional[float] = 0
    bp_trend_up: Optional[int] = 0
    trend_duration_months: Optional[float] = 0
    medication_delay: Optional[int] = 0


class RiskResult(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float


class RiskWithExplanation(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    explanation: Dict[str, Any]


class EventInput(BaseModel):
    patient_id: str
    event_type: str  # blood_sugar, blood_pressure, note, medication
    date: str
    payload: Dict[str, Any]


# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="Clinical Intelligence Platform API",
    description="Longitudinal patient risk monitoring system",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# DATA LAYER
# =============================================================================

def load_patient(patient_id: str) -> Optional[Dict]:
    """Load patient timeline from JSON file."""
    timeline_dir = DATA_DIR / "timelines"
    patient_file = timeline_dir / f"{patient_id}.json"
    
    if not patient_file.exists():
        return None
    
    with open(patient_file) as f:
        return json.load(f)


def list_patients() -> List[str]:
    """List all patient IDs."""
    timeline_dir = DATA_DIR / "timelines"
    if not timeline_dir.exists():
        return []
    return [f.stem for f in timeline_dir.glob("*.json")]


def load_model():
    """Load the trained risk scoring model."""
    model_path = MODELS_DIR / "logistic_regression_model.pkl"
    scaler_path = MODELS_DIR / "logistic_regression_scaler.pkl"
    
    if not model_path.exists():
        return None, None
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    scaler = None
    if scaler_path.exists():
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
    
    return model, scaler


# Initialize model and explanation engine at startup
MODEL, SCALER = load_model()
FEATURE_IMPORTANCE = load_feature_importance() if (MODELS_DIR / "logistic_regression_metadata.json").exists() else {}
EXPLANATION_ENGINE = ExplanationEngine(feature_importance=FEATURE_IMPORTANCE)


# =============================================================================
# TREND EXTRACTION (Model 1 - NO ML)
# =============================================================================

def extract_trends(patient_data: Dict) -> Dict[str, Any]:
    """
    Extract trend features from patient timeline.
    This is Model 1 - Trend Detector (pure math, no ML).
    """
    timeline = patient_data.get("timeline", {})
    demographics = patient_data.get("demographics", {})
    
    features = {
        "age": demographics.get("age", 0),
        "sex": 1 if demographics.get("sex") == "M" else 0,
    }
    
    # Blood sugar trends
    blood_sugar = timeline.get("blood_sugar", [])
    if len(blood_sugar) >= 2:
        first = blood_sugar[0]["value"]
        last = blood_sugar[-1]["value"]
        features["sugar_percent_change"] = round(((last - first) / first) * 100, 1)
        features["sugar_trend_up"] = 1 if last > first else 0
        features["sugar_first"] = first
        features["sugar_last"] = last
        
        # Duration
        try:
            first_date = datetime.strptime(blood_sugar[0]["date"], "%Y-%m-%d")
            last_date = datetime.strptime(blood_sugar[-1]["date"], "%Y-%m-%d")
            features["trend_duration_months"] = round((last_date - first_date).days / 30)
        except:
            features["trend_duration_months"] = 0
    
    # Blood pressure trends
    blood_pressure = timeline.get("blood_pressure", [])
    if len(blood_pressure) >= 2:
        first = blood_pressure[0].get("systolic", 0)
        last = blood_pressure[-1].get("systolic", 0)
        if first > 0:
            features["bp_percent_change"] = round(((last - first) / first) * 100, 1)
            features["bp_trend_up"] = 1 if last > first else 0
    
    # Medication delay
    medications = timeline.get("medications", [])
    if medications and blood_sugar:
        try:
            med_date = datetime.strptime(medications[0]["date"], "%Y-%m-%d")
            first_date = datetime.strptime(blood_sugar[0]["date"], "%Y-%m-%d")
            months_to_med = (med_date - first_date).days / 30
            features["medication_delay"] = 1 if months_to_med > 12 else 0
        except:
            features["medication_delay"] = 0
    else:
        features["medication_delay"] = 0
    
    return features


# =============================================================================
# RISK SCORING (Model 2 - ML)
# =============================================================================

def score_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score patient risk using trained model.
    This is Model 2 - Risk Scoring Engine (ML).
    """
    if MODEL is None:
        return {"risk_score": 0.5, "risk_level": "UNKNOWN", "confidence": 0}
    
    # Prepare features in correct order
    feature_order = ["age", "sex", "sugar_percent_change", "sugar_trend_up",
                     "trend_duration_months", "bp_percent_change", "bp_trend_up",
                     "medication_delay"]
    
    import pandas as pd
    X = pd.DataFrame([{k: features.get(k, 0) for k in feature_order}])
    
    if SCALER:
        X = SCALER.transform(X)
    
    # Get prediction
    prob = MODEL.predict_proba(X)[0, 1]
    
    # Determine risk level
    if prob >= 0.7:
        level = "HIGH"
    elif prob >= 0.4:
        level = "MEDIUM"
    else:
        level = "LOW"
    
    return {
        "risk_score": round(float(prob), 2),
        "risk_level": level,
        "confidence": round(float(max(prob, 1 - prob)), 2)
    }


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/")
def root():
    return {
        "name": "Clinical Intelligence Platform API",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": MODEL is not None,
    }


@app.get("/patients")
def get_patients():
    """List all patients."""
    patient_ids = list_patients()
    return {"patients": patient_ids, "count": len(patient_ids)}


@app.get("/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: str):
    """Get patient timeline data."""
    patient = load_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@app.get("/patients/{patient_id}/trends")
def get_patient_trends(patient_id: str):
    """Get computed trend features for a patient."""
    patient = load_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    trends = extract_trends(patient)
    return {
        "patient_id": patient_id,
        "trends": trends,
        "computed_at": datetime.now().isoformat()
    }


@app.get("/patients/{patient_id}/risk")
def get_patient_risk(patient_id: str):
    """
    Get risk score and explanation for a patient.
    This is the main endpoint combining all 3 models:
    1. Trend Detector
    2. Risk Scorer
    3. Explanation Generator
    """
    patient = load_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    # Model 1: Extract trends
    trends = extract_trends(patient)
    
    # Model 2: Score risk
    risk = score_risk(trends)
    
    # Model 3: Generate explanation
    explanation = EXPLANATION_ENGINE.explain(trends, risk)
    
    return {
        "patient_id": patient_id,
        "demographics": patient.get("demographics", {}),
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "confidence": risk["confidence"],
        "explanation": {
            "summary": explanation["summary"],
            "description": explanation["risk_description"],
            "contributing_factors": explanation["contributing_factors"],
        },
        "trends": trends,
        "computed_at": datetime.now().isoformat()
    }


@app.get("/alerts")
def get_alerts():
    """Get all active risk alerts (patients with HIGH risk)."""
    alerts = []
    
    for patient_id in list_patients():
        patient = load_patient(patient_id)
        if not patient:
            continue
        
        trends = extract_trends(patient)
        risk = score_risk(trends)
        
        if risk["risk_level"] in ["HIGH", "MEDIUM"]:
            explanation = EXPLANATION_ENGINE.explain(trends, risk)
            alerts.append({
                "id": f"alert-{patient_id}",
                "patient_id": patient_id,
                "patient_name": f"Patient {patient_id.split('_')[1]}",
                "severity": "critical" if risk["risk_level"] == "HIGH" else "medium",
                "risk_score": risk["risk_score"],
                "title": f"{risk['risk_level']} Risk - Deterioration Detected",
                "explanation": "; ".join(explanation["summary"][:2]),
                "drivers": [
                    {"factor": f["display_name"], "detail": f["explanation"]}
                    for f in explanation["contributing_factors"][:3]
                ],
                "status": "active",
                "time": datetime.now().isoformat(),
            })
    
    # Sort by risk score
    alerts.sort(key=lambda x: x["risk_score"], reverse=True)
    return {"alerts": alerts[:20], "total": len(alerts)}


@app.post("/score")
def score_features(features: TrendFeatures):
    """Score risk from trend features directly."""
    feature_dict = features.model_dump()
    risk = score_risk(feature_dict)
    explanation = EXPLANATION_ENGINE.explain(feature_dict, risk)
    
    return {
        **risk,
        "explanation": explanation["summary"],
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🏥 Starting Clinical Intelligence Platform API...")
    print(f"   Model loaded: {MODEL is not None}")
    print(f"   Patients: {len(list_patients())}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
