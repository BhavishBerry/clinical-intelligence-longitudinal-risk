"""
Database API Routes - Clinical Intelligence Platform
=====================================================
CRUD operations for users, patients, vitals, and alerts.
"""

from typing import List, Optional
from datetime import datetime
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .database import get_db, User, Patient, Vital, Alert, RiskScore, Lab, ClinicalNote


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

# Patient
class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    sex: Optional[str] = None
    location: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    name: str
    age: Optional[int]
    sex: Optional[str]
    location: Optional[str]
    current_risk_score: float
    current_risk_level: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Vital
class VitalCreate(BaseModel):
    patient_id: str
    vital_type: str
    value: float
    value2: Optional[float] = None
    unit: Optional[str] = None
    recorded_at: Optional[datetime] = None

class VitalResponse(BaseModel):
    id: str
    patient_id: str
    vital_type: str
    value: float
    value2: Optional[float]
    unit: Optional[str]
    recorded_at: datetime
    
    class Config:
        from_attributes = True

# Alert
class AlertResponse(BaseModel):
    id: str
    patient_id: str
    severity: str
    title: str
    explanation: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Lab
class LabCreate(BaseModel):
    patient_id: str
    lab_type: str
    value: float
    unit: Optional[str] = None
    recorded_at: Optional[datetime] = None

class LabResponse(BaseModel):
    id: str
    patient_id: str
    lab_type: str
    value: float
    unit: Optional[str]
    recorded_at: datetime
    
    class Config:
        from_attributes = True

# Clinical Note
class ClinicalNoteCreate(BaseModel):
    patient_id: str
    note_type: Optional[str] = "observation"
    content: str

class ClinicalNoteResponse(BaseModel):
    id: str
    patient_id: str
    note_type: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter()


# -----------------------------------------------------------------------------
# AUTH
# -----------------------------------------------------------------------------

@router.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return token."""
    password_hash = sha256(request.password.encode()).hexdigest()
    
    user = db.query(User).filter(
        User.email == request.email,
        User.password_hash == password_hash
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Simple token (in production, use JWT)
    token = sha256(f"{user.id}:{datetime.utcnow().isoformat()}".encode()).hexdigest()
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }


# -----------------------------------------------------------------------------
# PATIENTS
# -----------------------------------------------------------------------------

@router.get("/db/patients", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    """List all patients from database."""
    patients = db.query(Patient).order_by(Patient.current_risk_score.desc()).all()
    return patients


@router.get("/db/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get a specific patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/db/patients", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient."""
    new_patient = Patient(
        name=patient.name,
        age=patient.age,
        sex=patient.sex,
        location=patient.location,
        current_risk_score=0.0,
        current_risk_level="low"
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient


@router.delete("/db/patients/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Delete a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted"}


# -----------------------------------------------------------------------------
# VITALS
# -----------------------------------------------------------------------------

@router.get("/db/patients/{patient_id}/vitals", response_model=List[VitalResponse])
def get_patient_vitals(patient_id: str, db: Session = Depends(get_db)):
    """Get all vitals for a patient."""
    vitals = db.query(Vital).filter(
        Vital.patient_id == patient_id
    ).order_by(Vital.recorded_at.desc()).all()
    return vitals


@router.post("/db/vitals", response_model=VitalResponse)
def create_vital(vital: VitalCreate, db: Session = Depends(get_db)):
    """Record a new vital sign and auto-compute risk score."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == vital.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    new_vital = Vital(
        patient_id=vital.patient_id,
        vital_type=vital.vital_type,
        value=vital.value,
        value2=vital.value2,
        unit=vital.unit,
        recorded_at=vital.recorded_at or datetime.utcnow()
    )
    db.add(new_vital)
    db.commit()
    db.refresh(new_vital)
    
    # Auto-compute risk score with ML model
    try:
        result = compute_risk_for_db_patient(vital.patient_id, db)
        if result:
            patient.current_risk_score = result["risk_score"]
            patient.current_risk_level = result["risk_level"].lower()
            
            # Store in risk_scores history
            risk_record = RiskScore(
                patient_id=vital.patient_id,
                risk_score=result["risk_score"],
                risk_level=result["risk_level"],
                model_used=result.get("model_used", "auto"),
                confidence=result.get("confidence", 0),
            )
            db.add(risk_record)
            db.commit()
    except Exception as e:
        # Don't fail the vital creation if risk scoring fails
        print(f"Warning: Auto risk scoring failed: {e}")
    
    return new_vital


# -----------------------------------------------------------------------------
# ALERTS
# -----------------------------------------------------------------------------

@router.get("/db/alerts", response_model=List[AlertResponse])
def list_alerts(status_filter: Optional[str] = "active", db: Session = Depends(get_db)):
    """List all alerts from database."""
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    
    alerts = query.order_by(Alert.created_at.desc()).all()
    return alerts


@router.get("/db/patients/{patient_id}/alerts", response_model=List[AlertResponse])
def get_patient_alerts(patient_id: str, db: Session = Depends(get_db)):
    """Get alerts for a specific patient."""
    alerts = db.query(Alert).filter(Alert.patient_id == patient_id).all()
    return alerts


@router.post("/db/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    """Acknowledge an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Alert acknowledged"}


@router.post("/db/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: str, db: Session = Depends(get_db)):
    """Dismiss an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "dismissed"
    db.commit()
    
    return {"message": "Alert dismissed"}


# -----------------------------------------------------------------------------
# RISK SCORES
# -----------------------------------------------------------------------------

@router.get("/db/patients/{patient_id}/risk-history")
def get_risk_history(patient_id: str, db: Session = Depends(get_db)):
    """Get risk score history for a patient."""
    scores = db.query(RiskScore).filter(
        RiskScore.patient_id == patient_id
    ).order_by(RiskScore.computed_at.desc()).limit(20).all()
    
    return [
        {
            "id": s.id,
            "risk_score": s.risk_score,
            "risk_level": s.risk_level,
            "model_used": s.model_used,
            "computed_at": s.computed_at.isoformat()
        }
        for s in scores
    ]


# -----------------------------------------------------------------------------
# LABS
# -----------------------------------------------------------------------------

@router.get("/db/patients/{patient_id}/labs", response_model=List[LabResponse])
def get_patient_labs(patient_id: str, db: Session = Depends(get_db)):
    """Get all lab results for a patient."""
    labs = db.query(Lab).filter(
        Lab.patient_id == patient_id
    ).order_by(Lab.recorded_at.desc()).all()
    return labs


@router.post("/db/labs", response_model=LabResponse)
def create_lab(lab: LabCreate, db: Session = Depends(get_db)):
    """Record a new lab result."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == lab.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    new_lab = Lab(
        patient_id=lab.patient_id,
        lab_type=lab.lab_type,
        value=lab.value,
        unit=lab.unit,
        recorded_at=lab.recorded_at or datetime.utcnow()
    )
    db.add(new_lab)
    db.commit()
    db.refresh(new_lab)
    
    return new_lab


# -----------------------------------------------------------------------------
# CLINICAL NOTES
# -----------------------------------------------------------------------------

@router.get("/db/patients/{patient_id}/notes", response_model=List[ClinicalNoteResponse])
def get_patient_notes(patient_id: str, db: Session = Depends(get_db)):
    """Get all clinical notes for a patient."""
    notes = db.query(ClinicalNote).filter(
        ClinicalNote.patient_id == patient_id
    ).order_by(ClinicalNote.created_at.desc()).all()
    return notes


@router.post("/db/notes", response_model=ClinicalNoteResponse)
def create_note(note: ClinicalNoteCreate, db: Session = Depends(get_db)):
    """Create a new clinical note."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    new_note = ClinicalNote(
        patient_id=note.patient_id,
        note_type=note.note_type,
        content=note.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return new_note


# -----------------------------------------------------------------------------
# RISK SCORING (ML Integration)
# -----------------------------------------------------------------------------

def compute_risk_for_db_patient(patient_id: str, db: Session) -> dict:
    """
    Compute risk score for a database patient using ML model.
    Converts DB vitals to features and calls the ML scoring service.
    """
    # Get patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return None
    
    # Get recent vitals
    vitals = db.query(Vital).filter(
        Vital.patient_id == patient_id
    ).order_by(Vital.recorded_at.desc()).limit(20).all()
    
    # Get labs for glucose readings
    labs = db.query(Lab).filter(
        Lab.patient_id == patient_id
    ).order_by(Lab.recorded_at.desc()).limit(10).all()
    
    # Extract latest values
    latest_glucose = None
    for v in vitals:
        if v.vital_type in ['glucose', 'blood_sugar']:
            latest_glucose = v.value
            break
    for l in labs:
        if l.lab_type in ['glucose', 'blood_sugar'] and latest_glucose is None:
            latest_glucose = l.value
            break
    
    latest_bp_systolic = None
    latest_bp_diastolic = None
    for v in vitals:
        if v.vital_type in ['bloodPressure', 'blood_pressure']:
            latest_bp_systolic = v.value
            latest_bp_diastolic = v.value2 or 80
            break
    
    latest_heart_rate = None
    for v in vitals:
        if v.vital_type in ['heartRate', 'heart_rate']:
            latest_heart_rate = v.value
            break
    
    latest_temp = None
    for v in vitals:
        if v.vital_type == 'temperature':
            latest_temp = v.value
            break
    
    # Build features for ML model
    # Compute simple trend indicators based on available data
    features = {
        "age": patient.age or 50,  # Default age if not set
        "sex": 1 if patient.sex == "M" else 0,
        "sugar_percent_change": 0,
        "sugar_trend_up": 0,
        "bp_percent_change": 0,
        "bp_trend_up": 0,
        "trend_duration_months": 0,
        "medication_delay": 0,
    }
    
    # Calculate glucose trend if we have data
    if latest_glucose:
        # Elevated glucose increases risk
        if latest_glucose > 140:
            features["sugar_percent_change"] = ((latest_glucose - 100) / 100) * 100
            features["sugar_trend_up"] = 1
    
    # Calculate BP trend if we have data
    if latest_bp_systolic:
        if latest_bp_systolic > 140:
            features["bp_percent_change"] = ((latest_bp_systolic - 120) / 120) * 100
            features["bp_trend_up"] = 1
    
    # Add heart rate and temp as risk factors
    risk_multiplier = 1.0
    if latest_heart_rate and latest_heart_rate > 100:
        risk_multiplier *= 1.1  # Elevated HR increases risk
    if latest_temp and latest_temp > 38:
        risk_multiplier *= 1.2  # Fever increases risk
    
    # Try to use the ML model service
    try:
        from .main import score_risk, EXPLANATION_ENGINE
        result = score_risk(features)
        
        # Apply risk multiplier for additional factors
        base_score = result["risk_score"]
        adjusted_score = min(base_score * risk_multiplier, 1.0)
        
        # Adjust level based on score
        if adjusted_score >= 0.7:
            level = "HIGH"
        elif adjusted_score >= 0.4:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return {
            "risk_score": round(adjusted_score, 2),
            "risk_level": level,
            "confidence": result.get("confidence", 0.8),
            "model_used": result.get("model_used", "general"),
            "features_used": features,
        }
    except Exception as e:
        # Fallback: Simple rule-based scoring with calibrated weights
        score = 0.15  # Base risk
        
        # Glucose/Sugar factors (labs)
        if latest_glucose and latest_glucose > 126:
            score += 0.12  # Pre-diabetic
        if latest_glucose and latest_glucose > 180:
            score += 0.15  # Diabetic range
        
        # Blood pressure factors
        if latest_bp_systolic and latest_bp_systolic > 130:
            score += 0.08  # Elevated
        if latest_bp_systolic and latest_bp_systolic > 140:
            score += 0.10  # High
        
        # Heart rate factor
        if latest_heart_rate and latest_heart_rate > 100:
            score += 0.08  # Tachycardia
        
        # Temperature factor
        if latest_temp and latest_temp >= 38:
            score += 0.10  # Fever
        
        # Age factor for elderly
        if patient.age and patient.age > 65:
            score += 0.08
        
        # Cap at reasonable maximum (85% - very high risk but not 100%)
        score = min(score, 0.85)
        
        if score >= 0.7:
            level = "HIGH"
        elif score >= 0.4:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return {
            "risk_score": round(score, 2),
            "risk_level": level,
            "confidence": 0.6,  # Lower confidence for rule-based
            "model_used": "rule_based_fallback",
            "features_used": features,
            "fallback_reason": str(e),
        }


@router.post("/db/patients/{patient_id}/compute-risk")
def compute_patient_risk(patient_id: str, db: Session = Depends(get_db)):
    """
    Compute and update risk score for a patient using ML model.
    This endpoint fetches vitals from DB, runs ML scoring, and updates patient record.
    """
    # Compute risk
    result = compute_risk_for_db_patient(patient_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update patient record
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    patient.current_risk_score = result["risk_score"]
    patient.current_risk_level = result["risk_level"].lower()
    
    # Store in risk_scores history
    risk_record = RiskScore(
        patient_id=patient_id,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        model_used=result.get("model_used", "unknown"),
        confidence=result.get("confidence", 0),
    )
    db.add(risk_record)
    db.commit()
    
    return {
        "patient_id": patient_id,
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "model_used": result.get("model_used"),
        "computed_at": datetime.utcnow().isoformat(),
    }
