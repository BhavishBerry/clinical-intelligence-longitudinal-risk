
import csv
import io
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

# =============================================================================
# SCHEMA DEFINITIONS
# =============================================================================

REQUIRED_COLUMNS = ["mrn", "timestamp"]

VALID_DATA_COLUMNS = {
    "systolic": {"min": 50, "max": 250, "unit": "mmHg"},
    "diastolic": {"min": 30, "max": 150, "unit": "mmHg"},
    "heart_rate": {"min": 30, "max": 250, "unit": "bpm"},
    "respiratory_rate": {"min": 8, "max": 60, "unit": "breaths/min"},
    "oxygen_sat": {"min": 50, "max": 100, "unit": "%"},
    "temperature": {"min": 35.0, "max": 42.0, "unit": "°C"},
    "glucose": {"min": 40, "max": 600, "unit": "mg/dL"},
}

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    parsed_data: Dict

class ClinicalImporter:
    """
    Handles CSV parsing, validation, and preview logic for clinical data import.
    Enforces strict schema and physiological checks.
    """

    def parse_csv(self, file_content: bytes) -> List[Dict[str, str]]:
        """Parses raw CSV bytes into a list of dictionaries."""
        content = file_content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        return list(reader)

    def validate_row(self, row: Dict[str, str], row_idx: int) -> ValidationResult:
        """
        Validates a single row against schema and physiological rules.
        """
        errors = []
        warnings = []
        parsed = {}

        # 1. Check Required Columns
        for col in REQUIRED_COLUMNS:
            if col not in row or not row[col].strip():
                errors.append(f"Missing required column: {col}")
                return ValidationResult(False, errors, warnings, {}) # Fatal

        parsed["mrn"] = row["mrn"].strip()
        
        # 2. Timestamp Validation
        try:
            ts = datetime.fromisoformat(row["timestamp"].strip())
            if ts > datetime.utcnow():
                errors.append("Timestamp is in the future")
            parsed["timestamp"] = ts
        except ValueError:
            errors.append(f"Invalid timestamp format (expected ISO 8601): {row['timestamp']}")

        # 3. Data Extraction & Limits
        has_data = False
        systolic = None
        diastolic = None

        for col, rules in VALID_DATA_COLUMNS.items():
            if col in row and row[col].strip():
                try:
                    val = float(row[col])
                    parsed[col] = val
                    has_data = True

                    # Range Checks (Warning vs Error logic could be strict, here using limits as boundaries)
                    # For safety, we treat extreme outliers as potential errors or strict warnings
                    if val < rules["min"] or val > rules["max"]:
                        warnings.append(f"{col} value {val} outside typical range ({rules['min']}-{rules['max']})")

                    if col == "systolic": systolic = val
                    if col == "diastolic": diastolic = val

                except ValueError:
                    errors.append(f"Invalid numeric value for {col}: {row[col]}")

        if not has_data:
            errors.append("Row contains no valid vital signs data")

        # 4. Physiological Logic Checks
        if systolic is not None and diastolic is not None:
            if systolic <= diastolic:
                errors.append(f"Physiological Error: Systolic ({systolic}) must be greater than Diastolic ({diastolic})")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            parsed_data=parsed if len(errors) == 0 else {}
        )

    def preview(self, file_content: bytes) -> Dict:
        """
        Preview a file without commiting.
        Returns details on valid vs invalid rows.
        """
        try:
            rows = self.parse_csv(file_content)
        except Exception as e:
            return {"error": f"Failed to parse CSV: {str(e)}"}

        preview_results = []
        valid_count = 0
        invalid_count = 0

        for i, row in enumerate(rows):
            res = self.validate_row(row, i)
            if res.is_valid:
                valid_count += 1
            else:
                invalid_count += 1
            
            preview_results.append({
                "row_index": i + 1,
                "is_valid": res.is_valid,
                "errors": res.errors,
                "warnings": res.warnings,
                "original_data": row # Return original for UI display
            })

        return {
            "total_rows": len(rows),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "details": preview_results,
            "columns": list(rows[0].keys()) if rows else []
        }

    def execute_import(self, db, file_content: bytes) -> Dict:
        """
        Executes the import transactionally.
        1. Validate all rows again (safety).
        2. Group by MRN.
        3. Fetch Patients.
        4. Insert Vitals/Labs.
        5. Return affected patient IDs for risk recomputation.
        """
        rows = self.parse_csv(file_content)
        
        # 1. Helper to find patient by MRN
        from backend.database import Patient, Vital, Lab
        
        # Pre-fetch all patients with MRNs to minimize queries (or just query as we go if batch small)
        # For robustness, let's query.
        
        affected_patient_ids = set()
        created_records = 0
        errors = []

        # Validate whole batch first - if ANY schema error, reject all? 
        # The plan said "Atomic Transaction".
        # Let's iterate and collect operations.
        
        operations = [] # List of (model_instance) to add
        
        # Cache patients
        existing_patients = {p.mrn: p for p in db.query(Patient).filter(Patient.mrn.isnot(None)).all()}

        for i, row in enumerate(rows):
            res = self.validate_row(row, i)
            if not res.is_valid:
                errors.append(f"Row {i+1}: {'; '.join(res.errors)}")
                continue

            data = res.parsed_data
            mrn = data["mrn"]
            
            patient = existing_patients.get(mrn)
            if not patient:
                errors.append(f"Row {i+1}: Patient with MRN '{mrn}' not found")
                continue

            affected_patient_ids.add(patient.id)
            ts = data["timestamp"]

            # Vitals
            vital_map = {
                "heart_rate": "heartRate",
                "respiratory_rate": "respiratoryRate",
                "oxygen_sat": "oxygenSat",
                "temperature": "temperature",
                "glucose": "glucose", # Dual use? Usually vital if standard check
                "systolic": "bloodPressure" # Special handling
            }

            for csv_col, db_type in vital_map.items():
                if csv_col in data:
                    val = data[csv_col]
                    val2 = None
                    
                    # Special BP handling
                    if csv_col == "systolic":
                        val2 = data.get("diastolic") # Validated as present if systolic is present in validate_row?
                        # validate_row checks limit but maybe not presence of diastolic if systolic present?
                        # Let's re-verify validate_row logic. 
                        # It checks: if systolic <= diastolic error. But doesn't explicitly fail if one missing?
                        # Actually logic in validate_row:
                        # if systolic is not None and diastolic is not None: check.
                        # We need to ensure we only insert if we have complete BP.
                        if "diastolic" not in data:
                            continue # Skip incomplete BP
                    
                    if csv_col == "diastolic":
                        continue # Handled with systolic

                    vital = Vital(
                        patient_id=patient.id,
                        vital_type=db_type,
                        value=val,
                        value2=val2,
                        unit=VALID_DATA_COLUMNS[csv_col]["unit"],
                        recorded_at=ts
                    )
                    operations.append(vital)
                    created_records += 1

        if errors:
            return {"success": False, "errors": errors, "records_count": 0}

        try:
            # Atomic commit
            for op in operations:
                db.add(op)
            db.commit()
            return {
                "success": True, 
                "errors": [], 
                "records_count": created_records,
                "affected_patient_ids": list(affected_patient_ids)
            }
        except Exception as e:
            db.rollback()
            return {"success": False, "errors": [str(e)], "records_count": 0}

