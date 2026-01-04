"""
Specialty-Specific Models - Clinical Intelligence Platform
============================================================
Creates focused models for different clinical specialties that work
better with partial data (e.g., only diabetes tests, only cardiac tests).

Models created:
1. diabetes_model.pkl - Uses only diabetes-relevant features
2. cardiac_model.pkl - Uses only cardiac-relevant features  
3. general_model.pkl - Uses all available features with smart defaults

Usage:
    python scripts/train_specialty_models.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
MODELS_DIR = PROJECT_ROOT / "models"

# Feature sets for each specialty
DIABETES_FEATURES = [
    'age', 'sex',
    'sugar_percent_change', 'sugar_trend_up', 'sugar_velocity',
    'sugar_volatility', 'sugar_consecutive_increase', 'sugar_max_spike',
    'sugar_time_since_baseline', 'trend_duration_months', 'medication_delay',
]

CARDIAC_FEATURES = [
    'age', 'sex',
    'bp_percent_change', 'bp_trend_up', 'bp_velocity',
    'bp_volatility', 'bp_consecutive_increase', 'trend_duration_months',
    'medication_delay',
]

GENERAL_FEATURES = [
    'age', 'sex', 'sugar_percent_change', 'sugar_trend_up',
    'trend_duration_months', 'bp_percent_change', 'bp_trend_up',
    'medication_delay', 'sugar_velocity', 'sugar_volatility',
    'sugar_consecutive_increase', 'sugar_max_spike', 'sugar_time_since_baseline',
    'bp_velocity', 'bp_volatility', 'bp_consecutive_increase', 'medication_delay_months'
]


# =============================================================================
# DATA LOADING (reuse from train_on_kaggle.py)
# =============================================================================

def load_all_data() -> pd.DataFrame:
    """Load all datasets and combine."""
    from train_on_kaggle import load_diabetes_data, load_heart_data, load_multifeature_data
    
    diabetes_df = load_diabetes_data()
    heart_df = load_heart_data()
    icu_df = load_multifeature_data()
    
    return pd.concat([diabetes_df, heart_df, icu_df], ignore_index=True)


def load_diabetes_only() -> pd.DataFrame:
    """Load only diabetes dataset."""
    from train_on_kaggle import load_diabetes_data
    return load_diabetes_data()


def load_cardiac_only() -> pd.DataFrame:
    """Load heart + relevant ICU data."""
    from train_on_kaggle import load_heart_data, load_multifeature_data
    
    heart_df = load_heart_data()
    icu_df = load_multifeature_data()
    
    return pd.concat([heart_df, icu_df], ignore_index=True)


# =============================================================================
# TRAINING
# =============================================================================

def train_specialty_model(name: str, data: pd.DataFrame, features: list) -> dict:
    """Train a specialty-specific model."""
    print(f"\n🔬 Training {name} Model...")
    print(f"   Features: {len(features)}")
    print(f"   Samples: {len(data)}")
    
    X = data[features].fillna(0)
    y = data['label']
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train Gradient Boosting (best performer)
    model = GradientBoostingClassifier(
        n_estimators=100, max_depth=5, random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, zero_division=0),
        'recall': recall_score(y_test, y_pred, zero_division=0),
        'f1': f1_score(y_test, y_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_test, y_prob),
    }
    
    print(f"   Accuracy:  {metrics['accuracy']:.3f}")
    print(f"   Precision: {metrics['precision']:.3f}")
    print(f"   Recall:    {metrics['recall']:.3f}")
    print(f"   ROC-AUC:   {metrics['roc_auc']:.3f}")
    
    # Save model
    model_path = MODELS_DIR / f"{name.lower()}_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"   Saved to: {model_path}")
    
    return {
        'name': name,
        'features': features,
        'samples': len(data),
        'metrics': metrics,
        'model_path': str(model_path),
    }


def create_model_selector():
    """Create a smart model selector that picks the right model based on available features."""
    
    selector_code = '''
def select_model(available_features: list) -> str:
    """
    Select the best model based on which features the doctor has available.
    
    Args:
        available_features: List of feature names the doctor has data for
        
    Returns:
        Model name to use: 'diabetes', 'cardiac', or 'general'
    """
    diabetes_features = {'sugar_percent_change', 'sugar_trend_up', 'sugar_velocity'}
    cardiac_features = {'bp_percent_change', 'bp_trend_up', 'bp_velocity'}
    
    available = set(available_features)
    
    has_diabetes = len(diabetes_features & available) >= 2
    has_cardiac = len(cardiac_features & available) >= 2
    
    if has_diabetes and not has_cardiac:
        return 'diabetes'
    elif has_cardiac and not has_diabetes:
        return 'cardiac'
    else:
        return 'general'
'''
    
    return selector_code


def main():
    print("=" * 60)
    print("🏥 Clinical Intelligence - Specialty Models Training")
    print("=" * 60)
    
    results = {}
    
    # 1. Diabetes Model
    print("\n📊 DIABETES SPECIALTY MODEL")
    print("-" * 40)
    diabetes_data = load_diabetes_only()
    results['diabetes'] = train_specialty_model('diabetes', diabetes_data, DIABETES_FEATURES)
    
    # 2. Cardiac Model
    print("\n❤️ CARDIAC SPECIALTY MODEL")
    print("-" * 40)
    cardiac_data = load_cardiac_only()
    results['cardiac'] = train_specialty_model('cardiac', cardiac_data, CARDIAC_FEATURES)
    
    # 3. General Model (all data, all features)
    print("\n🔬 GENERAL MODEL (All Data)")
    print("-" * 40)
    all_data = load_all_data()
    results['general'] = train_specialty_model('general', all_data, GENERAL_FEATURES)
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'models': results,
        'model_selector': create_model_selector(),
    }
    
    with open(MODELS_DIR / "specialty_models_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2, default=str)
    
    # Summary
    print("\n" + "=" * 60)
    print("📈 SPECIALTY MODELS SUMMARY")
    print("=" * 60)
    print(f"\n{'Model':<15} {'Samples':<10} {'Accuracy':<10} {'ROC-AUC':<10}")
    print("-" * 45)
    for name, info in results.items():
        print(f"{name:<15} {info['samples']:<10} {info['metrics']['accuracy']:.3f}      {info['metrics']['roc_auc']:.3f}")
    
    print("\n✅ All specialty models saved!")
    print(f"\nModels created:")
    print(f"  - diabetes_model.pkl ({len(DIABETES_FEATURES)} features)")
    print(f"  - cardiac_model.pkl ({len(CARDIAC_FEATURES)} features)")
    print(f"  - general_model.pkl ({len(GENERAL_FEATURES)} features)")
    print("\nUse the model selector to automatically pick the right model!")


if __name__ == "__main__":
    main()
