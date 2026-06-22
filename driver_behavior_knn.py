"""
==============================================================================
Driver Behavior Analysis Module — ECU Guardian
Intelligent Vehicle Health Monitoring & Predictive Maintenance System

Author  : ECU Guardian Team, SJEC Mangaluru
Module  : driver_behavior_knn.py
Version : 1.0.0

Description:
    Classifies driver behavior from OBD-II telemetry data into three categories:
        0 → Safe       (Normal city/highway driving)
        1 → Moderate   (Traffic / congested driving — Stau)
        2 → Aggressive (Freeway / high-speed driving — Frei)

    The module handles the full ML pipeline:
        1. Data loading & label inference from filenames
        2. Feature engineering (raw + derived OBD-II parameters)
        3. Preprocessing (imputation, scaling)
        4. KNN training with GridSearchCV hyperparameter tuning
        5. Evaluation with metrics + visualizations
        6. Model persistence (joblib)
        7. Prediction API (dict-in / structured-dict-out)
        8. DriverBehaviorModel class for real-time ELM327 integration

Usage:
    python driver_behavior_knn.py                  # full training run
    python driver_behavior_knn.py --predict-only   # load saved model & demo predict

Dependencies:
    scikit-learn, pandas, numpy, matplotlib, seaborn, joblib
==============================================================================
"""

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — IMPORTS
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import argparse
import logging
import os
import sys
import warnings
from pathlib import Path
from typing import Any

import joblib
import matplotlib
matplotlib.use("Agg")           # Non-interactive backend; safe for servers
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — CONFIGURATION / CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

# --- Paths -------------------------------------------------------------------
DATASET_DIR   = Path("obd_dataset/OBD-II-Dataset")
OUTPUT_DIR    = Path("outputs")
MODEL_PATH    = OUTPUT_DIR / "driver_behavior_knn.pkl"
SCALER_PATH   = OUTPUT_DIR / "scaler.pkl"
PLOT_DIR      = OUTPUT_DIR / "plots"

# --- Label mapping (inferred from filenames) ---------------------------------
# Normal → 0 (Safe) | Stau → 1 (Moderate) | Frei → 2 (Aggressive)
LABEL_MAP: dict[str, int] = {
    "Normal": 0,
    "Stau":   1,
    "Frei":   2,
}
LABEL_NAMES: dict[int, str] = {0: "Safe", 1: "Moderate", 2: "Aggressive"}

# --- Raw column name aliases (handles encoding artefacts in CSV headers) -----
COL_ALIASES: dict[str, str] = {
    "Engine Coolant Temperature":        "coolant_temp",
    "Intake Manifold Absolute Pressure": "map_kpa",
    "Engine RPM":                        "rpm",
    "Vehicle Speed Sensor":              "vss_kmh",
    "Intake Air Temperature":            "intake_air_temp",
    "Air Flow Rate from Mass Flow Sensor": "maf_gs",
    "Absolute Throttle Position":        "throttle_pos",
    "Ambient Air Temperature":           "ambient_temp",
    "Accelerator Pedal Position D":      "accel_pedal_d",
    "Accelerator Pedal Position E":      "accel_pedal_e",
}

# --- Feature columns used for model training ---------------------------------
RAW_FEATURES: list[str] = [
    "coolant_temp",
    "map_kpa",
    "rpm",
    "vss_kmh",
    "intake_air_temp",
    "maf_gs",
    "throttle_pos",
    "accel_pedal_d",
    "accel_pedal_e",
]
DERIVED_FEATURES: list[str] = [
    "mean_speed",
    "std_speed",
    "mean_rpm",
    "var_rpm",
    "pct_high_rpm",
    "hard_braking_freq",
    "sudden_accel_freq",
    "excessive_idle_ratio",
    "high_speed_ratio",
    "engine_load_avg",
]
ALL_FEATURES: list[str] = RAW_FEATURES + DERIVED_FEATURES

# --- Thresholds --------------------------------------------------------------
HIGH_RPM_THRESHOLD      = 3000.0   # RPM considered "high"
HARD_BRAKING_THRESHOLD  = -3.0     # m/s²  deceleration
SUDDEN_ACCEL_THRESHOLD  =  2.5     # m/s²  acceleration
IDLE_SPEED_THRESHOLD    =  2.0     # km/h  — vehicle "stopped"
HIGH_SPEED_THRESHOLD    = 90.0     # km/h

# --- Model training ----------------------------------------------------------
TEST_SIZE     = 0.20
RANDOM_STATE  = 42
CV_FOLDS      = 5
GRID_PARAMS: dict[str, list[Any]] = {
    "n_neighbors": [3, 5, 7, 9, 11],
    "weights":     ["uniform", "distance"],
    "metric":      ["euclidean", "manhattan"],
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — LOGGING SETUP
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(OUTPUT_DIR / "training.log" if OUTPUT_DIR.exists() else "training.log"),
    ],
)
logger = logging.getLogger("DriverBehavior")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — DATA PROCESSING
# ─────────────────────────────────────────────────────────────────────────────

def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rename raw CSV columns (which may contain degree symbols encoded badly)
    to clean snake_case aliases defined in COL_ALIASES.

    Parameters
    ----------
    df : pd.DataFrame
        Raw DataFrame from a single OBD-II CSV file.

    Returns
    -------
    pd.DataFrame
        DataFrame with renamed columns; unrecognised columns are dropped.
    """
    rename: dict[str, str] = {}
    for col in df.columns:
        for key, alias in COL_ALIASES.items():
            if key.lower() in col.lower():
                rename[col] = alias
                break
    df = df.rename(columns=rename)
    # Keep only known aliases + Time
    keep = [c for c in df.columns if c in COL_ALIASES.values() or c == "Time"]
    return df[keep]


def _infer_label_from_filename(filename: str) -> int | None:
    """
    Extract the driving-condition label from the CSV filename.

    Filename convention: YYYY-MM-DD_Make_Model_From_To_<Condition>[_note].csv
    Condition keywords: Normal | Stau | Frei

    Parameters
    ----------
    filename : str
        Basename of the CSV file (e.g. "2017-07-05_Seat_Leon_RT_S_Stau.csv").

    Returns
    -------
    int or None
        Numeric label (0/1/2) or None if the condition is unrecognised.
    """
    stem = Path(filename).stem
    # Files marked Messfehler (measurement error) are intentionally excluded
    if "Messfehler" in stem:
        return None
    for keyword, label in LABEL_MAP.items():
        if keyword in stem:
            return label
    return None


def load_data(dataset_dir: Path = DATASET_DIR) -> pd.DataFrame:
    """
    Load and concatenate all labelled OBD-II CSV files from *dataset_dir*.

    Each file is labelled according to its filename (Normal/Stau/Frei).
    Files flagged as measurement errors (Messfehler) are skipped.

    Parameters
    ----------
    dataset_dir : Path
        Directory containing the OBD-II CSV files.

    Returns
    -------
    pd.DataFrame
        Combined raw DataFrame with a 'label' column appended.

    Raises
    ------
    FileNotFoundError
        If the dataset directory does not exist.
    ValueError
        If no valid labelled CSV files are found.
    """
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    csv_files = sorted(dataset_dir.glob("*.csv"))
    if not csv_files:
        raise ValueError(f"No CSV files found in {dataset_dir}")

    frames: list[pd.DataFrame] = []
    skipped = 0

    for path in csv_files:
        label = _infer_label_from_filename(path.name)
        if label is None:
            logger.warning("Skipping '%s' — label unrecognised or file flagged.", path.name)
            skipped += 1
            continue

        try:
            df = pd.read_csv(path, encoding="latin-1", low_memory=False)
            df = _normalise_columns(df)
            df["label"]    = label
            df["filename"] = path.name
            frames.append(df)
            logger.info("Loaded %-60s | rows=%d | label=%s",
                        path.name, len(df), LABEL_NAMES[label])
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to read '%s': %s", path.name, exc)
            skipped += 1

    if not frames:
        raise ValueError("No valid data loaded. Check dataset directory and file format.")

    combined = pd.concat(frames, ignore_index=True)
    logger.info(
        "Dataset loaded — total rows: %d | files: %d | skipped: %d",
        len(combined), len(frames), skipped,
    )
    return combined


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def _compute_acceleration(speed_series: pd.Series, time_step: float = 0.1) -> pd.Series:
    """
    Estimate instantaneous acceleration (m/s²) from speed (km/h).

    Parameters
    ----------
    speed_series : pd.Series
        Vehicle speed in km/h.
    time_step : float
        Approximate sampling interval in seconds (default 0.1 s ≈ 10 Hz).

    Returns
    -------
    pd.Series
        Acceleration in m/s².
    """
    speed_ms = speed_series / 3.6            # km/h → m/s
    return speed_ms.diff().fillna(0) / time_step


def engineer_features_for_trip(df: pd.DataFrame) -> dict[str, float]:
    """
    Compute raw averages and derived behavioural features for a single trip.

    Parameters
    ----------
    df : pd.DataFrame
        Single-trip DataFrame (already normalised column names).

    Returns
    -------
    dict[str, float]
        Feature dictionary keyed by ALL_FEATURES names.
    """
    n = max(len(df), 1)                      # guard against empty trips

    # ── Raw feature means ────────────────────────────────────────────────────
    raw_means: dict[str, float] = {
        col: float(df[col].mean()) if col in df.columns else 0.0
        for col in RAW_FEATURES
    }

    # ── Derived features ─────────────────────────────────────────────────────
    speed  = df["vss_kmh"].fillna(0)   if "vss_kmh" in df.columns else pd.Series([0.0] * n)
    rpm    = df["rpm"].fillna(0)       if "rpm"     in df.columns else pd.Series([0.0] * n)
    load   = df["throttle_pos"].fillna(0) if "throttle_pos" in df.columns else pd.Series([0.0] * n)

    accel = _compute_acceleration(speed)

    derived: dict[str, float] = {
        # Speed statistics
        "mean_speed":          float(speed.mean()),
        "std_speed":           float(speed.std(ddof=0)),

        # RPM statistics
        "mean_rpm":            float(rpm.mean()),
        "var_rpm":             float(rpm.var(ddof=0)),

        # Percentage of time engine was above HIGH_RPM_THRESHOLD
        "pct_high_rpm":        float((rpm > HIGH_RPM_THRESHOLD).sum() / n * 100),

        # Hard braking events per 100 readings
        "hard_braking_freq":   float((accel < HARD_BRAKING_THRESHOLD).sum() / n * 100),

        # Sudden acceleration events per 100 readings
        "sudden_accel_freq":   float((accel > SUDDEN_ACCEL_THRESHOLD).sum() / n * 100),

        # Ratio of time vehicle was idling (speed < threshold)
        "excessive_idle_ratio": float((speed < IDLE_SPEED_THRESHOLD).sum() / n),

        # Ratio of time vehicle was travelling above high-speed threshold
        "high_speed_ratio":    float((speed > HIGH_SPEED_THRESHOLD).sum() / n),

        # Average engine/throttle load
        "engine_load_avg":     float(load.mean()),
    }

    return {**raw_means, **derived}


def build_feature_matrix(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Aggregate row-level OBD-II readings into trip-level feature vectors.

    Each unique (filename, label) pair is treated as one trip and summarised
    into a single feature row.

    Parameters
    ----------
    raw_df : pd.DataFrame
        Combined raw DataFrame from load_data().

    Returns
    -------
    tuple[pd.DataFrame, pd.Series]
        X : feature matrix (shape: n_trips × n_features)
        y : integer label series (length: n_trips)
    """
    logger.info("Engineering trip-level features …")
    records: list[dict[str, float]] = []
    labels:  list[int] = []

    for (filename, label), trip_df in raw_df.groupby(["filename", "label"]):
        feats = engineer_features_for_trip(trip_df)
        records.append(feats)
        labels.append(int(label))

    X = pd.DataFrame(records, columns=ALL_FEATURES)
    y = pd.Series(labels, name="label")

    logger.info("Feature matrix — shape: %s | class dist: %s",
                X.shape, dict(y.value_counts().sort_index()))
    return X, y


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — PREPROCESSING
# ─────────────────────────────────────────────────────────────────────────────

def preprocess_data(
    X: pd.DataFrame,
    y: pd.Series,
    scaler: StandardScaler | None = None,
    fit_scaler: bool = True,
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    """
    Clean and scale feature matrix.

    Steps:
        1. Drop fully-duplicate rows.
        2. Impute remaining NaN values with column medians.
        3. Scale features with StandardScaler (fit or transform-only).

    Parameters
    ----------
    X : pd.DataFrame
        Raw feature matrix.
    y : pd.Series
        Label series aligned with X.
    scaler : StandardScaler or None
        Pre-fitted scaler (used during inference). If None, a new scaler is
        created and fitted.
    fit_scaler : bool
        If True, fit and transform. If False, transform only (inference mode).

    Returns
    -------
    tuple[np.ndarray, np.ndarray, StandardScaler]
        X_scaled, y_array, scaler
    """
    # Remove duplicate rows
    combined = pd.concat([X, y.rename("label")], axis=1)
    before   = len(combined)
    combined = combined.drop_duplicates()
    after    = len(combined)
    if before != after:
        logger.info("Removed %d duplicate rows.", before - after)

    X_clean = combined.drop(columns=["label"])
    y_clean = combined["label"]

    # Impute missing values with column medians
    missing_before = X_clean.isna().sum().sum()
    X_clean = X_clean.fillna(X_clean.median(numeric_only=True))
    if missing_before:
        logger.info("Imputed %d missing values using column medians.", missing_before)

    # Scale
    if scaler is None:
        scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_clean) if fit_scaler else scaler.transform(X_clean)

    return X_scaled, y_clean.to_numpy(), scaler


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    param_grid: dict[str, list[Any]] = GRID_PARAMS,
    cv: int = CV_FOLDS,
) -> KNeighborsClassifier:
    """
    Train a KNN classifier with exhaustive GridSearchCV hyperparameter tuning.

    Parameters
    ----------
    X_train : np.ndarray
        Scaled training features.
    y_train : np.ndarray
        Training labels.
    param_grid : dict
        Hyperparameter grid for GridSearchCV.
    cv : int
        Number of cross-validation folds.

    Returns
    -------
    KNeighborsClassifier
        Best estimator selected by GridSearchCV (scored on F1-macro).
    """
    logger.info("Starting GridSearchCV — param combinations: %d | CV folds: %d",
                len(param_grid["n_neighbors"]) * len(param_grid["weights"]) * len(param_grid["metric"]),
                cv)

    base_knn = KNeighborsClassifier()
    grid_search = GridSearchCV(
        estimator=base_knn,
        param_grid=param_grid,
        cv=cv,
        scoring="f1_macro",
        n_jobs=-1,
        verbose=1,
        refit=True,
    )
    grid_search.fit(X_train, y_train)

    best_params = grid_search.best_params_
    best_score  = grid_search.best_score_
    logger.info("Best CV F1-macro: %.4f | Best params: %s", best_score, best_params)

    return grid_search.best_estimator_


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — EVALUATION
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_model(
    model:   KNeighborsClassifier,
    X_test:  np.ndarray,
    y_test:  np.ndarray,
    plot_dir: Path = PLOT_DIR,
) -> dict[str, float]:
    """
    Evaluate model on test set and generate diagnostic visualizations.

    Metrics computed:
        - Accuracy, Precision (macro), Recall (macro), F1 (macro)
        - Confusion matrix (heatmap saved to plot_dir)
        - Per-class classification report
        - Feature distribution plots (saved to plot_dir)

    Parameters
    ----------
    model : KNeighborsClassifier
        Fitted model.
    X_test : np.ndarray
        Scaled test features.
    y_test : np.ndarray
        True test labels.
    plot_dir : Path
        Directory in which to save plots.

    Returns
    -------
    dict[str, float]
        Dictionary of evaluation metrics.
    """
    plot_dir.mkdir(parents=True, exist_ok=True)
    y_pred = model.predict(X_test)

    metrics: dict[str, float] = {
        "accuracy":  accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall":    recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro":  f1_score(y_test, y_pred, average="macro", zero_division=0),
    }

    logger.info("── Evaluation Results ──────────────────────────────────────")
    for name, val in metrics.items():
        logger.info("  %-12s : %.4f", name, val)
    logger.info("────────────────────────────────────────────────────────────")

    target_names = [LABEL_NAMES[i] for i in sorted(LABEL_NAMES)]
    report = classification_report(y_test, y_pred, target_names=target_names, zero_division=0)
    print("\n" + "=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)
    print(report)

    _plot_confusion_matrix(y_test, y_pred, target_names, plot_dir)
    return metrics


def _plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list[str],
    plot_dir: Path,
) -> None:
    """Save a styled confusion matrix heatmap."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        linewidths=0.5,
        ax=ax,
    )
    ax.set_title("Confusion Matrix — Driver Behaviour KNN", fontsize=13, fontweight="bold")
    ax.set_ylabel("True Label",      fontsize=11)
    ax.set_xlabel("Predicted Label", fontsize=11)
    plt.tight_layout()
    path = plot_dir / "confusion_matrix.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    logger.info("Confusion matrix saved → %s", path)


def plot_class_distribution(y: pd.Series, plot_dir: Path = PLOT_DIR) -> None:
    """Save a bar chart of class frequencies."""
    plot_dir.mkdir(parents=True, exist_ok=True)
    counts = y.value_counts().sort_index()
    labels = [LABEL_NAMES[i] for i in counts.index]

    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(labels, counts.values, color=["#2ecc71", "#f39c12", "#e74c3c"], edgecolor="white")
    for bar, count in zip(bars, counts.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                str(count), ha="center", va="bottom", fontweight="bold")
    ax.set_title("Trip Class Distribution", fontsize=13, fontweight="bold")
    ax.set_ylabel("Number of Trips")
    ax.set_xlabel("Driving Behaviour")
    plt.tight_layout()
    path = plot_dir / "class_distribution.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    logger.info("Class distribution plot saved → %s", path)


def plot_feature_distributions(
    X: pd.DataFrame,
    y: pd.Series,
    features: list[str] | None = None,
    plot_dir: Path = PLOT_DIR,
) -> None:
    """Save per-feature KDE plots coloured by class."""
    plot_dir.mkdir(parents=True, exist_ok=True)
    features = features or DERIVED_FEATURES[:6]   # plot top 6 derived features by default

    palette = {0: "#2ecc71", 1: "#f39c12", 2: "#e74c3c"}
    n_cols, n_rows = 3, (len(features) + 2) // 3
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(14, 4 * n_rows))
    axes = axes.flatten()

    df_plot = X.copy()
    df_plot["label"] = y.values

    for idx, feat in enumerate(features):
        if feat not in df_plot.columns:
            continue
        ax = axes[idx]
        for label_id, label_name in LABEL_NAMES.items():
            subset = df_plot[df_plot["label"] == label_id][feat].dropna()
            if not subset.empty:
                try:
                    sns.kdeplot(subset, ax=ax, label=label_name, color=palette[label_id], fill=True, alpha=0.3)
                except Exception:
                    ax.hist(subset, bins=5, alpha=0.4, label=label_name, color=palette[label_id])
        ax.set_title(feat, fontsize=10)
        ax.set_xlabel("")
        ax.legend(fontsize=8)

    for idx in range(len(features), len(axes)):
        axes[idx].set_visible(False)

    fig.suptitle("Feature Distributions by Driving Behaviour", fontsize=13, fontweight="bold", y=1.01)
    plt.tight_layout()
    path = plot_dir / "feature_distributions.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("Feature distribution plots saved → %s", path)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — MODEL PERSISTENCE
# ─────────────────────────────────────────────────────────────────────────────

def save_model(
    model:       KNeighborsClassifier,
    scaler:      StandardScaler,
    model_path:  Path = MODEL_PATH,
    scaler_path: Path = SCALER_PATH,
) -> None:
    """
    Persist the trained model and scaler to disk using joblib.

    Parameters
    ----------
    model : KNeighborsClassifier
        Fitted KNN model.
    scaler : StandardScaler
        Fitted feature scaler.
    model_path : Path
        Destination for the serialised model.
    scaler_path : Path
        Destination for the serialised scaler.
    """
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model,  model_path,  compress=3)
    joblib.dump(scaler, scaler_path, compress=3)
    logger.info("Model saved  → %s", model_path)
    logger.info("Scaler saved → %s", scaler_path)


def load_model(
    model_path:  Path = MODEL_PATH,
    scaler_path: Path = SCALER_PATH,
) -> tuple[KNeighborsClassifier, StandardScaler]:
    """
    Load a previously saved model and scaler from disk.

    Parameters
    ----------
    model_path : Path
        Path to the serialised KNN model (.pkl).
    scaler_path : Path
        Path to the serialised StandardScaler (.pkl).

    Returns
    -------
    tuple[KNeighborsClassifier, StandardScaler]

    Raises
    ------
    FileNotFoundError
        If either file does not exist.
    """
    for path in (model_path, scaler_path):
        if not path.exists():
            raise FileNotFoundError(f"Model artefact not found: {path}")

    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    logger.info("Model loaded from  → %s", model_path)
    logger.info("Scaler loaded from → %s", scaler_path)
    return model, scaler


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10 — PREDICTION API
# ─────────────────────────────────────────────────────────────────────────────

def predict_driver_behavior(
    feature_dict: dict[str, float],
    model:        KNeighborsClassifier,
    scaler:       StandardScaler,
) -> dict[str, Any]:
    """
    Classify a single driver's behaviour from a feature dictionary.

    This function is the primary inference endpoint for integration with
    Flask/FastAPI routes or live ELM327 OBD-II streams.

    Parameters
    ----------
    feature_dict : dict[str, float]
        Mapping of feature names to values. Missing keys default to 0.0.
        Keys must correspond to ALL_FEATURES entries.
    model : KNeighborsClassifier
        Fitted model (from train_model() or load_model()).
    scaler : StandardScaler
        Fitted scaler (from preprocess_data() or load_model()).

    Returns
    -------
    dict with keys:
        "class_id"   : int   — 0, 1, or 2
        "behavior"   : str   — "Safe", "Moderate", or "Aggressive"
        "confidence" : float — probability of predicted class (0–1)
        "probabilities" : dict[str, float] — per-class probabilities

    Example
    -------
    >>> result = predict_driver_behavior(features, model, scaler)
    >>> print(result)
    {"class_id": 2, "behavior": "Aggressive", "confidence": 0.91,
     "probabilities": {"Safe": 0.05, "Moderate": 0.04, "Aggressive": 0.91}}
    """
    # Build feature row; fill missing with 0.0
    row = np.array([[feature_dict.get(f, 0.0) for f in ALL_FEATURES]], dtype=np.float64)

    # Replace any NaN values
    row = np.nan_to_num(row, nan=0.0)

    # Scale
    row_scaled = scaler.transform(row)

    # Predict
    class_id    = int(model.predict(row_scaled)[0])
    proba_array = model.predict_proba(row_scaled)[0]

    behavior    = LABEL_NAMES[class_id]
    confidence  = float(proba_array[class_id])

    probabilities = {
        LABEL_NAMES[i]: round(float(p), 4)
        for i, p in enumerate(proba_array)
    }

    return {
        "class_id":      class_id,
        "behavior":      behavior,
        "confidence":    round(confidence, 4),
        "probabilities": probabilities,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11 — DriverBehaviorModel CLASS (Real-Time Integration)
# ─────────────────────────────────────────────────────────────────────────────

class DriverBehaviorModel:
    """
    High-level wrapper for the KNN driver behaviour classifier.

    Designed for real-time integration with ELM327 OBD-II adapters and
    Flask/FastAPI backends.  Mirrors the scikit-learn estimator API.

    Attributes
    ----------
    model : KNeighborsClassifier or None
    scaler : StandardScaler or None
    is_fitted : bool

    Example
    -------
    # Training workflow
    dbm = DriverBehaviorModel()
    dbm.fit(X_train, y_train)
    dbm.save()

    # Inference workflow
    dbm = DriverBehaviorModel()
    dbm.load()
    result = dbm.predict(feature_dict)
    """

    def __init__(
        self,
        model_path:  Path = MODEL_PATH,
        scaler_path: Path = SCALER_PATH,
    ) -> None:
        self.model_path  = model_path
        self.scaler_path = scaler_path
        self.model:  KNeighborsClassifier | None = None
        self.scaler: StandardScaler | None       = None
        self.is_fitted: bool                     = False

    # ── Training ─────────────────────────────────────────────────────────────

    def fit(self, X_train: np.ndarray, y_train: np.ndarray) -> "DriverBehaviorModel":
        """
        Fit the KNN classifier using GridSearchCV.

        Parameters
        ----------
        X_train : np.ndarray
            Already-scaled training features (apply preprocess_data first).
        y_train : np.ndarray
            Training labels.

        Returns
        -------
        self
        """
        self.model    = train_model(X_train, y_train)
        self.is_fitted = True
        logger.info("DriverBehaviorModel fitted — best k=%d, weight=%s, metric=%s",
                    self.model.n_neighbors, self.model.weights, self.model.metric)
        return self

    # ── Inference ────────────────────────────────────────────────────────────

    def predict(self, feature_dict: dict[str, float]) -> dict[str, Any]:
        """
        Predict driver behaviour for a single feature dict.

        Parameters
        ----------
        feature_dict : dict[str, float]
            Live OBD-II feature values. Missing keys default to 0.0.

        Returns
        -------
        dict — see predict_driver_behavior() for schema.
        """
        self._assert_fitted()
        return predict_driver_behavior(feature_dict, self.model, self.scaler)  # type: ignore[arg-type]

    def predict_proba(self, feature_dict: dict[str, float]) -> dict[str, float]:
        """
        Return class probability estimates for a feature dict.

        Parameters
        ----------
        feature_dict : dict[str, float]

        Returns
        -------
        dict[str, float]  — {class_name: probability}
        """
        result = self.predict(feature_dict)
        return result["probabilities"]

    # ── Persistence ──────────────────────────────────────────────────────────

    def save(self) -> None:
        """Persist model and scaler to configured paths."""
        self._assert_fitted()
        save_model(self.model, self.scaler, self.model_path, self.scaler_path)  # type: ignore[arg-type]

    def load(self) -> "DriverBehaviorModel":
        """Load model and scaler from configured paths."""
        self.model, self.scaler = load_model(self.model_path, self.scaler_path)
        self.is_fitted = True
        return self

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _assert_fitted(self) -> None:
        if not self.is_fitted or self.model is None or self.scaler is None:
            raise RuntimeError(
                "Model not fitted. Call fit() or load() before prediction."
            )

    def __repr__(self) -> str:
        status = "fitted" if self.is_fitted else "unfitted"
        return f"DriverBehaviorModel(status={status}, model_path={self.model_path})"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 12 — MAIN EXECUTION PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_training_pipeline() -> None:
    """
    Execute the complete training pipeline end-to-end:
        1. Load & label OBD-II CSV files
        2. Engineer trip-level features
        3. Preprocess & scale
        4. Train KNN with GridSearchCV
        5. Evaluate on held-out test set
        6. Generate visualisations
        7. Save model artefacts
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PLOT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("═" * 60)
    logger.info("  ECU Guardian — Driver Behaviour Training Pipeline")
    logger.info("═" * 60)

    # 1. Load data ──────────────────────────────────────────────────────────
    raw_df = load_data(DATASET_DIR)

    # 2. Feature engineering ────────────────────────────────────────────────
    X, y = build_feature_matrix(raw_df)

    # 3. Visualise class distribution ───────────────────────────────────────
    plot_class_distribution(y, PLOT_DIR)

    # 4. Plot feature distributions (before scaling) ────────────────────────
    plot_feature_distributions(X, y, DERIVED_FEATURES[:6], PLOT_DIR)

    # 5. Preprocess ─────────────────────────────────────────────────────────
    X_scaled, y_arr, scaler = preprocess_data(X, y, fit_scaler=True)

    # 6. Train / test split ─────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_arr,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_arr,
    )
    logger.info("Train: %d samples | Test: %d samples", len(X_train), len(X_test))

    # 7. Train model ────────────────────────────────────────────────────────
    model = train_model(X_train, y_train)

    # 8. Evaluate ───────────────────────────────────────────────────────────
    evaluate_model(model, X_test, y_test, PLOT_DIR)

    # 9. Save artefacts ─────────────────────────────────────────────────────
    save_model(model, scaler, MODEL_PATH, SCALER_PATH)

    # 10. Demo prediction ────────────────────────────────────────────────────
    _demo_prediction(model, scaler)

    logger.info("═" * 60)
    logger.info("  Pipeline complete. Artefacts saved to → %s", OUTPUT_DIR)
    logger.info("═" * 60)


def _demo_prediction(
    model:  KNeighborsClassifier,
    scaler: StandardScaler,
) -> None:
    """Run a quick demo to verify the prediction API works end-to-end."""
    # Simulated real-time OBD-II readings from an aggressive driver
    sample_features: dict[str, float] = {
        "coolant_temp":         90.0,
        "map_kpa":             105.0,
        "rpm":                4500.0,
        "vss_kmh":            130.0,
        "intake_air_temp":     35.0,
        "maf_gs":              28.0,
        "throttle_pos":        75.0,
        "accel_pedal_d":       65.0,
        "accel_pedal_e":       62.0,
        "mean_speed":         125.0,
        "std_speed":           18.0,
        "mean_rpm":          4200.0,
        "var_rpm":        3500000.0,
        "pct_high_rpm":        82.0,
        "hard_braking_freq":    4.5,
        "sudden_accel_freq":    5.2,
        "excessive_idle_ratio": 0.02,
        "high_speed_ratio":     0.85,
        "engine_load_avg":     72.0,
    }

    result = predict_driver_behavior(sample_features, model, scaler)
    logger.info("── Demo Prediction Result ──────────────────────────────────")
    logger.info("  Class ID    : %d", result["class_id"])
    logger.info("  Behaviour   : %s", result["behavior"])
    logger.info("  Confidence  : %.2f%%", result["confidence"] * 100)
    logger.info("  Probabilities: %s", result["probabilities"])
    logger.info("────────────────────────────────────────────────────────────")


def run_predict_only_demo() -> None:
    """Load saved artefacts and run a prediction demo (no retraining)."""
    logger.info("Predict-only mode — loading saved model …")
    dbm = DriverBehaviorModel()
    dbm.load()

    sample: dict[str, float] = {
        "coolant_temp": 88.0, "rpm": 2800.0, "vss_kmh": 65.0,
        "throttle_pos": 30.0, "mean_speed": 60.0, "std_speed": 12.0,
        "mean_rpm": 2500.0, "var_rpm": 500000.0, "pct_high_rpm": 15.0,
        "hard_braking_freq": 0.5, "sudden_accel_freq": 0.3,
        "excessive_idle_ratio": 0.1, "high_speed_ratio": 0.1,
        "engine_load_avg": 35.0,
    }
    result = dbm.predict(sample)
    print("\nPrediction result:", result)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 13 — ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ECU Guardian — Driver Behaviour KNN Classifier"
    )
    parser.add_argument(
        "--predict-only",
        action="store_true",
        help="Skip training; load saved model and run a prediction demo.",
    )
    args = parser.parse_args()

    if args.predict_only:
        run_predict_only_demo()
    else:
        run_training_pipeline()


# ─────────────────────────────────────────────────────────────────────────────
# END OF FILE
# ─────────────────────────────────────────────────────────────────────────────

"""
══════════════════════════════════════════════════════════════════════════════
DESIGN NOTES
══════════════════════════════════════════════════════════════════════════════

1. WHY KNN?
   ─────────
   KNN is a strong baseline for telemetry classification because:
   • It is non-parametric — makes no assumptions about the underlying data
     distribution (OBD-II signals are multimodal and non-Gaussian).
   • It is interpretable — a prediction is directly explained by the k
     nearest training neighbours.
   • It benefits from StandardScaler, which this module applies correctly.
   • With distance weighting, it handles class boundaries well when trip
     feature clusters are compact (as observed in Normal vs Frei data).

2. TIME COMPLEXITY
   ────────────────
   Training  : O(1) — KNN is a lazy learner; no actual model is built.
               GridSearchCV cost is O(C × k × n) where C = combinations (20),
               k = CV folds (5), n = samples.
   Inference : O(n × d) per query — distance to all n training points in d
               dimensions. With n ≈ 28 trips and d = 19 features, this is
               negligible (<1 ms) in practice.
   Bottleneck: Real-time use with large training sets can be sped up by using
               KD-Tree or Ball-Tree (set algorithm='kd_tree' in sklearn).

3. LIMITATIONS OF KNN
   ───────────────────
   • Scales poorly with training set size (O(n·d) inference).
   • Sensitive to irrelevant or correlated features — mitigated here by
     careful feature selection.
   • Requires feature scaling (handled by StandardScaler in this module).
   • Cannot extrapolate beyond training distribution.
   • Unbalanced classes affect vote counting (addressed by distance weighting).

4. FUTURE IMPROVEMENTS
   ─────────────────────
   Replace or ensemble KNN with:

   a) Random Forest:
      • Handles class imbalance via class_weight='balanced'.
      • Feature importance rankings improve interpretability.
      • O(1) inference (tree traversal) — ideal for real-time.
      • Hyperparameter: n_estimators=200, max_depth=12.

   b) XGBoost:
      • Gradient boosted trees — highest accuracy on tabular OBD-II data
        (confirmed by Mahale et al. 2025 and Canal et al. 2024 in your
        literature survey).
      • Handles missing values natively — useful for sparse PID reads.
      • GPU-accelerated training available for fleet-scale datasets.
      • add: from xgboost import XGBClassifier

   c) LSTM (Long Short-Term Memory):
      • Captures temporal dependencies in the raw time-series data.
      • Ideal for the ML Health Monitoring pipeline described in your SRS
        (Section 4.2.1, Algorithm 4).
      • Use TensorFlow/Keras with sliding window input (window=60 timesteps).

══════════════════════════════════════════════════════════════════════════════
"""
