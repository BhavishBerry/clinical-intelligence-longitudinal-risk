"""
Clinical Intelligence Platform - Full Pipeline Demo
=====================================================
Demonstrates the complete 6-stage pipeline with different patient scenarios.

Pipeline Stages:
1. Raw Data → 2. Timeline → 3. Trend Features → 4. Risk Score → 5. Explanation → 6. UI Output
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from model_router import ModelRouter
from explanation_engine import ExplanationEngine


def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def run_pipeline(patient_name: str, patient_data: dict, router: ModelRouter, explainer: ExplanationEngine):
    """Run full pipeline for a patient."""
    print(f"\n{'─' * 70}")
    print(f"👤 PATIENT: {patient_name}")
    print(f"{'─' * 70}")
    
    # Stage 1-2: Display raw data (simulated timeline conversion)
    print("\n📋 STAGE 1-2: Raw Data → Timeline")
    print("   Input features:")
    for k, v in patient_data.items():
        if v != 0:
            print(f"      • {k}: {v}")
    
    # Stage 3: Trend features (already computed in input)
    print("\n📈 STAGE 3: Trend Features Extracted")
    sugar_features = {k: v for k, v in patient_data.items() if 'sugar' in k and v != 0}
    bp_features = {k: v for k, v in patient_data.items() if 'bp' in k and v != 0}
    print(f"   Sugar trends: {len(sugar_features)} features")
    print(f"   BP trends: {len(bp_features)} features")
    
    # Stage 4: Risk scoring (via intelligent router)
    print("\n🎯 STAGE 4: Risk Scoring (Model Router)")
    result = router.predict(patient_data)
    print(f"   Model selected: {result['model_used']}")
    print(f"   Routing reason: {result['routing_reason']}")
    print(f"   Risk Score: {result['risk_score']:.1%}")
    print(f"   Risk Level: {result['risk_level']}")
    print(f"   Confidence: {result['confidence']:.1%}")
    
    # Stage 5: Explanation generation
    print("\n💬 STAGE 5: Explanation (Rule-Based)")
    explanation = explainer.explain(patient_data, result)
    print("   Contributing factors:")
    for factor in explanation.get('contributing_factors', [])[:3]:
        print(f"      • {factor['factor']}: {factor['detail']} (impact: {factor['impact']})")
    summary = explanation.get('summary', 'No summary')
    if isinstance(summary, list):
        summary = '; '.join(summary[:2])
    print(f"\n   Summary: {summary[:100]}...")
    
    # Stage 6: UI Output (simulated)
    print("\n🖥️ STAGE 6: UI Output")
    print(f"   ┌{'─' * 40}┐")
    print(f"   │ Risk Alert: {result['risk_level']:<26}│")
    print(f"   │ Score: {result['risk_score']:.0%} ({result['model_used']:<20})│")
    print(f"   │ Action: {'Review recommended' if result['risk_level'] in ['HIGH', 'MEDIUM'] else 'Monitor'}     │")
    print(f"   └{'─' * 40}┘")
    
    return result


def main():
    print_header("🏥 CLINICAL INTELLIGENCE PLATFORM - PIPELINE DRY RUN")
    print("\nLoading models and explainers...")
    
    router = ModelRouter()
    explainer = ExplanationEngine()
    
    # =========================================================================
    # SCENARIO 1: Diabetes-only patient
    # =========================================================================
    print_header("SCENARIO 1: Diabetes Clinic Patient (Sugar data only)")
    
    patient1 = {
        'age': 52, 'sex': 1,
        'sugar_percent_change': 35,      # 35% increase - concerning!
        'sugar_trend_up': 1,
        'sugar_velocity': 2.1,           # Rising fast
        'sugar_volatility': 18,          # Unstable
        'sugar_consecutive_increase': 4, # 4 visits in a row
        'sugar_max_spike': 45,
        'sugar_time_since_baseline': 18, # Months
        'trend_duration_months': 18,
        'medication_delay': 1,
        # NO BP data - doctor only has diabetes tests
        'bp_percent_change': 0,
        'bp_trend_up': 0,
    }
    run_pipeline("Raj Kumar (Diabetic)", patient1, router, explainer)
    
    # =========================================================================
    # SCENARIO 2: Cardiac-only patient  
    # =========================================================================
    print_header("SCENARIO 2: Cardiology Patient (BP data only)")
    
    patient2 = {
        'age': 68, 'sex': 0,
        # NO sugar data
        'sugar_percent_change': 0,
        'sugar_trend_up': 0,
        # BP data from cardiologist
        'bp_percent_change': 22,
        'bp_trend_up': 1,
        'bp_velocity': 0.9,
        'bp_volatility': 12,
        'bp_consecutive_increase': 3,
        'trend_duration_months': 24,
        'medication_delay': 1,
    }
    run_pipeline("Sunita Sharma (Cardiac)", patient2, router, explainer)
    
    # =========================================================================
    # SCENARIO 3: Full data patient (General)
    # =========================================================================
    print_header("SCENARIO 3: Complete Health Checkup (All data)")
    
    patient3 = {
        'age': 58, 'sex': 1,
        'sugar_percent_change': 15,
        'sugar_trend_up': 1,
        'sugar_velocity': 0.8,
        'sugar_volatility': 8,
        'sugar_consecutive_increase': 2,
        'sugar_max_spike': 20,
        'sugar_time_since_baseline': 12,
        'bp_percent_change': 18,
        'bp_trend_up': 1,
        'bp_velocity': 0.6,
        'bp_volatility': 10,
        'bp_consecutive_increase': 2,
        'trend_duration_months': 12,
        'medication_delay': 0,
        'medication_delay_months': 0,
    }
    run_pipeline("Amit Patel (Full Checkup)", patient3, router, explainer)
    
    # =========================================================================
    # SCENARIO 4: Healthy patient
    # =========================================================================
    print_header("SCENARIO 4: Healthy Patient (Low risk)")
    
    patient4 = {
        'age': 35, 'sex': 0,
        'sugar_percent_change': 2,       # Minimal change
        'sugar_trend_up': 0,             # Not trending up
        'sugar_velocity': 0.1,
        'sugar_volatility': 3,           # Stable
        'sugar_consecutive_increase': 0,
        'bp_percent_change': 3,
        'bp_trend_up': 0,
        'trend_duration_months': 6,
        'medication_delay': 0,
    }
    run_pipeline("Priya Singh (Healthy)", patient4, router, explainer)
    
    # =========================================================================
    # SCENARIO 5: Critical ICU patient
    # =========================================================================
    print_header("SCENARIO 5: ICU Patient (Critical)")
    
    patient5 = {
        'age': 72, 'sex': 1,
        'sugar_percent_change': 55,      # Severe deterioration
        'sugar_trend_up': 1,
        'sugar_velocity': 4.5,           # Rapid decline
        'sugar_volatility': 35,          # Very unstable
        'sugar_consecutive_increase': 6,
        'sugar_max_spike': 80,
        'bp_percent_change': 40,
        'bp_trend_up': 1,
        'bp_velocity': 2.0,
        'bp_volatility': 25,
        'bp_consecutive_increase': 5,
        'trend_duration_months': 3,      # Rapid onset
        'medication_delay': 1,
        'medication_delay_months': 2,
    }
    run_pipeline("Ram Prasad (ICU)", patient5, router, explainer)
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("📊 PIPELINE SUMMARY")
    print("""
    ┌────────────────────────────────────────────────────────────────┐
    │                    PIPELINE STAGES                             │
    ├────────────────────────────────────────────────────────────────┤
    │  1. Raw Visits     → Collect patient visit data                │
    │  2. Timeline       → Convert to longitudinal format            │
    │  3. Trend Features → Extract velocity, volatility, etc.        │
    │  4. Risk Score     → Model Router auto-selects best model      │
    │  5. Explanation    → Rule-based (never diagnoses!)             │
    │  6. UI Output      → Alerts, charts, dashboards                │
    └────────────────────────────────────────────────────────────────┘
    
    Models Used:
    • Diabetes Model  → When only sugar/glucose data available
    • Cardiac Model   → When only BP/heart data available  
    • General Model   → When full data available
    • Ensemble        → When data is mixed/uncertain
    """)


if __name__ == "__main__":
    main()
