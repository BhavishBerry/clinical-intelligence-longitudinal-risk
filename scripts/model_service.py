"""
Robust Model Service - Clinical Intelligence Platform
======================================================
Production-ready model management with error handling, logging,
validation, and graceful fallbacks.

Features:
- Comprehensive error handling with fallbacks
- Request/response validation
- Feature validation before prediction
- Logging for debugging
- Health checks
- Model versioning

Usage:
    from model_service import ModelService
    service = ModelService()
    result = service.predict(patient_features)
"""

import pickle
import json
import logging
import warnings
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

# Suppress sklearn warnings in production
warnings.filterwarnings('ignore', category=UserWarning)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ModelService')


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


@dataclass
class PredictionResult:
    """Structured prediction result."""
    risk_score: float
    risk_level: str
    confidence: float
    model_used: str
    routing_reason: str
    features_used: List[str]
    timestamp: str
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'confidence': self.confidence,
            'model_used': self.model_used,
            'routing_reason': self.routing_reason,
            'features_used': self.features_used,
            'timestamp': self.timestamp,
            'warnings': self.warnings,
        }


# Feature definitions for each model type
FEATURE_DEFINITIONS = {
    'diabetes': {
        'required': ['age', 'sex'],
        'optional': [
            'sugar_percent_change', 'sugar_trend_up', 'sugar_velocity',
            'sugar_volatility', 'sugar_consecutive_increase', 'sugar_max_spike',
            'sugar_time_since_baseline', 'trend_duration_months', 'medication_delay',
        ],
        'all': lambda: FEATURE_DEFINITIONS['diabetes']['required'] + FEATURE_DEFINITIONS['diabetes']['optional'],
    },
    'cardiac': {
        'required': ['age', 'sex'],
        'optional': [
            'bp_percent_change', 'bp_trend_up', 'bp_velocity',
            'bp_volatility', 'bp_consecutive_increase', 'trend_duration_months',
            'medication_delay',
        ],
        'all': lambda: FEATURE_DEFINITIONS['cardiac']['required'] + FEATURE_DEFINITIONS['cardiac']['optional'],
    },
    'general': {
        'required': ['age', 'sex'],
        'optional': [
            'sugar_percent_change', 'sugar_trend_up', 'trend_duration_months',
            'bp_percent_change', 'bp_trend_up', 'medication_delay',
            'sugar_velocity', 'sugar_volatility', 'sugar_consecutive_increase',
            'sugar_max_spike', 'sugar_time_since_baseline',
            'bp_velocity', 'bp_volatility', 'bp_consecutive_increase',
            'medication_delay_months',
        ],
        'all': lambda: FEATURE_DEFINITIONS['general']['required'] + FEATURE_DEFINITIONS['general']['optional'],
    },
}


# =============================================================================
# MODEL SERVICE
# =============================================================================

class ModelService:
    """
    Production-ready model service with intelligent routing.
    
    Provides:
    - Automatic model selection based on available features
    - Fallback mechanisms when models fail
    - Input validation
    - Comprehensive logging
    - Health checks
    """
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.health_status: Dict[str, bool] = {}
        self._load_models()
    
    def _load_models(self) -> None:
        """Load all available models with error handling."""
        model_names = ['diabetes', 'cardiac', 'general']
        
        for name in model_names:
            model_path = MODELS_DIR / f"{name}_model.pkl"
            try:
                if model_path.exists():
                    with open(model_path, 'rb') as f:
                        self.models[name] = pickle.load(f)
                    self.health_status[name] = True
                    logger.info(f"✓ Loaded {name} model")
                else:
                    self.health_status[name] = False
                    logger.warning(f"✗ {name} model not found at {model_path}")
            except Exception as e:
                self.health_status[name] = False
                logger.error(f"✗ Failed to load {name} model: {e}")
        
        # Load metadata
        meta_path = MODELS_DIR / "specialty_models_metadata.json"
        if meta_path.exists():
            try:
                with open(meta_path) as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")
    
    def health_check(self) -> Dict[str, Any]:
        """Return health status of all models."""
        return {
            'healthy': any(self.health_status.values()),
            'models': self.health_status,
            'available_models': [k for k, v in self.health_status.items() if v],
            'timestamp': datetime.now().isoformat(),
        }
    
    def _validate_features(self, features: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate input features and return warnings."""
        warnings = []
        
        # Check for required base features
        if 'age' not in features or features.get('age', 0) <= 0:
            warnings.append("Missing or invalid 'age' feature")
        
        # Check for at least some clinical data
        clinical_features = [
            'sugar_percent_change', 'bp_percent_change', 
            'sugar_trend_up', 'bp_trend_up'
        ]
        has_clinical = any(features.get(f, 0) != 0 for f in clinical_features)
        if not has_clinical:
            warnings.append("No clinical trend data provided - prediction may be unreliable")
        
        return len(warnings) == 0 or has_clinical, warnings
    
    def _calculate_feature_coverage(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Calculate feature coverage for each model type."""
        available = set(k for k, v in features.items() if v is not None and v != 0)
        
        coverage = {}
        for model_name, feat_def in FEATURE_DEFINITIONS.items():
            all_features = feat_def['all']()
            matched = len(available & set(all_features))
            total = len(all_features)
            coverage[model_name] = matched / total if total > 0 else 0
        
        return coverage
    
    def _select_model(self, features: Dict[str, Any]) -> Tuple[str, float, str]:
        """
        Select best model based on available features.
        
        Returns:
            (model_name, confidence, reason)
        """
        # Check for specialty-specific data
        has_sugar = any(k.startswith('sugar') and features.get(k, 0) != 0 for k in features)
        has_bp = any(k.startswith('bp') and features.get(k, 0) != 0 for k in features)
        
        # Model selection logic
        if has_sugar and not has_bp:
            if self.health_status.get('diabetes', False):
                return 'diabetes', 0.95, 'Sugar/glucose data detected → Diabetes model'
            return 'general', 0.7, 'Diabetes model unavailable → Fallback to General'
        
        elif has_bp and not has_sugar:
            if self.health_status.get('cardiac', False):
                return 'cardiac', 0.95, 'Blood pressure data detected → Cardiac model'
            return 'general', 0.7, 'Cardiac model unavailable → Fallback to General'
        
        elif has_sugar and has_bp:
            if self.health_status.get('general', False):
                return 'general', 0.90, 'Combined data detected → General model'
            # Try ensemble of available models
            return 'ensemble', 0.75, 'General unavailable → Using ensemble'
        
        else:
            # Minimal data - use general with low confidence
            if self.health_status.get('general', False):
                return 'general', 0.5, 'Minimal data → General model (low confidence)'
            return 'fallback', 0.3, 'No models available → Rule-based fallback'
    
    def _prepare_dataframe(self, features: Dict[str, Any], model_name: str):
        """Prepare pandas DataFrame with proper column names."""
        import pandas as pd
        
        all_features = FEATURE_DEFINITIONS[model_name]['all']()
        data = {f: [features.get(f, 0)] for f in all_features}
        return pd.DataFrame(data)
    
    def _rule_based_fallback(self, features: Dict[str, Any]) -> float:
        """Rule-based risk calculation when no models available."""
        score = 0.3  # Base score
        
        # Sugar contribution
        sugar_change = features.get('sugar_percent_change', 0)
        if sugar_change > 30:
            score += 0.3
        elif sugar_change > 15:
            score += 0.15
        
        # BP contribution
        bp_change = features.get('bp_percent_change', 0)
        if bp_change > 20:
            score += 0.2
        elif bp_change > 10:
            score += 0.1
        
        # Age contribution
        age = features.get('age', 50)
        if age > 70:
            score += 0.1
        elif age > 60:
            score += 0.05
        
        # Duration contribution
        duration = features.get('trend_duration_months', 0)
        if duration > 24:
            score += 0.1
        
        return min(score, 1.0)
    
    def _ensemble_predict(self, features: Dict[str, Any]) -> Tuple[float, float]:
        """Ensemble prediction using available models."""
        predictions = []
        weights = []
        coverage = self._calculate_feature_coverage(features)
        
        for model_name, model in self.models.items():
            if not self.health_status.get(model_name, False):
                continue
            try:
                X = self._prepare_dataframe(features, model_name)
                prob = model.predict_proba(X)[0, 1]
                predictions.append(prob)
                weights.append(coverage[model_name] + 0.1)  # Minimum weight
            except Exception as e:
                logger.warning(f"Ensemble prediction failed for {model_name}: {e}")
        
        if predictions:
            import numpy as np
            weights = np.array(weights)
            predictions = np.array(predictions)
            final_prob = float(np.average(predictions, weights=weights))
            confidence = float(np.max(weights))
            return final_prob, confidence
        
        return self._rule_based_fallback(features), 0.3
    
    def predict(self, features: Dict[str, Any]) -> PredictionResult:
        """
        Main prediction method with full error handling.
        
        Args:
            features: Dict of patient features
            
        Returns:
            PredictionResult with risk score, level, and metadata
        """
        warnings_list = []
        timestamp = datetime.now().isoformat()
        
        # Validate input
        valid, validation_warnings = self._validate_features(features)
        warnings_list.extend(validation_warnings)
        
        # Select model
        model_name, confidence, reason = self._select_model(features)
        
        try:
            if model_name == 'fallback':
                # No models available
                risk_score = self._rule_based_fallback(features)
                warnings_list.append("Using rule-based fallback - models not available")
                features_used = ['age', 'sugar_percent_change', 'bp_percent_change']
                
            elif model_name == 'ensemble':
                # Use ensemble
                risk_score, confidence = self._ensemble_predict(features)
                features_used = list(features.keys())
                
            else:
                # Use specific model
                model = self.models.get(model_name)
                if model is None:
                    raise ValueError(f"Model {model_name} not loaded")
                
                X = self._prepare_dataframe(features, model_name)
                risk_score = float(model.predict_proba(X)[0, 1])
                features_used = FEATURE_DEFINITIONS[model_name]['all']()
            
            # Determine risk level
            if risk_score >= 0.8:
                risk_level = RiskLevel.CRITICAL.value
            elif risk_score >= 0.6:
                risk_level = RiskLevel.HIGH.value
            elif risk_score >= 0.4:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value
            
            return PredictionResult(
                risk_score=round(risk_score, 3),
                risk_level=risk_level,
                confidence=round(confidence, 3),
                model_used=model_name,
                routing_reason=reason,
                features_used=features_used,
                timestamp=timestamp,
                warnings=warnings_list,
            )
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            # Graceful fallback
            return PredictionResult(
                risk_score=0.5,
                risk_level=RiskLevel.UNKNOWN.value,
                confidence=0.0,
                model_used='error_fallback',
                routing_reason=f'Error occurred: {str(e)}',
                features_used=[],
                timestamp=timestamp,
                warnings=warnings_list + [f"Prediction error: {str(e)}"],
            )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

_service_instance: Optional[ModelService] = None


def get_service() -> ModelService:
    """Get singleton model service instance."""
    global _service_instance
    if _service_instance is None:
        _service_instance = ModelService()
    return _service_instance


def predict(features: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for prediction."""
    service = get_service()
    result = service.predict(features)
    return result.to_dict()


def health_check() -> Dict[str, Any]:
    """Convenience function for health check."""
    service = get_service()
    return service.health_check()


# =============================================================================
# MAIN (Demo)
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Model Service - Health Check & Demo")
    print("=" * 60)
    
    service = ModelService()
    
    # Health check
    print("\nHealth Status:")
    health = service.health_check()
    print(f"  Healthy: {health['healthy']}")
    print(f"  Available: {health['available_models']}")
    
    # Test prediction
    print("\nTest Prediction (Diabetes patient):")
    result = service.predict({
        'age': 55, 'sex': 1,
        'sugar_percent_change': 35,
        'sugar_trend_up': 1,
        'trend_duration_months': 18,
    })
    print(f"  Risk: {result.risk_level} ({result.risk_score:.1%})")
    print(f"  Model: {result.model_used}")
    print(f"  Reason: {result.routing_reason}")
    if result.warnings:
        print(f"  Warnings: {result.warnings}")
