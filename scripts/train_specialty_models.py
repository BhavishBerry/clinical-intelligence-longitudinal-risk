"""Train per-specialty risk models.

A clinician rarely has every field filled in. Rather than impute heavily into
one general model, we keep three narrower ones and let the router pick whichever
matches the data actually on hand:

    diabetes  - glucose-side features only
    cardiac   - blood-pressure-side features only
    general   - everything, for records with broad coverage

    python scripts/train_specialty_models.py
"""

import json
import pickle
from datetime import datetime
from pathlib import Path

import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split

from features import (
    CARDIAC_COLUMNS,
    DIABETES_COLUMNS,
    RANDOM_SEED,
    SHARED_COLUMNS,
    assert_no_target_leakage,
)
from train_on_kaggle import load_combined, load_diabetes_data, load_heart_data, load_multifeature_data

PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

TEST_SIZE = 0.2
CV_FOLDS = 5


def load_cardiac_only() -> pd.DataFrame:
    """Heart disease plus ICU - both carry usable blood-pressure signal."""
    return pd.concat([load_heart_data(), load_multifeature_data()], ignore_index=True)


def train_specialty_model(name: str, data: pd.DataFrame, columns: list) -> dict:
    X = data[columns].fillna(0)
    y = data["label"]
    assert_no_target_leakage(X, y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=100, max_depth=5, random_state=RANDOM_SEED
    )
    model.fit(X_train, y_train)

    # One hold-out split is easy to get lucky on, so report the CV spread too.
    cv = cross_val_score(model, X_train, y_train, cv=CV_FOLDS, scoring="roc_auc", n_jobs=-1)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_prob),
        "roc_auc_cv_mean": float(cv.mean()),
        "roc_auc_cv_std": float(cv.std()),
    }

    print(
        f"{name:<10} n={len(data):<6} acc {metrics['accuracy']:.3f}  "
        f"auc {metrics['roc_auc']:.3f} (cv {cv.mean():.3f} +/- {cv.std():.3f})"
    )

    MODELS_DIR.mkdir(exist_ok=True)
    model_path = MODELS_DIR / f"{name}_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    return {
        "name": name,
        "features": columns,
        "samples": len(data),
        "metrics": metrics,
        "model_path": str(model_path.relative_to(PROJECT_ROOT)),
    }


def select_model(available_features: list) -> str:
    """Pick the specialty whose inputs the caller actually has.

    Falls back to the general model when both sides are covered, or neither is.
    """
    glucose_side = {"sugar_percent_change", "sugar_trend_up", "sugar_velocity"}
    pressure_side = {"bp_percent_change", "bp_trend_up", "bp_velocity"}

    available = set(available_features)
    has_glucose = len(glucose_side & available) >= 2
    has_pressure = len(pressure_side & available) >= 2

    if has_glucose and not has_pressure:
        return "diabetes"
    if has_pressure and not has_glucose:
        return "cardiac"
    return "general"


def main() -> None:
    specialties = [
        ("diabetes", load_diabetes_data, DIABETES_COLUMNS),
        ("cardiac", load_cardiac_only, CARDIAC_COLUMNS),
        ("general", load_combined, SHARED_COLUMNS),
    ]

    results = {}
    for name, loader, columns in specialties:
        results[name] = train_specialty_model(name, loader(), columns)

    metadata = {
        "trained_at": datetime.now().isoformat(),
        "random_seed": RANDOM_SEED,
        "models": results,
    }
    with open(MODELS_DIR / "specialty_models_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved {len(results)} models and specialty_models_metadata.json")


if __name__ == "__main__":
    main()
