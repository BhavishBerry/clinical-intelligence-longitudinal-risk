"""
Intelligent Model Router - Clinical Intelligence Platform
============================================================
Automatically selects the best model based on available features.
Uses hierarchical ensemble when single models aren't confident enough.

Features:
1. Auto-detects which features are available
2. Picks the best specialty model OR uses ensemble
3. Returns confidence score with prediction
4. No doctor input needed - fully automatic

Usage:
    from model_router import ModelRouter
    
    router = ModelRouter()
    result = router.predict(patient_features)
    # Returns: {'risk_score': 0.78, 'risk_level': 'HIGH', 'model_used': 'diabetes', 'confidence': 0.92}
"""

import pickle
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

# Feature sets for each specialty
FEATURE_SETS = {
    'diabetes': [
        'age', 'sex', 'sugar_percent_change', 'sugar_trend_up', 'sugar_velocity',
        'sugar_volatility', 'sugar_consecutive_increase', 'sugar_max_spike',
        'sugar_time_since_baseline', 'trend_duration_months', 'medication_delay',
    ],
    'cardiac': [
        'age', 'sex', 'bp_percent_change', 'bp_trend_up', 'bp_velocity',
        'bp_volatility', 'bp_consecutive_increase', 'trend_duration_months',
        'medication_delay',
    ],
    'general': [
        'age', 'sex', 'sugar_percent_change', 'sugar_trend_up',
        'trend_duration_months', 'bp_percent_change', 'bp_trend_up',
        'medication_delay', 'sugar_velocity', 'sugar_volatility',
        'sugar_consecutive_increase', 'sugar_max_spike', 'sugar_time_since_baseline',
        'bp_velocity', 'bp_volatility', 'bp_consecutive_increase', 'medication_delay_months'
    ],
}

# Minimum confidence threshold for single model
CONFIDENCE_THRESHOLD = 0.70


# =============================================================================
# MODEL ROUTER
# =============================================================================

class ModelRouter:
    """
    Intelligent model selection and ensemble system.
    
    Decision Logic:
    1. Check which features are available
    2. Calculate "feature coverage" for each specialty
    3. Pick specialty with highest coverage OR use ensemble
    4. If prediction confidence < threshold, use hierarchical ensemble
    """
    
    def __init__(self):
        self.models = {}
        self.metadata = {}
        self._load_models()
    
    def _load_models(self):
        """Load all available specialty models."""
        for specialty in ['diabetes', 'cardiac', 'general']:
            model_path = MODELS_DIR / f"{specialty}_model.pkl"
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    self.models[specialty] = pickle.load(f)
                print(f"✓ Loaded {specialty} model")
            else:
                print(f"⚠ {specialty} model not found")
        
        # Load metadata
        meta_path = MODELS_DIR / "specialty_models_metadata.json"
        if meta_path.exists():
            with open(meta_path) as f:
                self.metadata = json.load(f)
    
    def _analyze_features(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Analyze which features are available and calculate coverage for each model.
        
        Returns:
            Dict with coverage score (0-1) for each specialty
        """
        available = set(k for k, v in features.items() if v is not None and v != 0)
        
        coverage = {}
        for specialty, required_features in FEATURE_SETS.items():
            matched = len(available & set(required_features))
            total = len(required_features)
            coverage[specialty] = matched / total if total > 0 else 0
        
        return coverage
    
    def _select_model(self, features: Dict[str, Any]) -> tuple:
        """
        Automatically select the best model based on available features.
        
        Returns:
            (model_name, confidence_in_selection)
        """
        coverage = self._analyze_features(features)
        
        # Check for specialty-specific data patterns
        has_sugar_data = any(k.startswith('sugar') and features.get(k, 0) != 0 for k in features)
        has_bp_data = any(k.startswith('bp') and features.get(k, 0) != 0 for k in features)
        
        # Decision logic
        if has_sugar_data and not has_bp_data:
            # Clearly diabetes-focused
            return 'diabetes', 0.95
        elif has_bp_data and not has_sugar_data:
            # Clearly cardiac-focused
            return 'cardiac', 0.95
        elif coverage['general'] > 0.8:
            # Have most features, use general
            return 'general', 0.90
        else:
            # Partial data from both - use ensemble
            return 'ensemble', coverage['general']
    
    def _prepare_features(self, features: Dict[str, Any], model_name: str) -> 'pd.DataFrame':
        """Prepare feature DataFrame for specific model with proper column names."""
        import pandas as pd
        required = FEATURE_SETS[model_name]
        data = {f: [features.get(f, 0)] for f in required}
        return pd.DataFrame(data)
    
    def _ensemble_predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hierarchical ensemble prediction when single model isn't confident.
        
        Strategy:
        1. Get predictions from all available models
        2. Weight by feature coverage
        3. Combine into final prediction
        """
        predictions = []
        weights = []
        coverage = self._analyze_features(features)
        
        for model_name, model in self.models.items():
            if model_name == 'general':
                continue  # Will add general at the end with higher weight
            
            try:
                X = self._prepare_features(features, model_name)
                prob = model.predict_proba(X)[0, 1]
                predictions.append(prob)
                weights.append(coverage[model_name])
            except Exception:
                continue
        
        # Add general model with higher weight
        if 'general' in self.models:
            try:
                X = self._prepare_features(features, 'general')
                prob = self.models['general'].predict_proba(X)[0, 1]
                predictions.append(prob)
                weights.append(coverage['general'] * 1.5)  # Higher weight for general
            except Exception:
                pass
        
        if predictions:
            # Weighted average
            weights = np.array(weights)
            predictions = np.array(predictions)
            final_prob = np.average(predictions, weights=weights)
            confidence = np.max(weights) / np.sum(weights)
        else:
            final_prob = 0.5
            confidence = 0.0
        
        return {
            'risk_score': round(float(final_prob), 3),
            'confidence': round(float(confidence), 3),
            'models_used': list(self.models.keys()),
        }
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main prediction method - automatically routes to best model.
        
        Args:
            features: Dict of patient features (can be partial!)
            
        Returns:
            {
                'risk_score': 0.78,
                'risk_level': 'HIGH',
                'model_used': 'diabetes',
                'confidence': 0.92,
                'routing_reason': 'Sugar-focused data detected'
            }
        """
        # Auto-select model
        model_name, selection_confidence = self._select_model(features)
        
        # Use ensemble for uncertain cases
        if model_name == 'ensemble':
            result = self._ensemble_predict(features)
            result['model_used'] = 'ensemble'
            result['routing_reason'] = 'Mixed data - using weighted ensemble'
        else:
            # Use single specialized model
            model = self.models.get(model_name)
            if model is None:
                # Fallback to general
                model_name = 'general'
                model = self.models.get('general')
            
            X = self._prepare_features(features, model_name)
            prob = model.predict_proba(X)[0, 1]
            
            # Check confidence - if low, upgrade to ensemble
            if abs(prob - 0.5) < 0.2 and selection_confidence < CONFIDENCE_THRESHOLD:
                result = self._ensemble_predict(features)
                result['model_used'] = f'ensemble (fallback from {model_name})'
                result['routing_reason'] = 'Low confidence - upgraded to ensemble'
            else:
                result = {
                    'risk_score': round(float(prob), 3),
                    'confidence': round(float(selection_confidence * abs(prob - 0.5) * 2 + 0.5), 3),
                    'model_used': model_name,
                    'routing_reason': f'{model_name.title()}-focused data detected',
                }
        
        # Determine risk level
        score = result['risk_score']
        if score >= 0.7:
            result['risk_level'] = 'HIGH'
        elif score >= 0.4:
            result['risk_level'] = 'MEDIUM'
        else:
            result['risk_level'] = 'LOW'
        
        return result


# =============================================================================
# STANDALONE USAGE
# =============================================================================

def create_router() -> ModelRouter:
    """Create a model router instance."""
    return ModelRouter()


if __name__ == "__main__":
    print("=" * 60)
    print("🧠 Intelligent Model Router - Demo")
    print("=" * 60)
    
    router = ModelRouter()
    
    # Test 1: Diabetes-only data
    print("\n📊 Test 1: Diabetes-only patient data")
    diabetes_patient = {
        'age': 55, 'sex': 1,
        'sugar_percent_change': 35, 'sugar_trend_up': 1,
        'sugar_velocity': 1.5, 'sugar_volatility': 12,
        'trend_duration_months': 18,
    }
    result = router.predict(diabetes_patient)
    print(f"   Model: {result['model_used']}")
    print(f"   Risk: {result['risk_level']} ({result['risk_score']:.1%})")
    print(f"   Reason: {result['routing_reason']}")
    
    # Test 2: Cardiac-only data
    print("\n❤️ Test 2: Cardiac-only patient data")
    cardiac_patient = {
        'age': 62, 'sex': 0,
        'bp_percent_change': 25, 'bp_trend_up': 1,
        'bp_velocity': 0.8,
        'trend_duration_months': 24,
    }
    result = router.predict(cardiac_patient)
    print(f"   Model: {result['model_used']}")
    print(f"   Risk: {result['risk_level']} ({result['risk_score']:.1%})")
    print(f"   Reason: {result['routing_reason']}")
    
    # Test 3: Mixed data (triggers ensemble)
    print("\n🔬 Test 3: Mixed patient data (ensemble)")
    mixed_patient = {
        'age': 58, 'sex': 1,
        'sugar_percent_change': 20, 'sugar_trend_up': 1,
        'bp_percent_change': 15, 'bp_trend_up': 1,
        'trend_duration_months': 12,
    }
    result = router.predict(mixed_patient)
    print(f"   Model: {result['model_used']}")
    print(f"   Risk: {result['risk_level']} ({result['risk_score']:.1%})")
    print(f"   Reason: {result['routing_reason']}")
    
    print("\n✅ Router ready for production!")
