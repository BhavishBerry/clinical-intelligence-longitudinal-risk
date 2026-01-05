"""
Database API Routes - Clinical Intelligence Platform
=====================================================
CRUD operations for users, patients, vitals, and alerts.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from hashlib import sha256
import json

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .database import get_db, User, Patient, Vital, Alert, RiskScore, Lab, ClinicalNote, AppConfig
from .utils.importer import ClinicalImporter
from .auth import verify_token, get_optional_user, require_role, require_admin, require_doctor, require_nurse, TokenData, create_access_token


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def calculate_risk_velocity(db: Session, patient_id: str) -> tuple:
    """
    TASK-4.1: Calculate risk velocity (rate of change) from risk history.
    Returns (velocity_category, daily_change_rate)
    
    Categories:
    - rapid_deterioration: daily change > 0.05 (5%)
    - slowly_worsening: daily change > 0.01 (1%)
    - stable: daily change between -0.01 and 0.01
    - improving: daily change < -0.01
    - unknown: insufficient data
    """
    # Get last 5 risk scores ordered by date
    recent_scores = db.query(RiskScore).filter(
        RiskScore.patient_id == patient_id
    ).order_by(RiskScore.computed_at.asc()).limit(10).all()
    
    if len(recent_scores) < 2:
        return ("unknown", 0.0)
    
    # Use last 5 readings
    recent = recent_scores[-5:] if len(recent_scores) >= 5 else recent_scores
    
    first_score = recent[0].risk_score
    last_score = recent[-1].risk_score
    
    # Calculate time difference in days
    time_diff = (recent[-1].computed_at - recent[0].computed_at).total_seconds() / 86400  # days
    
    if time_diff < 0.001:  # Less than ~1.5 minutes
        time_diff = 1  # Assume 1 day to avoid division by zero
    
    daily_change = (last_score - first_score) / time_diff
    
    # Categorize velocity
    if daily_change > 0.05:
        return ("rapid_deterioration", round(daily_change, 4))
    elif daily_change > 0.01:
        return ("slowly_worsening", round(daily_change, 4))
    elif daily_change < -0.01:
        return ("improving", round(daily_change, 4))
    else:
        return ("stable", round(daily_change, 4))


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

# Config
class ConfigUpdateRequest(BaseModel):
    key: str
    value: str

class UserListResponse(UserResponse):
    patient_count: int

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
    auto_generated: Optional[bool] = False
    updated_at: Optional[datetime] = None
    
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
    """Authenticate user and return JWT token."""
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
    
    # TASK-6.2: Create proper JWT token with user info
    token = create_access_token({
        "user_id": user.id,
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
    })
    
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
# UPLOAD / IMPORT
# -----------------------------------------------------------------------------

@router.post("/upload/preview")
async def preview_upload(file: UploadFile = File(...)):
    """Preview a CSV upload without committing."""
    content = await file.read()
    importer = ClinicalImporter()
    return importer.preview(content)

@router.post("/upload/import")
async def import_data(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(require_admin), # Only admin/doctor? Let's say Admin for now logic
    db: Session = Depends(get_db)
):
    """Import CSV data transactionally and recompute risk."""
    content = await file.read()
    importer = ClinicalImporter()
    
    result = importer.execute_import(db, content)
    
    if not result["success"]:
        return result
    
    # Trigger Risk Recomputation
    affected_ids = result.get("affected_patient_ids", [])
    recalc_count = 0
    
    for patient_id in affected_ids:
        # Recompute risk
        try:
            compute_risk_for_db_patient(patient_id, db)
            recalc_count += 1
        except Exception as e:
            print(f"Error recomputing risk for {patient_id}: {e}")
            # Don't fail the import for strict risk calc error, but log it
    
    result["risk_recalc_count"] = recalc_count
    return result


# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------

@router.get("/db/config")
def get_config(db: Session = Depends(get_db)):
    """Get global application configuration."""
    configs = db.query(AppConfig).all()
    return {c.key: c.value for c in configs}


@router.post("/db/config")
def update_config(
    request: ConfigUpdateRequest,
    current_user: TokenData = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a configuration key (Admin only)."""
    config = db.query(AppConfig).filter(AppConfig.key == request.key).first()
    
    if not config:
        config = AppConfig(key=request.key, value=request.value)
        db.add(config)
    else:
        config.value = request.value
    
    db.commit()
    return {"status": "success", "key": request.key, "value": request.value}


# -----------------------------------------------------------------------------
# USERS
# -----------------------------------------------------------------------------

@router.get("/db/users", response_model=List[UserListResponse])
def list_users(
    current_user: TokenData = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users with their patient counts (Admin only)."""
    users = db.query(User).all()
    return [{
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "patient_count": len(u.patients)
    } for u in users]


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
def create_patient(patient: PatientCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(require_doctor)):
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
def delete_patient(patient_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(require_admin)):
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
def create_vital(vital: VitalCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(require_nurse)):
    """Record a new vital sign and auto-compute risk score. Requires nurse role or higher."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == vital.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # TASK-5.4: Validate vital values to prevent obviously incorrect data
    VITAL_VALIDATION = {
        "heart_rate": (30, 300, "bpm"),
        "heartRate": (30, 300, "bpm"),
        "blood_pressure": (50, 250, "mmHg systolic"),
        "bloodPressure": (50, 250, "mmHg systolic"),
        "oxygen_sat": (50, 100, "%"),
        "oxygenSat": (50, 100, "%"),
        "temperature": (30, 45, "°C"),
        "glucose": (20, 600, "mg/dL"),
        "blood_sugar": (20, 600, "mg/dL"),
        "respiratory_rate": (5, 60, "breaths/min"),
        "respiratoryRate": (5, 60, "breaths/min"),
    }
    
    if vital.vital_type in VITAL_VALIDATION:
        min_val, max_val, unit_desc = VITAL_VALIDATION[vital.vital_type]
        if not (min_val <= vital.value <= max_val):
            raise HTTPException(
                status_code=422,
                detail=f"{vital.vital_type} value {vital.value} outside valid range ({min_val}-{max_val} {unit_desc})"
            )
    
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
            
            # E2E-1 FIX: Auto-create alert on HIGH/CRITICAL risk
            if result["risk_level"] in ["HIGH", "CRITICAL"]:
                # Check if active alert already exists for this patient
                existing_alert = db.query(Alert).filter(
                    Alert.patient_id == vital.patient_id,
                    Alert.status == "active"
                ).first()
                
                if not existing_alert:
                    explanation_summary = result.get("explanation", {}).get("summary", [])
                    new_alert = Alert(
                        patient_id=vital.patient_id,
                        severity="critical" if result["risk_level"] == "CRITICAL" else "high",
                        title=f"{result['risk_level']} Risk Detected",
                        explanation="; ".join(explanation_summary) if explanation_summary else "Elevated risk detected",
                        status="active",
                        auto_generated=True,
                        risk_snapshot=json.dumps(result)
                    )
                    db.add(new_alert)
                    db.commit()
                    print(f"✓ Auto-generated alert for patient {vital.patient_id}")
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
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(require_nurse)):
    """Acknowledge an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Alert acknowledged"}


@router.post("/db/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(require_doctor)):
    """Dismiss an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "dismissed"
    db.commit()
    
    return {"message": "Alert dismissed"}


class FeedbackRequest(BaseModel):
    feedback: str  # 'helpful' or 'not_helpful'


@router.post("/db/alerts/{alert_id}/feedback")
def set_alert_feedback(
    alert_id: str,
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_nurse)
):
    """Set feedback on an alert (helpful/not_helpful)."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if request.feedback not in ["helpful", "not_helpful"]:
        raise HTTPException(status_code=422, detail="Feedback must be 'helpful' or 'not_helpful'")
    
    alert.feedback = request.feedback
    db.commit()
    
    return {"message": f"Feedback set to {request.feedback}"}



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
def create_lab(lab: LabCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(require_nurse)):
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
def create_note(note: ClinicalNoteCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(require_nurse)):
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
        
        # Generate explanation using ExplanationEngine
        explanation = None
        try:
            risk_result = {"risk_score": adjusted_score, "risk_level": level}
            explanation_raw = EXPLANATION_ENGINE.explain(features, risk_result)
            explanation = {
                "summary": explanation_raw.get("summary", []),
                "contributing_factors": [
                    {
                        "feature": f.get("feature", "unknown"),
                        "display_name": f.get("display_name", "Unknown Factor"),
                        "value": f.get("value", 0),
                        "explanation": f.get("explanation", "")
                    }
                    for f in explanation_raw.get("contributing_factors", [])
                ]
            }
        except Exception as expl_error:
            explanation = {
                "summary": ["Risk factors detected based on vital trends"],
                "contributing_factors": [],
                "error": str(expl_error)
            }
        
        return {
            "risk_score": round(adjusted_score, 2),
            "risk_level": level,
            "confidence": result.get("confidence", 0.8),
            "model_used": result.get("model_used", "general"),
            "features_used": features,
            "explanation": explanation,
        }
    except Exception as e:
        # Fallback: Simple rule-based scoring with calibrated weights
        score = 0.15  # Base risk
        
        # Glucose/Sugar factors (labs)
        contributing_factors = []
        if latest_glucose and latest_glucose > 126:
            score += 0.12  # Pre-diabetic
            contributing_factors.append({
                "feature": "glucose",
                "display_name": "Blood Glucose",
                "value": latest_glucose,
                "explanation": f"Glucose level {latest_glucose} mg/dL exceeds normal range (>126)"
            })
        if latest_glucose and latest_glucose > 180:
            score += 0.15  # Diabetic range
        
        # Blood pressure factors
        if latest_bp_systolic and latest_bp_systolic > 130:
            score += 0.08  # Elevated
            contributing_factors.append({
                "feature": "blood_pressure",
                "display_name": "Blood Pressure",
                "value": latest_bp_systolic,
                "explanation": f"Systolic BP {latest_bp_systolic} mmHg is elevated (>130)"
            })
        if latest_bp_systolic and latest_bp_systolic > 140:
            score += 0.10  # High
        
        # Heart rate factor
        if latest_heart_rate and latest_heart_rate > 100:
            score += 0.08  # Tachycardia
            contributing_factors.append({
                "feature": "heart_rate",
                "display_name": "Heart Rate",
                "value": latest_heart_rate,
                "explanation": f"Heart rate {latest_heart_rate} bpm indicates tachycardia (>100)"
            })
        
        # Temperature factor
        if latest_temp and latest_temp >= 38:
            score += 0.10  # Fever
            contributing_factors.append({
                "feature": "temperature",
                "display_name": "Body Temperature",
                "value": latest_temp,
                "explanation": f"Temperature {latest_temp}°C indicates fever (≥38)"
            })
        
        # Age factor for elderly
        if patient.age and patient.age > 65:
            score += 0.08
            contributing_factors.append({
                "feature": "age",
                "display_name": "Age",
                "value": patient.age,
                "explanation": f"Advanced age ({patient.age} years) increases baseline risk"
            })
        
        # Cap at reasonable maximum (85% - very high risk but not 100%)
        score = min(score, 0.85)
        
        if score >= 0.7:
            level = "HIGH"
        elif score >= 0.4:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        # Build explanation summary
        summary = []
        if contributing_factors:
            for factor in contributing_factors[:3]:
                summary.append(factor["explanation"])
        else:
            summary.append("Baseline risk calculated from available patient data")
        
        return {
            "risk_score": round(score, 2),
            "risk_level": level,
            "confidence": 0.6,  # Lower confidence for rule-based
            "model_used": "rule_based_fallback",
            "features_used": features,
            "fallback_reason": str(e),
            "explanation": {
                "summary": summary,
                "contributing_factors": contributing_factors
            },
        }


@router.post("/db/patients/{patient_id}/compute-risk")
def compute_patient_risk(patient_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(require_doctor)):
    """
    Compute and update risk score for a patient using ML model.
    This endpoint fetches vitals from DB, runs ML scoring, and updates patient record.
    Auto-generates alerts when risk_level is HIGH with deduplication.
    Requires doctor role or higher.
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
    
    # TASK-3.2 & 3.3: Auto-generate alert when risk is HIGH with deduplication
    alert_created = False
    if result["risk_level"] == "HIGH":
        # Build risk snapshot for alert
        risk_snapshot = json.dumps({
            "risk_score": result["risk_score"],
            "features": result.get("features_used"),
            "explanation": result.get("explanation"),
            "model_used": result.get("model_used"),
        })
        
        # TASK-3.3: Check for existing active alert (deduplication)
        existing_alert = db.query(Alert).filter(
            Alert.patient_id == patient_id,
            Alert.status == "active",
            Alert.auto_generated == True,
            Alert.created_at > datetime.utcnow() - timedelta(hours=24)
        ).first()
        
        if existing_alert:
            # Update existing alert instead of creating duplicate
            existing_alert.risk_snapshot = risk_snapshot
            existing_alert.updated_at = datetime.utcnow()
            explanation_summary = result.get("explanation", {}).get("summary", [])
            if explanation_summary:
                existing_alert.explanation = explanation_summary[0]
        else:
            # Create new auto-generated alert
            explanation_summary = result.get("explanation", {}).get("summary", [])
            new_alert = Alert(
                patient_id=patient_id,
                severity="high",
                title=f"Risk Deterioration - {int(result['risk_score'] * 100)}% Risk",
                explanation=explanation_summary[0] if explanation_summary else f"Risk increased to {int(result['risk_score'] * 100)}%",
                status="active",
                risk_snapshot=risk_snapshot,
                auto_generated=True,
            )
            db.add(new_alert)
            alert_created = True
    
    db.commit()
    
    # TASK-4.1 & 4.2: Calculate risk velocity from history
    velocity, daily_change = calculate_risk_velocity(db, patient_id)
    
    return {
        "patient_id": patient_id,
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "model_used": result.get("model_used"),
        "computed_at": datetime.utcnow().isoformat(),
        "explanation": result.get("explanation"),
        "alert_created": alert_created,
        "velocity": velocity,  # NEW: stable, slowly_worsening, rapid_deterioration, improving, unknown
        "velocity_daily_change": daily_change,  # NEW: rate of change per day
    }
