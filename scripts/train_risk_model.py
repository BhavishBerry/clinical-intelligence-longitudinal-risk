"""
Risk Scoring Model Training - Clinical Intelligence Platform
=============================================================
Trains a risk scoring model on patient trend features.

Model Order (from Backend Architecture):
1. Logistic Regression (start here) ← Current
2. Gradient Boosted Trees (XGBoost)
3. Small Neural Network (later)

Usage:
    python scripts/train_risk_model.py --data data/synthetic/training_data.csv
"""

import argparse
import json
import pickle
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score
)


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "synthetic" / "training_data.csv"
MODEL_OUTPUT_DIR = PROJECT_ROOT / "models"

# Features used for training (Original + Enhanced Features)
FEATURE_COLUMNS = [
    # Demographics
    "age",
    "sex",
    # Original trend features
    "sugar_percent_change",
    "sugar_trend_up",
    "trend_duration_months",
    "bp_percent_change",
    "bp_trend_up",
    "medication_delay",
    # Enhanced features (NEW)
    "sugar_velocity",
    "sugar_volatility",
    "sugar_consecutive_increase",
    "sugar_max_spike",
    "sugar_time_since_baseline",
    "bp_velocity",
    "bp_volatility",
    "bp_consecutive_increase",
    "medication_delay_months",
]

LABEL_COLUMN = "label"


# =============================================================================
# DATA LOADING
# =============================================================================

def load_data(data_path: Path) -> pd.DataFrame:
    """Load and validate training data."""
    print(f"\n📂 Loading data from {data_path}")
    
    df = pd.read_csv(data_path)
    print(f"   ✓ Loaded {len(df)} samples")
    
    # Validate columns
    missing_features = [f for f in FEATURE_COLUMNS if f not in df.columns]
    if missing_features:
        print(f"   ⚠️ Warning: Missing features: {missing_features}")
        # Remove missing features from training
        for f in missing_features:
            FEATURE_COLUMNS.remove(f)
    
    if LABEL_COLUMN not in df.columns:
        raise ValueError(f"Missing label column: {LABEL_COLUMN}")
    
    print(f"   ✓ Features: {FEATURE_COLUMNS}")
    print(f"   ✓ Label distribution: {df[LABEL_COLUMN].value_counts().to_dict()}")
    
    return df


def prepare_features(df: pd.DataFrame):
    """Extract features and labels from dataframe."""
    available_features = [f for f in FEATURE_COLUMNS if f in df.columns]
    
    X = df[available_features].copy()
    y = df[LABEL_COLUMN].copy()
    
    # Handle missing values
    X = X.fillna(0)
    
    return X, y, available_features


# =============================================================================
# MODEL TRAINING
# =============================================================================

def train_logistic_regression(X_train, y_train, X_test, y_test):
    """Train Logistic Regression model (Phase 1)."""
    print("\n🔬 Training Logistic Regression...")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = LogisticRegression(
        random_state=42,
        max_iter=1000,
        class_weight='balanced'  # Handle imbalanced classes
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    
    metrics = evaluate_model(y_test, y_pred, y_prob, "Logistic Regression")
    
    return model, scaler, metrics


def train_gradient_boosting(X_train, y_train, X_test, y_test):
    """Train Gradient Boosting model (Phase 2)."""
    print("\n🌲 Training Gradient Boosting...")
    
    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=3,
        random_state=42,
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = evaluate_model(y_test, y_pred, y_prob, "Gradient Boosting")
    
    return model, None, metrics


# =============================================================================
# EVALUATION
# =============================================================================

def evaluate_model(y_true, y_pred, y_prob, model_name: str) -> dict:
    """Evaluate model performance."""
    print(f"\n📊 {model_name} Results:")
    
    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0,
    }
    
    print(f"   Accuracy:  {metrics['accuracy']:.3f}")
    print(f"   Precision: {metrics['precision']:.3f}")
    print(f"   Recall:    {metrics['recall']:.3f}")
    print(f"   F1 Score:  {metrics['f1']:.3f}")
    print(f"   ROC-AUC:   {metrics['roc_auc']:.3f}")
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print(f"\n   Confusion Matrix:")
    print(f"   TN={cm[0,0]:3d}  FP={cm[0,1]:3d}")
    print(f"   FN={cm[1,0]:3d}  TP={cm[1,1]:3d}")
    
    return metrics


def get_feature_importance(model, feature_names: list) -> dict:
    """Extract feature importance from model."""
    importance = {}
    
    if hasattr(model, 'coef_'):
        # Logistic Regression
        coefs = model.coef_[0]
        for name, coef in zip(feature_names, coefs):
            importance[name] = float(abs(coef))
    elif hasattr(model, 'feature_importances_'):
        # Tree-based models
        for name, imp in zip(feature_names, model.feature_importances_):
            importance[name] = float(imp)
    
    # Sort by importance
    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    return importance


# =============================================================================
# RISK SCORING
# =============================================================================

def create_risk_scorer(model, scaler, feature_names: list):
    """Create a risk scoring function."""
    
    def score_patient(features: dict) -> dict:
        """
        Score a patient's risk based on trend features.
        
        Input format (from Backend Architecture):
        {
            "age": 52,
            "sugar_percent_change": 29,
            "sugar_trend_up": 1,
            "bp_trend_up": 1,
            "trend_duration_months": 18,
            "medication_delay": 1
        }
        
        Output format:
        {
            "risk_score": 0.78,
            "risk_level": "HIGH",
            "confidence": 0.82
        }
        """
        # Prepare feature vector
        X = pd.DataFrame([features])[feature_names].fillna(0)
        
        if scaler:
            X = scaler.transform(X)
        
        # Get prediction
        prob = model.predict_proba(X)[0, 1]
        
        # Determine risk level
        if prob >= 0.7:
            level = "HIGH"
        elif prob >= 0.4:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return {
            "risk_score": round(float(prob), 2),
            "risk_level": level,
            "confidence": round(float(max(prob, 1-prob)), 2)
        }
    
    return score_patient


# =============================================================================
# MODEL SAVING
# =============================================================================

def save_model(model, scaler, feature_names: list, metrics: dict, model_name: str):
    """Save trained model and metadata."""
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save model
    model_path = MODEL_OUTPUT_DIR / f"{model_name}_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n💾 Saved model to {model_path}")
    
    # Save scaler if exists
    if scaler:
        scaler_path = MODEL_OUTPUT_DIR / f"{model_name}_scaler.pkl"
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        print(f"   Saved scaler to {scaler_path}")
    
    # Save metadata
    metadata = {
        "model_name": model_name,
        "trained_at": datetime.now().isoformat(),
        "features": feature_names,
        "metrics": metrics,
        "feature_importance": get_feature_importance(model, feature_names),
    }
    
    metadata_path = MODEL_OUTPUT_DIR / f"{model_name}_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   Saved metadata to {metadata_path}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Train risk scoring model")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_PATH),
                        help="Path to training data CSV")
    parser.add_argument("--model", type=str, default="logistic",
                        choices=["logistic", "gbm", "both"],
                        help="Model type to train")
    parser.add_argument("--test-size", type=float, default=0.2,
                        help="Test set size (0-1)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("🏥 Clinical Intelligence Platform - Risk Model Training")
    print("=" * 60)
    
    # Load data
    df = load_data(Path(args.data))
    X, y, feature_names = prepare_features(df)
    
    # Split data
    print(f"\n📊 Splitting data ({1-args.test_size:.0%} train, {args.test_size:.0%} test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} samples")
    print(f"   Test:  {len(X_test)} samples")
    
    # Train models
    if args.model in ["logistic", "both"]:
        model, scaler, metrics = train_logistic_regression(
            X_train, y_train, X_test, y_test
        )
        save_model(model, scaler, feature_names, metrics, "logistic_regression")
        
        # Demo scoring
        print("\n🎯 Demo: Scoring a sample patient...")
        sample = X_test.iloc[0].to_dict()
        scorer = create_risk_scorer(model, scaler, feature_names)
        result = scorer(sample)
        print(f"   Input: {sample}")
        print(f"   Output: {result}")
    
    if args.model in ["gbm", "both"]:
        model, scaler, metrics = train_gradient_boosting(
            X_train, y_train, X_test, y_test
        )
        save_model(model, scaler, feature_names, metrics, "gradient_boosting")
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nModels saved to: {MODEL_OUTPUT_DIR}")
    print("\nNext steps:")
    print("  1. Load model with pickle.load()")
    print("  2. Use create_risk_scorer() for predictions")
    print("  3. Build explanation generator")


if __name__ == "__main__":
    main()
