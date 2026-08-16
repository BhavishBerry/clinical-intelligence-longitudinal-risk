"""Train the combined risk model on the three public clinical datasets.

The platform expects longitudinal features (trends, velocity, volatility), but
all three source datasets are cross-sectional. Each loader below therefore maps
real clinical columns onto the timeline schema, filling the genuinely unknowable
parts with seeded noise. Anything derived from the outcome column is off limits.

    python scripts/train_on_kaggle.py
"""

import json
import pickle
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

from features import RANDOM_SEED, SHARED_COLUMNS, assert_no_target_leakage

PROJECT_ROOT = Path(__file__).parent.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
MODELS_DIR = PROJECT_ROOT / "models"

TEST_SIZE = 0.2
CV_FOLDS = 5


def _rng() -> np.random.Generator:
    return np.random.default_rng(RANDOM_SEED)


def load_diabetes_data() -> pd.DataFrame:
    """BRFSS 2015 health indicators, mapped onto the timeline schema."""
    path = DATASETS_DIR / "diabetes" / "diabetes_binary_5050split_health_indicators_BRFSS2015.csv"
    if not path.exists():
        path = DATASETS_DIR / "diabetes" / "diabetes_012_health_indicators_BRFSS2015.csv"

    df = pd.read_csv(path)
    print(f"  diabetes: {len(df)} rows")

    rng = _rng()
    n = len(df)
    outcome = (df.get("Diabetes_012", df.get("Diabetes_binary", 0)) > 0).astype(int)

    # sugar_trend_up must not be read off the outcome column. BRFSS is a single
    # snapshot per respondent, so there is no real glucose trend available; we
    # proxy it with obesity plus poor self-rated health, which predict diabetes
    # without restating the answer.
    sugar_trend_up = ((df["BMI"] >= 30) & (df["GenHlth"] >= 4)).astype(int)

    frame = pd.DataFrame({
        "age": df["Age"] * 5 + 20,  # BRFSS bands age 1-13; approximate to years
        "sex": df["Sex"],
        "sugar_percent_change": df["HighBP"] * 15 + rng.normal(10, 5, n),
        "sugar_trend_up": sugar_trend_up,
        "bp_percent_change": df["HighBP"] * 20 + rng.normal(5, 3, n),
        "bp_trend_up": df["HighBP"],
        "trend_duration_months": rng.integers(6, 36, n),
        "medication_delay": (df["HighBP"].astype(int) & df["HighChol"].astype(int)),
        "sugar_velocity": df["BMI"] / 10 + rng.normal(0, 0.5, n),
        "sugar_volatility": rng.uniform(5, 20, n),
        "sugar_consecutive_increase": rng.integers(0, 5, n),
        "sugar_max_spike": df["BMI"] * 0.5 + rng.normal(10, 5, n),
        "sugar_time_since_baseline": rng.integers(0, 24, n),
        "bp_velocity": df["HighBP"] * 0.5 + rng.normal(0, 0.2, n),
        "bp_volatility": rng.uniform(3, 15, n),
        "bp_consecutive_increase": rng.integers(0, 4, n),
        "medication_delay_months": np.where(df["HighBP"] == 1, rng.integers(6, 24, n), 0),
        "label": outcome,
    })
    frame["source"] = "diabetes"
    return frame


def load_heart_data() -> pd.DataFrame:
    """UCI heart disease dataset, mapped onto the timeline schema."""
    df = pd.read_csv(DATASETS_DIR / "heart" / "heart.csv")
    print(f"  heart: {len(df)} rows")

    rng = _rng()
    n = len(df)

    frame = pd.DataFrame({
        "age": df["age"],
        "sex": df["sex"],
        "sugar_percent_change": df["fbs"] * 30 + rng.normal(15, 5, n),
        "sugar_trend_up": df["fbs"],  # fasting blood sugar > 120 mg/dL
        "bp_percent_change": ((df["trestbps"] - 120) / 120 * 100).clip(-20, 50),
        "bp_trend_up": (df["trestbps"] > 130).astype(int),
        "trend_duration_months": rng.integers(12, 48, n),
        "medication_delay": (df["trestbps"] > 140).astype(int),
        "sugar_velocity": df["chol"] / 200 + rng.normal(0, 0.3, n),
        "sugar_volatility": rng.uniform(5, 25, n),
        "sugar_consecutive_increase": rng.integers(0, 6, n),
        "sugar_max_spike": df["chol"] / 5 + rng.normal(5, 3, n),
        "sugar_time_since_baseline": rng.integers(0, 36, n),
        "bp_velocity": (df["trestbps"] - 120) / 30,
        "bp_volatility": rng.uniform(5, 20, n),
        "bp_consecutive_increase": rng.integers(0, 5, n),
        "medication_delay_months": np.where(df["trestbps"] > 140, rng.integers(12, 30, n), 0),
        "label": df["target"],
    })
    frame["source"] = "heart"
    return frame


def load_multifeature_data() -> pd.DataFrame:
    """ICU severity scores (SAPS-I, SOFA) against in-hospital mortality."""
    X = pd.read_csv(DATASETS_DIR / "multi_feature" / "X_train_2025.csv")
    y = pd.read_csv(DATASETS_DIR / "multi_feature" / "y_train_2025.csv")
    print(f"  icu: {len(X)} rows")

    rng = _rng()
    n = len(X)
    saps = X["SAPS-I"].fillna(10)
    sofa = X["SOFA"].fillna(3)

    frame = pd.DataFrame({
        "age": X["Age"].fillna(60),
        "sex": X["Gender"].fillna(1),
        "sugar_percent_change": saps * 2 + rng.normal(10, 5, n),
        "sugar_trend_up": (saps > 15).astype(int),
        "bp_percent_change": sofa * 5 + rng.normal(5, 3, n),
        "bp_trend_up": (sofa > 5).astype(int),
        "trend_duration_months": rng.integers(1, 12, n),  # ICU stays are short
        "medication_delay": (saps > 20).astype(int),
        "sugar_velocity": saps / 10,
        "sugar_volatility": sofa * 3,
        "sugar_consecutive_increase": (saps / 5).astype(int).clip(0, 6),
        "sugar_max_spike": saps * 1.5,
        "sugar_time_since_baseline": rng.integers(0, 6, n),
        "bp_velocity": sofa / 5,
        "bp_volatility": sofa * 2,
        "bp_consecutive_increase": (sofa / 2).astype(int).clip(0, 5),
        "medication_delay_months": np.where(saps > 20, rng.integers(0, 6, n), 0),
        "label": y["In-hospital_death"],
    })
    frame["source"] = "icu"
    return frame


def load_combined() -> pd.DataFrame:
    """All three datasets stacked into one frame."""
    print("Loading datasets...")
    frames = [load_diabetes_data(), load_heart_data(), load_multifeature_data()]
    combined = pd.concat(frames, ignore_index=True)
    print(f"  total: {len(combined)} rows, labels {combined['label'].value_counts().to_dict()}")
    return combined


def score(model, X_test, y_test) -> dict:
    """Hold-out metrics for a fitted model."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_prob),
    }


def build_candidates() -> dict:
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=RANDOM_SEED
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=100, max_depth=5, random_state=RANDOM_SEED
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=10, class_weight="balanced", random_state=RANDOM_SEED
        ),
    }


def train_and_compare() -> dict:
    combined = load_combined()

    X = combined[SHARED_COLUMNS].fillna(0)
    y = combined["label"]
    assert_no_target_leakage(X, y)
    print("Leakage check passed.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED, stratify=y
    )
    print(f"Split: {len(X_train)} train / {len(X_test)} test")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    results = {}
    best_name, best_model, best_scaler, best_auc = None, None, None, 0.0

    for name, model in build_candidates().items():
        needs_scaling = isinstance(model, LogisticRegression)
        fit_X, eval_X = (
            (X_train_scaled, X_test_scaled) if needs_scaling else (X_train, X_test)
        )

        model.fit(fit_X, y_train)
        metrics = score(model, eval_X, y_test)
        cv = cross_val_score(model, fit_X, y_train, cv=CV_FOLDS, scoring="roc_auc", n_jobs=-1)
        metrics["roc_auc_cv_mean"] = float(cv.mean())
        metrics["roc_auc_cv_std"] = float(cv.std())
        results[name] = metrics

        print(
            f"{name:<22} acc {metrics['accuracy']:.3f}  "
            f"auc {metrics['roc_auc']:.3f} (cv {cv.mean():.3f} +/- {cv.std():.3f})"
        )

        if metrics["roc_auc"] > best_auc:
            best_auc = metrics["roc_auc"]
            best_name, best_model = name, model
            best_scaler = scaler if needs_scaling else None

    MODELS_DIR.mkdir(exist_ok=True)
    with open(MODELS_DIR / "real_data_model.pkl", "wb") as f:
        pickle.dump(best_model, f)
    if best_scaler is not None:
        with open(MODELS_DIR / "real_data_scaler.pkl", "wb") as f:
            pickle.dump(best_scaler, f)

    metadata = {
        "trained_at": datetime.now().isoformat(),
        "model_type": best_name,
        "datasets": ["diabetes", "heart", "icu"],
        "total_samples": len(combined),
        "random_seed": RANDOM_SEED,
        "features": SHARED_COLUMNS,
        "results": results,
        "best_roc_auc": best_auc,
    }
    with open(MODELS_DIR / "real_data_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nBest: {best_name} (ROC-AUC {best_auc:.3f}) -> models/real_data_model.pkl")
    return results


if __name__ == "__main__":
    train_and_compare()
