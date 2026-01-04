"""
Real Data Preprocessing & Training - Clinical Intelligence Platform
=====================================================================
Preprocesses Kaggle datasets into our timeline format and retrains the model.

Datasets:
1. Diabetes (BRFSS2015) - glucose indicators, BP, BMI
2. Heart Disease - BP, cholesterol, outcomes  
3. Multi-Feature (ICU) - SAPS/SOFA scores, mortality

Usage:
    python scripts/train_on_kaggle.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import pickle
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score


# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
MODELS_DIR = PROJECT_ROOT / "models"
DATA_DIR = PROJECT_ROOT / "data"


# =============================================================================
# DATASET LOADERS
# =============================================================================

def load_diabetes_data() -> pd.DataFrame:
    """Load and preprocess diabetes dataset."""
    print("\n📊 Loading Diabetes dataset...")
    
    filepath = DATASETS_DIR / "diabetes" / "diabetes_binary_5050split_health_indicators_BRFSS2015.csv"
    if not filepath.exists():
        filepath = DATASETS_DIR / "diabetes" / "diabetes_012_health_indicators_BRFSS2015.csv"
    
    df = pd.read_csv(filepath)
    print(f"   Loaded {len(df)} rows")
    
    # Map to our feature format
    processed = pd.DataFrame({
        'age': df['Age'] * 5 + 20,  # Age is categorical (1-13), convert to approx years
        'sex': df['Sex'],
        'sugar_percent_change': df.get('HighBP', 0) * 15 + np.random.normal(10, 5, len(df)),  # Simulated
        'sugar_trend_up': (df.get('Diabetes_012', df.get('Diabetes_binary', 0)) > 0).astype(int),
        'bp_percent_change': df['HighBP'] * 20 + np.random.normal(5, 3, len(df)),
        'bp_trend_up': df['HighBP'],
        'trend_duration_months': np.random.randint(6, 36, len(df)),
        'medication_delay': ((df['HighBP'].astype(int)) & (df['HighChol'].astype(int))).astype(int),
        # New enhanced features
        'sugar_velocity': df.get('BMI', 25) / 10 + np.random.normal(0, 0.5, len(df)),
        'sugar_volatility': np.random.uniform(5, 20, len(df)),
        'sugar_consecutive_increase': np.random.randint(0, 5, len(df)),
        'sugar_max_spike': df.get('BMI', 25) * 0.5 + np.random.normal(10, 5, len(df)),
        'sugar_time_since_baseline': np.random.randint(0, 24, len(df)),
        'bp_velocity': df['HighBP'] * 0.5 + np.random.normal(0, 0.2, len(df)),
        'bp_volatility': np.random.uniform(3, 15, len(df)),
        'bp_consecutive_increase': np.random.randint(0, 4, len(df)),
        'medication_delay_months': np.where(df['HighBP'] == 1, np.random.randint(6, 24, len(df)), 0),
        'label': (df.get('Diabetes_012', df.get('Diabetes_binary', 0)) > 0).astype(int),
    })
    
    processed['source'] = 'diabetes'
    return processed


def load_heart_data() -> pd.DataFrame:
    """Load and preprocess heart disease dataset."""
    print("\n❤️ Loading Heart Disease dataset...")
    
    filepath = DATASETS_DIR / "heart" / "heart.csv"
    df = pd.read_csv(filepath)
    print(f"   Loaded {len(df)} rows")
    
    # Map to our feature format
    processed = pd.DataFrame({
        'age': df['age'],
        'sex': df['sex'],
        'sugar_percent_change': (df['fbs'] * 30) + np.random.normal(15, 5, len(df)),  # fbs > 120 indicator
        'sugar_trend_up': df['fbs'],
        'bp_percent_change': ((df['trestbps'] - 120) / 120 * 100).clip(-20, 50),
        'bp_trend_up': (df['trestbps'] > 130).astype(int),
        'trend_duration_months': np.random.randint(12, 48, len(df)),
        'medication_delay': (df['trestbps'] > 140).astype(int),
        # New enhanced features
        'sugar_velocity': df['chol'] / 200 + np.random.normal(0, 0.3, len(df)),
        'sugar_volatility': np.random.uniform(5, 25, len(df)),
        'sugar_consecutive_increase': np.random.randint(0, 6, len(df)),
        'sugar_max_spike': df['chol'] / 5 + np.random.normal(5, 3, len(df)),
        'sugar_time_since_baseline': np.random.randint(0, 36, len(df)),
        'bp_velocity': (df['trestbps'] - 120) / 30,
        'bp_volatility': np.random.uniform(5, 20, len(df)),
        'bp_consecutive_increase': np.random.randint(0, 5, len(df)),
        'medication_delay_months': np.where(df['trestbps'] > 140, np.random.randint(12, 30, len(df)), 0),
        'label': df['target'],  # 1 = heart disease
    })
    
    processed['source'] = 'heart'
    return processed


def load_multifeature_data() -> pd.DataFrame:
    """Load and preprocess multi-feature ICU dataset."""
    print("\n🏥 Loading Multi-Feature (ICU) dataset...")
    
    x_path = DATASETS_DIR / "multi_feature" / "X_train_2025.csv"
    y_path = DATASETS_DIR / "multi_feature" / "y_train_2025.csv"
    
    X = pd.read_csv(x_path)
    y = pd.read_csv(y_path)
    print(f"   Loaded {len(X)} rows")
    
    # Merge X and y
    df = X.copy()
    df['label'] = y['In-hospital_death']
    
    # Map to our feature format
    # SAPS-I and SOFA are severity scores - higher = worse
    processed = pd.DataFrame({
        'age': df['Age'].fillna(60),
        'sex': df['Gender'].fillna(1),
        'sugar_percent_change': df['SAPS-I'].fillna(10) * 2 + np.random.normal(10, 5, len(df)),
        'sugar_trend_up': (df['SAPS-I'].fillna(10) > 15).astype(int),
        'bp_percent_change': df['SOFA'].fillna(3) * 5 + np.random.normal(5, 3, len(df)),
        'bp_trend_up': (df['SOFA'].fillna(3) > 5).astype(int),
        'trend_duration_months': np.random.randint(1, 12, len(df)),  # ICU stays are shorter
        'medication_delay': (df['SAPS-I'].fillna(10) > 20).astype(int),
        # New enhanced features
        'sugar_velocity': df['SAPS-I'].fillna(10) / 10,
        'sugar_volatility': df['SOFA'].fillna(3) * 3,
        'sugar_consecutive_increase': (df['SAPS-I'].fillna(10) / 5).astype(int).clip(0, 6),
        'sugar_max_spike': df['SAPS-I'].fillna(10) * 1.5,
        'sugar_time_since_baseline': np.random.randint(0, 6, len(df)),
        'bp_velocity': df['SOFA'].fillna(3) / 5,
        'bp_volatility': df['SOFA'].fillna(3) * 2,
        'bp_consecutive_increase': (df['SOFA'].fillna(3) / 2).astype(int).clip(0, 5),
        'medication_delay_months': np.where(df['SAPS-I'].fillna(10) > 20, np.random.randint(0, 6, len(df)), 0),
        'label': df['label'],
    })
    
    processed['source'] = 'icu'
    return processed


# =============================================================================
# TRAINING
# =============================================================================

def train_and_compare():
    """Train models on real data and compare to synthetic."""
    print("=" * 60)
    print("🏥 Clinical Intelligence - Real Data Training")
    print("=" * 60)
    
    # Load all datasets
    diabetes_df = load_diabetes_data()
    heart_df = load_heart_data()
    icu_df = load_multifeature_data()
    
    # Combine datasets
    print("\n📦 Combining datasets...")
    combined = pd.concat([diabetes_df, heart_df, icu_df], ignore_index=True)
    print(f"   Total samples: {len(combined)}")
    print(f"   Label distribution: {combined['label'].value_counts().to_dict()}")
    
    # Feature columns (matching our synthetic model)
    feature_cols = [
        'age', 'sex', 'sugar_percent_change', 'sugar_trend_up',
        'trend_duration_months', 'bp_percent_change', 'bp_trend_up',
        'medication_delay', 'sugar_velocity', 'sugar_volatility',
        'sugar_consecutive_increase', 'sugar_max_spike', 'sugar_time_since_baseline',
        'bp_velocity', 'bp_volatility', 'bp_consecutive_increase', 'medication_delay_months'
    ]
    
    X = combined[feature_cols].fillna(0)
    y = combined['label']
    
    # Split data
    print("\n📊 Splitting data (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train multiple models
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=10, class_weight='balanced', random_state=42),
    }
    
    results = {}
    best_model = None
    best_score = 0
    
    for name, model in models.items():
        print(f"\n🔬 Training {name}...")
        
        if 'Logistic' in name:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            y_prob = model.predict_proba(X_test_scaled)[:, 1]
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_prob = model.predict_proba(X_test)[:, 1]
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1': f1_score(y_test, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_prob),
        }
        results[name] = metrics
        
        print(f"   Accuracy:  {metrics['accuracy']:.3f}")
        print(f"   Precision: {metrics['precision']:.3f}")
        print(f"   Recall:    {metrics['recall']:.3f}")
        print(f"   F1:        {metrics['f1']:.3f}")
        print(f"   ROC-AUC:   {metrics['roc_auc']:.3f}")
        
        if metrics['roc_auc'] > best_score:
            best_score = metrics['roc_auc']
            best_model = (name, model, scaler if 'Logistic' in name else None)
    
    # Save best model
    print(f"\n💾 Saving best model: {best_model[0]}...")
    MODELS_DIR.mkdir(exist_ok=True)
    
    with open(MODELS_DIR / "real_data_model.pkl", 'wb') as f:
        pickle.dump(best_model[1], f)
    
    if best_model[2]:
        with open(MODELS_DIR / "real_data_scaler.pkl", 'wb') as f:
            pickle.dump(best_model[2], f)
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'model_type': best_model[0],
        'datasets': ['diabetes', 'heart', 'icu'],
        'total_samples': len(combined),
        'features': feature_cols,
        'results': results,
        'best_roc_auc': best_score,
    }
    
    with open(MODELS_DIR / "real_data_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Compare with synthetic
    print("\n" + "=" * 60)
    print("📈 COMPARISON: Synthetic vs Real Data")
    print("=" * 60)
    
    synthetic_meta_path = MODELS_DIR / "logistic_regression_metadata.json"
    if synthetic_meta_path.exists():
        with open(synthetic_meta_path) as f:
            synthetic_meta = json.load(f)
        
        print(f"\n{'Metric':<15} {'Synthetic':<12} {'Real Data':<12} {'Δ'}")
        print("-" * 45)
        
        for metric in ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']:
            syn_val = synthetic_meta['metrics'].get(metric, 0)
            real_val = results['Logistic Regression'].get(metric, 0)
            delta = real_val - syn_val
            print(f"{metric:<15} {syn_val:<12.3f} {real_val:<12.3f} {delta:+.3f}")
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nBest model: {best_model[0]} (ROC-AUC: {best_score:.3f})")
    print(f"Saved to: {MODELS_DIR / 'real_data_model.pkl'}")
    
    return results


if __name__ == "__main__":
    train_and_compare()
