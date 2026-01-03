"""
Explanation Engine - Clinical Intelligence Platform
=====================================================
Generates human-readable explanations for risk scores.

This is a RULE-BASED system (NO ML) as specified in the architecture doc.
It explains WHY risk increased using:
- Facts only
- Time-aware language
- No diagnosis
- No treatment advice

Usage:
    from explanation_engine import ExplanationEngine
    engine = ExplanationEngine()
    explanation = engine.explain(patient_data, risk_result)
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime


# =============================================================================
# EXPLANATION TEMPLATES
# =============================================================================

# Templates for different risk factors
EXPLANATION_TEMPLATES = {
    "sugar_percent_change": {
        "high": "Blood sugar increased {value:.0f}% over {duration} months",
        "moderate": "Blood sugar rose {value:.0f}% during the monitoring period",
        "threshold": 15,  # % change to trigger
    },
    "bp_percent_change": {
        "high": "Blood pressure increased {value:.0f}% across multiple visits",
        "moderate": "Blood pressure showed upward trend ({value:.0f}% change)",
        "threshold": 10,
    },
    "medication_delay": {
        "high": "Medication was initiated late in the observation period",
        "moderate": "Treatment timing may need review",
        "threshold": 0.5,
    },
    "trend_duration_months": {
        "high": "Concerning trends persisted for {value:.0f} months",
        "moderate": "Trends observed over {value:.0f} months",
        "threshold": 12,
    },
    "age": {
        "high": "Patient age ({value:.0f}) is a contributing factor",
        "moderate": None,  # Don't mention age for moderate
        "threshold": 60,
    },
}

# Risk level descriptions
RISK_LEVEL_DESCRIPTIONS = {
    "HIGH": "This patient shows multiple indicators of clinical deterioration that warrant attention.",
    "MEDIUM": "This patient shows some concerning trends that should be monitored.",
    "LOW": "This patient's metrics are within expected ranges.",
}

# Feature display names
FEATURE_DISPLAY_NAMES = {
    "sugar_percent_change": "Blood Sugar Change",
    "bp_percent_change": "Blood Pressure Change",
    "medication_delay": "Medication Timing",
    "trend_duration_months": "Trend Duration",
    "sugar_trend_up": "Blood Sugar Trend",
    "bp_trend_up": "Blood Pressure Trend",
    "age": "Age",
    "sex": "Sex",
}


# =============================================================================
# EXPLANATION ENGINE
# =============================================================================

class ExplanationEngine:
    """
    Rule-based explanation generator for risk scores.
    
    Architecture requirements:
    - No diagnosis
    - No treatment advice
    - Facts + time only
    """
    
    def __init__(self, feature_importance: Optional[Dict[str, float]] = None):
        """
        Initialize with optional feature importance from trained model.
        
        Args:
            feature_importance: Dict of {feature_name: importance_score}
        """
        self.feature_importance = feature_importance or {}
        self.templates = EXPLANATION_TEMPLATES
    
    def explain(
        self,
        patient_features: Dict[str, Any],
        risk_result: Dict[str, Any],
        top_n: int = 3
    ) -> Dict[str, Any]:
        """
        Generate explanation for a risk score.
        
        Args:
            patient_features: Dict with trend features (sugar_percent_change, etc.)
            risk_result: Dict with risk_score, risk_level, confidence
            top_n: Number of top factors to include
            
        Returns:
            {
                "summary": ["reason 1", "reason 2", ...],
                "risk_level": "HIGH",
                "risk_description": "...",
                "contributing_factors": [...]
            }
        """
        risk_level = risk_result.get("risk_level", "MEDIUM")
        risk_score = risk_result.get("risk_score", 0.5)
        
        # Generate explanations for each contributing factor
        factors = self._identify_contributing_factors(patient_features, risk_level)
        
        # Sort by importance if available
        if self.feature_importance:
            factors.sort(
                key=lambda x: self.feature_importance.get(x["feature"], 0),
                reverse=True
            )
        
        # Take top N factors
        top_factors = factors[:top_n]
        
        # Build summary sentences
        summary = [f["explanation"] for f in top_factors if f["explanation"]]
        
        return {
            "summary": summary,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_description": RISK_LEVEL_DESCRIPTIONS.get(risk_level, ""),
            "contributing_factors": top_factors,
            "generated_at": datetime.now().isoformat(),
        }
    
    def _identify_contributing_factors(
        self,
        features: Dict[str, Any],
        risk_level: str
    ) -> List[Dict[str, Any]]:
        """Identify which features contributed to the risk score."""
        factors = []
        
        for feature_name, template_config in self.templates.items():
            if feature_name not in features:
                continue
                
            value = features[feature_name]
            threshold = template_config.get("threshold", 0)
            
            # Determine severity
            if isinstance(value, (int, float)) and value > threshold:
                severity = "high"
            elif isinstance(value, (int, float)) and value > threshold * 0.5:
                severity = "moderate"
            else:
                continue  # Skip low-impact factors
            
            # Get template
            template = template_config.get(severity)
            if not template:
                continue
            
            # Format explanation
            duration = features.get("trend_duration_months", 0)
            explanation = template.format(value=value, duration=duration)
            
            factors.append({
                "feature": feature_name,
                "display_name": FEATURE_DISPLAY_NAMES.get(feature_name, feature_name),
                "value": value,
                "severity": severity,
                "explanation": explanation,
            })
        
        return factors
    
    def explain_timeline(
        self,
        timeline: Dict[str, Any],
        risk_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate explanation from raw patient timeline.
        
        Args:
            timeline: Patient timeline with blood_sugar, blood_pressure arrays
            risk_result: Risk scoring output
            
        Returns:
            Explanation dict
        """
        # Extract trend features from timeline
        features = self._extract_features_from_timeline(timeline)
        return self.explain(features, risk_result)
    
    def _extract_features_from_timeline(self, timeline: Dict[str, Any]) -> Dict[str, Any]:
        """Extract trend features from raw timeline data."""
        features = {}
        
        # Blood sugar trends
        blood_sugar = timeline.get("timeline", {}).get("blood_sugar", [])
        if len(blood_sugar) >= 2:
            first = blood_sugar[0]["value"]
            last = blood_sugar[-1]["value"]
            features["sugar_percent_change"] = ((last - first) / first) * 100
            features["sugar_trend_up"] = 1 if last > first else 0
            
            # Duration
            try:
                first_date = datetime.strptime(blood_sugar[0]["date"], "%Y-%m-%d")
                last_date = datetime.strptime(blood_sugar[-1]["date"], "%Y-%m-%d")
                features["trend_duration_months"] = (last_date - first_date).days / 30
            except:
                pass
        
        # Blood pressure trends
        blood_pressure = timeline.get("timeline", {}).get("blood_pressure", [])
        if len(blood_pressure) >= 2:
            first = blood_pressure[0].get("systolic", 0)
            last = blood_pressure[-1].get("systolic", 0)
            if first > 0:
                features["bp_percent_change"] = ((last - first) / first) * 100
                features["bp_trend_up"] = 1 if last > first else 0
        
        # Demographics
        demographics = timeline.get("demographics", {})
        features["age"] = demographics.get("age", 0)
        features["sex"] = 1 if demographics.get("sex") == "M" else 0
        
        # Medication delay
        medications = timeline.get("timeline", {}).get("medications", [])
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
# STANDALONE FUNCTIONS
# =============================================================================

def load_feature_importance(model_name: str = "logistic_regression") -> Dict[str, float]:
    """Load feature importance from trained model metadata."""
    models_dir = Path(__file__).parent.parent / "models"
    metadata_path = models_dir / f"{model_name}_metadata.json"
    
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
            return metadata.get("feature_importance", {})
    return {}


def create_explanation_engine() -> ExplanationEngine:
    """Create explanation engine with trained model's feature importance."""
    importance = load_feature_importance()
    return ExplanationEngine(feature_importance=importance)


# =============================================================================
# MAIN (Demo)
# =============================================================================

def main():
    """Demo the explanation engine."""
    print("=" * 60)
    print("🏥 Clinical Intelligence Platform - Explanation Engine Demo")
    print("=" * 60)
    
    # Load feature importance from trained model
    importance = load_feature_importance()
    print(f"\n📊 Loaded feature importance: {list(importance.keys())}")
    
    # Create engine
    engine = ExplanationEngine(feature_importance=importance)
    
    # Sample patient (deteriorating case)
    sample_features = {
        "age": 52,
        "sex": 1,
        "sugar_percent_change": 29.5,
        "sugar_trend_up": 1,
        "bp_percent_change": 15.3,
        "bp_trend_up": 1,
        "trend_duration_months": 18,
        "medication_delay": 1,
    }
    
    sample_risk = {
        "risk_score": 0.78,
        "risk_level": "HIGH",
        "confidence": 0.82,
    }
    
    print("\n📋 Sample Patient Features:")
    for k, v in sample_features.items():
        print(f"   {k}: {v}")
    
    print(f"\n⚠️ Risk Result: {sample_risk}")
    
    # Generate explanation
    explanation = engine.explain(sample_features, sample_risk)
    
    print("\n" + "=" * 60)
    print("📝 GENERATED EXPLANATION")
    print("=" * 60)
    print(f"\nRisk Level: {explanation['risk_level']}")
    print(f"Risk Score: {explanation['risk_score']}")
    print(f"\nDescription: {explanation['risk_description']}")
    print("\nRisk Factors:")
    for reason in explanation["summary"]:
        print(f"  • {reason}")
    
    print("\n" + "=" * 60)
    print("✅ Explanation engine ready for integration")
    print("=" * 60)


if __name__ == "__main__":
    main()
