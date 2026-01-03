"""
Synthetic Data Generator for Clinical Intelligence Platform
=============================================================
Generates realistic synthetic patient timelines for pipeline testing.

This is PHASE 1 of the data strategy (from Backend Architecture Plan):
- Create synthetic data with known patterns
- Test pipeline before using real datasets
- Define clear labeling rules

Usage:
    python scripts/generate_synthetic_data.py --patients 100 --output data/synthetic
"""

import argparse
import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
import csv


# =============================================================================
# CONFIGURATION
# =============================================================================

# Default output directory
DEFAULT_OUTPUT = Path(__file__).parent.parent / "data" / "synthetic"

# Patient demographics ranges
AGE_RANGE = (35, 75)
GENDERS = ["M", "F"]

# Baseline vital ranges (normal)
BASELINE_VITALS = {
    "blood_sugar": {"min": 80, "max": 110},      # mg/dL (fasting)
    "systolic_bp": {"min": 110, "max": 130},      # mmHg
    "diastolic_bp": {"min": 70, "max": 85},       # mmHg
    "heart_rate": {"min": 60, "max": 80},         # bpm
}

# Deterioration patterns (for label=1 cases)
DETERIORATION_PATTERNS = {
    "gradual_increase": {
        "blood_sugar": {"rate_per_month": (1, 3)},    # 1-3% increase/month
        "systolic_bp": {"rate_per_month": (0.5, 1.5)},
    },
    "sudden_spike": {
        "blood_sugar": {"spike_percent": (20, 40)},
        "systolic_bp": {"spike_percent": (10, 20)},
    },
}

# Labeling rules (from architecture doc)
# IF percent_change > 25% AND duration > 12 months THEN label = 1
LABEL_RULES = {
    "percent_change_threshold": 25,  # > 25% change triggers concern
    "duration_months_threshold": 12,  # > 12 months of trend
}


# =============================================================================
# PATIENT GENERATOR
# =============================================================================

def generate_patient_id() -> str:
    """Generate unique patient ID."""
    return f"patient_{random.randint(10000, 99999)}"


def generate_demographics() -> Dict[str, Any]:
    """Generate patient demographics."""
    return {
        "age": random.randint(*AGE_RANGE),
        "sex": random.choice(GENDERS),
    }


def generate_timeline_stable(start_date: datetime, num_visits: int) -> Dict[str, List]:
    """Generate stable (non-deteriorating) patient timeline."""
    timeline = {
        "blood_sugar": [],
        "blood_pressure": [],
        "notes": [],
        "medications": [],
    }
    
    current_date = start_date
    base_sugar = random.uniform(BASELINE_VITALS["blood_sugar"]["min"], 
                                 BASELINE_VITALS["blood_sugar"]["max"])
    base_systolic = random.uniform(BASELINE_VITALS["systolic_bp"]["min"],
                                    BASELINE_VITALS["systolic_bp"]["max"])
    base_diastolic = random.uniform(BASELINE_VITALS["diastolic_bp"]["min"],
                                     BASELINE_VITALS["diastolic_bp"]["max"])
    
    for i in range(num_visits):
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Add small random variation (stable patient)
        sugar = base_sugar + random.uniform(-5, 5)
        systolic = base_systolic + random.uniform(-5, 5)
        diastolic = base_diastolic + random.uniform(-3, 3)
        
        timeline["blood_sugar"].append({"date": date_str, "value": round(sugar, 1)})
        timeline["blood_pressure"].append({
            "date": date_str, 
            "systolic": round(systolic, 1), 
            "diastolic": round(diastolic, 1)
        })
        
        if i == 0:
            timeline["notes"].append({"date": date_str, "text": "Routine checkup"})
        
        # Advance 3-6 months
        current_date += timedelta(days=random.randint(90, 180))
    
    return timeline


def generate_timeline_deteriorating(start_date: datetime, num_visits: int) -> Dict[str, List]:
    """Generate deteriorating patient timeline (label=1)."""
    timeline = {
        "blood_sugar": [],
        "blood_pressure": [],
        "notes": [],
        "medications": [],
    }
    
    current_date = start_date
    
    # Start at normal baseline
    sugar = random.uniform(BASELINE_VITALS["blood_sugar"]["min"], 
                          BASELINE_VITALS["blood_sugar"]["max"])
    systolic = random.uniform(BASELINE_VITALS["systolic_bp"]["min"],
                              BASELINE_VITALS["systolic_bp"]["max"])
    diastolic = random.uniform(BASELINE_VITALS["diastolic_bp"]["min"],
                               BASELINE_VITALS["diastolic_bp"]["max"])
    
    # Monthly increase rate
    sugar_rate = random.uniform(*DETERIORATION_PATTERNS["gradual_increase"]["blood_sugar"]["rate_per_month"])
    bp_rate = random.uniform(*DETERIORATION_PATTERNS["gradual_increase"]["systolic_bp"]["rate_per_month"])
    
    notes_progression = [
        "Baseline normal",
        "Borderline values noted",
        "Values trending up, monitoring closely",
        "Elevated values, lifestyle counseling given",
        "Medication consideration discussed",
        "Started medication"
    ]
    
    for i in range(num_visits):
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Record values
        timeline["blood_sugar"].append({"date": date_str, "value": round(sugar, 1)})
        timeline["blood_pressure"].append({
            "date": date_str, 
            "systolic": round(systolic, 1), 
            "diastolic": round(diastolic, 1)
        })
        
        # Add clinical note
        note_idx = min(i, len(notes_progression) - 1)
        timeline["notes"].append({"date": date_str, "text": notes_progression[note_idx]})
        
        # Add medication if late in timeline (simulating delayed treatment)
        if i >= num_visits - 2:
            if not timeline["medications"]:
                timeline["medications"].append({"date": date_str, "name": "Metformin 500mg"})
        
        # Apply deterioration
        months_passed = random.randint(3, 6)
        sugar += sugar * (sugar_rate / 100) * months_passed
        systolic += systolic * (bp_rate / 100) * months_passed
        diastolic += diastolic * (bp_rate / 100) * months_passed * 0.5
        
        # Advance 3-6 months
        current_date += timedelta(days=months_passed * 30)
    
    return timeline


def compute_trend_features(timeline: Dict[str, List]) -> Dict[str, Any]:
    """
    Compute trend features from timeline (matches PDF Model 1 - Trend Detector).
    
    Enhanced features include:
    - Original: percent_change, trend_up, duration_months, medication_delay
    - New: velocity, volatility, consecutive_increase, max_spike, time_since_baseline
    """
    features = {}
    
    # Blood sugar trends
    if timeline["blood_sugar"]:
        sugar_values = [v["value"] for v in timeline["blood_sugar"]]
        if len(sugar_values) >= 2:
            first = sugar_values[0]
            last = sugar_values[-1]
            
            # Original features
            features["sugar_percent_change"] = round(((last - first) / first) * 100, 1)
            features["sugar_trend_up"] = 1 if last > first else 0
            features["sugar_first"] = first
            features["sugar_last"] = last
            
            # Duration calculation
            dates = [datetime.strptime(v["date"], "%Y-%m-%d") for v in timeline["blood_sugar"]]
            duration_months = (dates[-1] - dates[0]).days / 30
            features["trend_duration_months"] = round(duration_months)
            
            # ===== NEW ENHANCED FEATURES =====
            
            # 1. Velocity of change (rate per month)
            if duration_months > 0:
                features["sugar_velocity"] = round((last - first) / duration_months, 2)
            else:
                features["sugar_velocity"] = 0
            
            # 2. Volatility (standard deviation)
            if len(sugar_values) >= 3:
                mean_val = sum(sugar_values) / len(sugar_values)
                variance = sum((x - mean_val) ** 2 for x in sugar_values) / len(sugar_values)
                features["sugar_volatility"] = round(variance ** 0.5, 2)
            else:
                features["sugar_volatility"] = 0
            
            # 3. Consecutive increase count
            consecutive = 0
            max_consecutive = 0
            for i in range(1, len(sugar_values)):
                if sugar_values[i] > sugar_values[i-1]:
                    consecutive += 1
                    max_consecutive = max(max_consecutive, consecutive)
                else:
                    consecutive = 0
            features["sugar_consecutive_increase"] = max_consecutive
            
            # 4. Max spike (highest value - baseline)
            features["sugar_max_spike"] = round(max(sugar_values) - first, 1)
            
            # 5. Time since baseline (months since value was in normal range)
            # Normal range: 80-110 mg/dL
            time_since_normal = 0
            for i, v in enumerate(sugar_values):
                if v > 110:  # Above normal
                    if i > 0:
                        time_since_normal = (dates[-1] - dates[i-1]).days / 30
                    break
            features["sugar_time_since_baseline"] = round(time_since_normal)
    
    # Blood pressure trends
    if timeline["blood_pressure"]:
        bp_values = [v["systolic"] for v in timeline["blood_pressure"]]
        if len(bp_values) >= 2:
            first_bp = bp_values[0]
            last_bp = bp_values[-1]
            
            # Original features
            features["bp_percent_change"] = round(((last_bp - first_bp) / first_bp) * 100, 1)
            features["bp_trend_up"] = 1 if last_bp > first_bp else 0
            
            # NEW: BP velocity
            dates = [datetime.strptime(v["date"], "%Y-%m-%d") for v in timeline["blood_pressure"]]
            duration_months = (dates[-1] - dates[0]).days / 30
            if duration_months > 0:
                features["bp_velocity"] = round((last_bp - first_bp) / duration_months, 2)
            else:
                features["bp_velocity"] = 0
            
            # NEW: BP volatility
            if len(bp_values) >= 3:
                mean_bp = sum(bp_values) / len(bp_values)
                variance = sum((x - mean_bp) ** 2 for x in bp_values) / len(bp_values)
                features["bp_volatility"] = round(variance ** 0.5, 2)
            else:
                features["bp_volatility"] = 0
            
            # NEW: BP consecutive increase
            consecutive = 0
            max_consecutive = 0
            for i in range(1, len(bp_values)):
                if bp_values[i] > bp_values[i-1]:
                    consecutive += 1
                    max_consecutive = max(max_consecutive, consecutive)
                else:
                    consecutive = 0
            features["bp_consecutive_increase"] = max_consecutive
    
    # Medication delay indicator
    if timeline["medications"]:
        med_date = datetime.strptime(timeline["medications"][0]["date"], "%Y-%m-%d")
        first_date = datetime.strptime(timeline["blood_sugar"][0]["date"], "%Y-%m-%d")
        months_to_med = (med_date - first_date).days / 30
        features["medication_delay"] = 1 if months_to_med > 12 else 0
        features["medication_delay_months"] = round(months_to_med)  # NEW: Actual delay
    else:
        features["medication_delay"] = 0
        features["medication_delay_months"] = 0
    
    return features


def compute_label(features: Dict[str, Any]) -> int:
    """
    Compute deterioration label based on rules from architecture doc.
    
    Rule: IF percent_change > 25% AND duration > 12 months THEN label = 1
    """
    sugar_change = features.get("sugar_percent_change", 0)
    duration = features.get("trend_duration_months", 0)
    
    if sugar_change > LABEL_RULES["percent_change_threshold"] and \
       duration > LABEL_RULES["duration_months_threshold"]:
        return 1
    return 0


def generate_patient(deteriorating: bool = False) -> Dict[str, Any]:
    """Generate a complete patient record with timeline and features."""
    patient_id = generate_patient_id()
    demographics = generate_demographics()
    
    # Random start date in past 2-3 years
    start_date = datetime.now() - timedelta(days=random.randint(730, 1095))
    num_visits = random.randint(4, 8)
    
    if deteriorating:
        timeline = generate_timeline_deteriorating(start_date, num_visits)
    else:
        timeline = generate_timeline_stable(start_date, num_visits)
    
    features = compute_trend_features(timeline)
    label = compute_label(features)
    
    return {
        "patient_id": patient_id,
        "demographics": demographics,
        "timeline": timeline,
        "trend_features": features,
        "label": label,  # 0 = stable, 1 = deterioration
    }


# =============================================================================
# OUTPUT GENERATORS
# =============================================================================

def save_as_json(patients: List[Dict], output_dir: Path):
    """Save patients as individual JSON files (timeline format)."""
    timeline_dir = output_dir / "timelines"
    timeline_dir.mkdir(parents=True, exist_ok=True)
    
    for patient in patients:
        filepath = timeline_dir / f"{patient['patient_id']}.json"
        # Save only timeline data (matches architecture model)
        timeline_data = {
            "patient_id": patient["patient_id"],
            "demographics": patient["demographics"],
            "timeline": patient["timeline"],
        }
        filepath.write_text(json.dumps(timeline_data, indent=2))
    
    print(f"   ✓ Saved {len(patients)} timeline JSON files to {timeline_dir}")


def save_training_csv(patients: List[Dict], output_dir: Path):
    """Save flattened training data as CSV (for ML model)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    filepath = output_dir / "training_data.csv"
    
    # Flatten features for training
    rows = []
    for p in patients:
        row = {
            "patient_id": p["patient_id"],
            "age": p["demographics"]["age"],
            "sex": 1 if p["demographics"]["sex"] == "M" else 0,
            **p["trend_features"],
            "label": p["label"],
        }
        rows.append(row)
    
    # Write CSV
    if rows:
        fieldnames = rows[0].keys()
        with open(filepath, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
    
    print(f"   ✓ Saved training CSV to {filepath}")
    
    # Print label distribution
    label_1 = sum(1 for r in rows if r["label"] == 1)
    label_0 = len(rows) - label_1
    print(f"   ✓ Label distribution: {label_0} stable (0), {label_1} deteriorating (1)")


def save_summary(patients: List[Dict], output_dir: Path):
    """Save generation summary."""
    summary = {
        "generated_at": datetime.now().isoformat(),
        "total_patients": len(patients),
        "deteriorating_count": sum(1 for p in patients if p["label"] == 1),
        "stable_count": sum(1 for p in patients if p["label"] == 0),
        "labeling_rules": LABEL_RULES,
        "baseline_vitals": BASELINE_VITALS,
    }
    
    filepath = output_dir / "generation_summary.json"
    filepath.write_text(json.dumps(summary, indent=2))
    print(f"   ✓ Saved summary to {filepath}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic patient data")
    parser.add_argument("--patients", type=int, default=100, help="Number of patients to generate")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT), help="Output directory")
    parser.add_argument("--deterioration-ratio", type=float, default=0.3, help="Ratio of deteriorating patients (0-1)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("🏥 Clinical Intelligence Platform - Synthetic Data Generator")
    print("=" * 60)
    
    output_dir = Path(args.output)
    num_deteriorating = int(args.patients * args.deterioration_ratio)
    num_stable = args.patients - num_deteriorating
    
    print(f"\n📊 Generating {args.patients} patients...")
    print(f"   - {num_stable} stable (label=0)")
    print(f"   - {num_deteriorating} deteriorating (label=1)")
    
    # Generate patients
    patients = []
    
    print("\n⏳ Generating timelines...")
    for _ in range(num_stable):
        patients.append(generate_patient(deteriorating=False))
    for _ in range(num_deteriorating):
        patients.append(generate_patient(deteriorating=True))
    
    # Shuffle
    random.shuffle(patients)
    
    # Save outputs
    print("\n💾 Saving data...")
    save_as_json(patients, output_dir)
    save_training_csv(patients, output_dir)
    save_summary(patients, output_dir)
    
    print("\n" + "=" * 60)
    print("✅ GENERATION COMPLETE")
    print("=" * 60)
    print(f"\nOutput location: {output_dir}")
    print("\nGenerated files:")
    print(f"  - timelines/*.json  (patient timeline format)")
    print(f"  - training_data.csv (flattened features for ML)")
    print(f"  - generation_summary.json")
    print("\nNext steps:")
    print("  1. Review generated timelines")
    print("  2. Train risk scoring model on training_data.csv")
    print("  3. Test explanation generator with timelines")


if __name__ == "__main__":
    main()
