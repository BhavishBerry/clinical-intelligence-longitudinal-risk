"""
Database Layer - Clinical Intelligence Platform
================================================
Supports both Supabase (PostgreSQL) and local SQLite for development.
Uses environment variables for connection - works with any backend host.

Setup:
    1. Set DATABASE_URL environment variable
    2. Run: python -m backend.database --init

Examples:
    # Local SQLite (development)
    DATABASE_URL=sqlite:///./clinical.db

    # Supabase PostgreSQL (production)
    DATABASE_URL=postgresql://user:pass@host:5432/dbname
"""

import os
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

# =============================================================================
# CONFIGURATION
# =============================================================================

# Default to SQLite for local development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/clinical.db")

# Handle Supabase/Heroku postgres:// vs postgresql:// issue
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs special connect args
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Create engine
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# =============================================================================
# MODELS
# =============================================================================

def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User model - replaces mockUsers.ts"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="doctor")  # doctor, nurse, admin
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patients = relationship("Patient", back_populates="created_by_user")


class Patient(Base):
    """Patient model - replaces mockPatients.ts"""
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    age = Column(Integer)
    sex = Column(String)  # M, F
    location = Column(String)  # Ward, Room
    current_risk_score = Column(Float, default=0.0)
    current_risk_level = Column(String, default="low")
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by_user = relationship("User", back_populates="patients")
    vitals = relationship("Vital", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="patient", cascade="all, delete-orphan")
    labs = relationship("Lab", back_populates="patient", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan")


class Vital(Base):
    """Vital signs - blood sugar, blood pressure, etc."""
    __tablename__ = "vitals"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    vital_type = Column(String, nullable=False)  # blood_sugar, blood_pressure, heart_rate, etc.
    value = Column(Float, nullable=False)
    value2 = Column(Float)  # For BP diastolic
    unit = Column(String)  # mg/dL, mmHg, bpm
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="vitals")


class RiskScore(Base):
    """Computed risk scores history"""
    __tablename__ = "risk_scores"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    model_used = Column(String)  # diabetes, cardiac, general
    confidence = Column(Float)
    routing_reason = Column(String)
    computed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="risk_scores")


class Alert(Base):
    """Risk alerts - replaces mockAlerts.ts"""
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    severity = Column(String, nullable=False)  # critical, high, medium, low
    title = Column(String, nullable=False)
    explanation = Column(Text)
    status = Column(String, default="active")  # active, acknowledged, dismissed
    acknowledged_by = Column(String, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # NEW: For auto-generated alerts with risk snapshots
    risk_snapshot = Column(Text)  # JSON: stores features + explanation at alert time
    auto_generated = Column(Boolean, default=False)  # manual vs auto
    
    # Relationships
    patient = relationship("Patient", back_populates="alerts")


class Lab(Base):
    """Lab results - glucose, creatinine, etc."""
    __tablename__ = "labs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    lab_type = Column(String, nullable=False)  # glucose, creatinine, lactate, cholesterol, etc.
    value = Column(Float, nullable=False)
    unit = Column(String)  # mg/dL, mmol/L
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="labs")


class ClinicalNote(Base):
    """Clinical notes - doctor observations, consultation notes"""
    __tablename__ = "clinical_notes"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    note_type = Column(String, default="observation")  # observation, consultation, procedure, medication
    content = Column(Text, nullable=False)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="clinical_notes")


# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

def get_db():
    """Get database session - use with FastAPI Depends()"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    # Ensure data directory exists for SQLite
    if DATABASE_URL.startswith("sqlite"):
        Path("./data").mkdir(exist_ok=True)
    
    Base.metadata.create_all(bind=engine)
    print(f"✓ Database initialized: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")


def seed_demo_data():
    """Seed database with demo data for testing"""
    from hashlib import sha256
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already has data, skipping seed")
            return
        
        # Create demo users
        users = [
            User(
                id="user-1",
                email="doctor1@hospital",
                password_hash=sha256("password".encode()).hexdigest(),
                name="Dr. Sarah Chen",
                role="doctor"
            ),
            User(
                id="user-2", 
                email="nurse1@hospital",
                password_hash=sha256("password".encode()).hexdigest(),
                name="Nurse Michael Johnson",
                role="nurse"
            ),
            User(
                id="user-3",
                email="admin@hospital",
                password_hash=sha256("adminpass".encode()).hexdigest(),
                name="Admin User",
                role="admin"
            ),
        ]
        db.add_all(users)
        
        # Create demo patients
        patients = [
            Patient(
                id="patient-1",
                name="Raj Kumar",
                age=58,
                sex="M",
                location="Ward 4B",
                current_risk_score=0.72,
                current_risk_level="high",
                created_by="user-1"
            ),
            Patient(
                id="patient-2",
                name="Anita Sharma",
                age=64,
                sex="F",
                location="Ward 2A",
                current_risk_score=0.45,
                current_risk_level="medium",
                created_by="user-1"
            ),
            Patient(
                id="patient-3",
                name="James Wilson",
                age=72,
                sex="M",
                location="ICU 1",
                current_risk_score=0.89,
                current_risk_level="critical",
                created_by="user-1"
            ),
        ]
        db.add_all(patients)
        
        # Create demo vitals
        vitals = [
            Vital(patient_id="patient-1", vital_type="blood_sugar", value=145, unit="mg/dL"),
            Vital(patient_id="patient-1", vital_type="blood_pressure", value=145, value2=92, unit="mmHg"),
            Vital(patient_id="patient-2", vital_type="blood_sugar", value=118, unit="mg/dL"),
            Vital(patient_id="patient-3", vital_type="blood_sugar", value=185, unit="mg/dL"),
        ]
        db.add_all(vitals)
        
        # Create demo alerts
        alerts = [
            Alert(
                patient_id="patient-3",
                severity="critical",
                title="Sepsis Risk - Immediate Attention Required",
                explanation="Multiple indicators suggest elevated sepsis risk",
                status="active"
            ),
            Alert(
                patient_id="patient-1",
                severity="high",
                title="Elevated Metabolic Risk",
                explanation="Blood sugar trending upward over 18 months",
                status="active"
            ),
        ]
        db.add_all(alerts)
        
        db.commit()
        print("✓ Demo data seeded successfully")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding data: {e}")
    finally:
        db.close()


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import sys
    
    if "--init" in sys.argv:
        print("Initializing database...")
        init_db()
        
        if "--seed" in sys.argv:
            print("Seeding demo data...")
            seed_demo_data()
    else:
        print("Usage:")
        print("  python -m backend.database --init        # Create tables")
        print("  python -m backend.database --init --seed # Create tables + demo data")
