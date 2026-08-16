"""Shared feature schema and data-quality checks for the risk models.

Both the combined-dataset trainer and the specialty trainers pull their column
lists from here so the two can't drift apart.
"""

import pandas as pd

# Every loader seeds from this so repeated runs give identical numbers. The
# timeline features are partly simulated, and without a fixed seed the reported
# scores wander by a couple of points between runs.
RANDOM_SEED = 42

SHARED_COLUMNS = [
    "age",
    "sex",
    "sugar_percent_change",
    "sugar_trend_up",
    "trend_duration_months",
    "bp_percent_change",
    "bp_trend_up",
    "medication_delay",
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

DIABETES_COLUMNS = [
    "age",
    "sex",
    "sugar_percent_change",
    "sugar_trend_up",
    "sugar_velocity",
    "sugar_volatility",
    "sugar_consecutive_increase",
    "sugar_max_spike",
    "sugar_time_since_baseline",
    "trend_duration_months",
    "medication_delay",
]

CARDIAC_COLUMNS = [
    "age",
    "sex",
    "bp_percent_change",
    "bp_trend_up",
    "bp_velocity",
    "bp_volatility",
    "bp_consecutive_increase",
    "trend_duration_months",
    "medication_delay",
]


class TargetLeakageError(ValueError):
    """Raised when a feature turns out to be a restatement of the label."""


def assert_no_target_leakage(X: pd.DataFrame, y: pd.Series, threshold: float = 0.95) -> None:
    """Fail loudly if any feature is effectively a copy of the target.

    A feature that reproduces the label drives every metric to 1.0 while the
    model learns nothing useful. The check is cheap, so it runs on every fit.
    """
    suspects = []
    for column in X.columns:
        agreement = (X[column] == y).mean()
        correlation = abs(X[column].corr(y)) if X[column].std() > 0 else 0.0
        if agreement >= threshold or correlation >= threshold:
            suspects.append(
                f"{column} (matches label {agreement:.1%} of rows, |r|={correlation:.3f})"
            )

    if suspects:
        raise TargetLeakageError(
            "These features mirror the label and must not be used:\n  "
            + "\n  ".join(suspects)
        )
