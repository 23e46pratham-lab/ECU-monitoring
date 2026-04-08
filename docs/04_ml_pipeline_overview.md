# 04 — ML Pipeline Overview

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: ML Strategy, Problem Formulation, Feature Engineering, Data Preprocessing Pipeline

---

## 1. Machine Learning Strategy Overview

### 1.1 ML Tasks in this System

The system implements **five distinct ML tasks** over a single standardised OBD-II data stream. This multi-task approach is the key differentiator from prior work which addresses these tasks in isolation.

| # | ML Task | Type | Algorithm | Input | Output |
|---|---------|------|-----------|-------|--------|
| 1 | Anomaly Detection | Unsupervised + Semi-supervised | Isolation Forest + Autoencoder | Real-time sensor vector | Anomaly flag (binary) + anomaly score |
| 2 | Vehicle Health Scoring | Rule-based + ML-assisted | Weighted scoring model | Subsystem scores + anomaly outputs | Health Score (0–100) |
| 3 | Predictive Maintenance | Supervised Regression | Random Forest Regressor | Historical sensor trends | RUL (km/days) per component |
| 4 | Fuel Efficiency Prediction | Supervised Regression | Random Forest / SVR | Real-time sensor values | Fuel consumption (L/100km or MPG) |
| 5 | Driver Behaviour Classification | Unsupervised Clustering | K-Means (k=3) | Session-level aggregated features | Behaviour class + score (0–10) |
| 6 | Time-Series Forecasting (Future) | Deep Learning | LSTM | Sequential sensor windows | Predicted future sensor values |

### 1.2 ML Pipeline Architecture

```
Raw OBD-II Data (10 sensor columns at 1 Hz)
    │
    ▼
┌────────────────────────────┐
│  DATA PREPROCESSING        │
│  • Missing value handling  │
│  • Outlier detection       │
│  • Normalization           │
│  • Resampling              │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│  FEATURE ENGINEERING       │
│  • Rolling statistics      │
│  • Rate of change (Δ/Δt)  │
│  • Cross-parameter ratios  │
│  • Lagged features         │
│  • Session aggregations    │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
│  PARALLEL INFERENCE                                     │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Anomaly     │  │ Health Score │  │ Fuel         │  │
│  │ Detection   │  │ Computation  │  │ Prediction   │  │
│  │ (IF + AE)   │  │ (Weighted)   │  │ (RF Regr.)   │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐                    │
│  │ Predictive  │  │ Driver       │                    │
│  │ Maintenance │  │ Behaviour    │                    │
│  │ (RF Regr.)  │  │ (K-Means)   │                    │
│  └─────────────┘  └──────────────┘                    │
└──────────┬─────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────┐
│  ALERT GENERATION          │
│  • Threshold comparison    │
│  • Severity classification │
│  • Notification dispatch   │
└──────────┬─────────────────┘
           │
           ▼
    Dashboard + Database
```

---

## 2. Problem Formulation

### 2.1 Anomaly Detection

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Unsupervised anomaly detection (no labelled anomalies in dataset) |
| **Assumption** | The majority of the dataset represents normal vehicle behaviour; anomalies are rare deviations |
| **Approach 1 — Isolation Forest** | Isolates anomalies by randomly partitioning feature space; anomalies require fewer partitions to isolate |
| **Approach 2 — Autoencoder** | Learns to reconstruct normal patterns; high reconstruction error indicates anomaly |
| **Output** | Binary flag (anomaly / normal) + continuous anomaly score |
| **Evaluation** | Since no ground truth labels exist, evaluation uses: contamination tuning, visual inspection of flagged points, domain-expert review of threshold sensitivity |

### 2.2 Vehicle Health Score

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Weighted aggregation + rule-based scoring |
| **Components** | Thermal Health (coolant temp deviation), Engine Health (RPM stress, load stress), Electrical Health (battery voltage) |
| **Weighting** | Thermal: 40%, Engine: 40%, Electrical: 20% |
| **Scale** | 0–100 (0 = critical, 100 = excellent) |
| **Score Ranges** | 80–100: Excellent (green), 60–79: Good (amber), 40–59: Fair (orange), 0–39: Critical (red) |
| **ML Enhancement** | Anomaly detection output feeds into health score as a penalty factor |

### 2.3 Predictive Maintenance (RUL Estimation)

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Supervised regression — predict continuous RUL value |
| **Challenge** | No direct RUL labels in the OBD-II dataset. RUL must be **synthetically derived** from degradation patterns |
| **Synthetic Label Strategy** | Create degradation features (e.g., cumulative thermal stress, cumulative high-RPM cycles) → Map to estimated component wear → Assign synthetic RUL labels based on manufacturer-recommended service intervals |
| **Components Tracked** | Engine Oil, Coolant System, Brake Pads (inferred from braking frequency), Air Filter, Battery |
| **Algorithm** | Random Forest Regressor (chosen for robustness, interpretability, handling of non-linear relationships) |
| **Output** | RUL in km and estimated days for each component |

### 2.4 Fuel Efficiency Prediction

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Supervised regression — predict continuous fuel consumption |
| **Target Variable** | Fuel consumption computed from formula: `MPG = 710.7 × VSS(mph) / MAF(g/s)`, or equivalently `L/100km = 3600 × MAF / (speed_kmh × fuel_density × 1000)` |
| **Key Features** | MAF, Vehicle Speed, Engine RPM, Throttle Position, Intake Manifold Pressure |
| **Algorithm** | Random Forest Regressor / Support Vector Regression |
| **Evaluation** | R², RMSE, MAE on held-out test set |
| **Literature Benchmark** | Canal et al. (2024) achieved R² ≈ 0.99 with XGBoost on ECU data; Abukhalil et al. (2020) achieved RMSE = 2.4364 with SVM |

### 2.5 Driver Behaviour Classification

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Unsupervised clustering (no pre-labelled driving styles) |
| **Algorithm** | K-Means with k=3 clusters |
| **Cluster Interpretation** | Cluster 0: ECO-OPTIMAL (low throttle aggression, smooth RPM), Cluster 1: NORMAL (baseline), Cluster 2: AGGRESSIVE (high throttle, high RPM variance, frequent braking) |
| **Post-Clustering** | Assign human-readable labels based on cluster centroid analysis; compute driver score (0–10) using penalty-based system |
| **Features** | Throttle aggression (sum of positive throttle deltas), RPM volatility (standard deviation), Speed stability (coefficient of variation), Braking frequency (derived from deceleration events), Mean engine load |
| **Literature Benchmark** | Kumar & Jain (2023) achieved 100% accuracy with Random Forest for 10-class behaviour classification; Singh & Sharma (2025) used G-force metrics with similar results |

### 2.6 LSTM Time-Series Forecasting (Future Enhancement)

| Aspect | Detail |
|--------|--------|
| **Problem Type** | Sequence-to-sequence regression — predict future sensor values |
| **Architecture** | LSTM (Long Short-Term Memory) network |
| **Input** | Sliding window of N timesteps (e.g., 60 seconds of data) |
| **Output** | Predicted sensor values for the next M timesteps |
| **Purpose** | Early warning of thermal runaway, RPM instability, or sensor degradation trends |
| **Status** | Planned for Phase II implementation |

---

## 3. Feature Engineering

### 3.1 Raw Features (from OBD-II)

| Feature | Column Name in Dataset | Unit | Type |
|---------|----------------------|------|------|
| Timestamp | Time | seconds | Temporal |
| Engine Coolant Temperature | Engine Coolant Temperature [°C] | °C | Continuous |
| Intake Manifold Absolute Pressure | Intake Manifold Absolute Pressure [kPa] | kPa | Continuous |
| Engine RPM | Engine RPM [RPM] | RPM | Continuous |
| Vehicle Speed | Vehicle Speed Sensor [km/h] | km/h | Continuous |
| Intake Air Temperature | Intake Air Temperature [°C] | °C | Continuous |
| Mass Air Flow Rate | Air Flow Rate from Mass Flow Sensor [g/s] | g/s | Continuous |
| Throttle Position | Absolute Throttle Position [%] | % | Continuous |
| Ambient Air Temperature | Ambient Air Temperature [°C] | °C | Continuous |
| Accelerator Pedal Position D | Accelerator Pedal Position D [%] | % | Continuous |
| Accelerator Pedal Position E | Accelerator Pedal Position E [%] | % | Continuous |

### 3.2 Derived / Engineered Features

| Feature | Formula / Method | Unit | Used By |
|---------|-----------------|------|---------|
| **RPM Rate of Change** | `ΔRPM / Δt` (first difference) | RPM/s | Anomaly, Driver Behaviour |
| **Speed Rate of Change** | `ΔSpeed / Δt` | km/h/s | Driver Behaviour (acceleration/braking detection) |
| **Throttle Rate of Change** | `ΔThrottle / Δt` | %/s | Driver Behaviour |
| **Coolant Temp Rate of Change** | `ΔCoolant / Δt` | °C/s | Health Score, Anomaly |
| **Rolling Mean RPM** | `mean(RPM[t-W:t])` for window W | RPM | Anomaly, Health |
| **Rolling Std RPM** | `std(RPM[t-W:t])` for window W | RPM | Anomaly (RPM volatility) |
| **Rolling Mean Speed** | `mean(Speed[t-W:t])` | km/h | Driver Behaviour |
| **Rolling Std Speed** | `std(Speed[t-W:t])` | km/h | Driver Behaviour (speed stability) |
| **Throttle Aggression** | Sum of positive throttle deltas over window | — | Driver Behaviour |
| **Engine Load Estimate** | `(MAF / max_MAF) × 100` or directly from PID 0x04 | % | Health Score |
| **Fuel Consumption (Instantaneous)** | `710.7 × VSS(mph) / MAF(g/s)` → MPG | MPG or L/100km | Fuel Prediction |
| **Braking Event Count** | Count of `ΔSpeed/Δt < -threshold` in window | count | Driver Behaviour |
| **Cumulative Thermal Stress** | `sum(max(0, coolant - 100))` over session | °C·s | Predictive Maintenance |
| **Cumulative High-RPM Cycles** | Count of RPM > 4500 over session | count | Predictive Maintenance |
| **Speed Coefficient of Variation** | `std(Speed) / mean(Speed)` over session | — | Driver Behaviour |
| **RPM-to-Speed Ratio** | `RPM / Speed` (gear indicator proxy) | RPM/(km/h) | Driver Behaviour |
| **Accelerator Pedal Imbalance** | `abs(PedalD - PedalE)` | % | Anomaly (sensor health) |

### 3.3 Feature Sets per ML Task

| ML Task | Feature Set |
|---------|------------|
| **Anomaly Detection** | All 10 raw features + rolling means + rolling stds + rates of change = ~25 features |
| **Health Score** | Coolant temp deviation, RPM stress indicator, battery voltage, anomaly flag, DTC count |
| **Predictive Maintenance** | Cumulative thermal stress, cumulative high-RPM cycles, mean engine load, braking frequency, session duration |
| **Fuel Prediction** | MAF, Speed, RPM, Throttle, Manifold Pressure, Intake Temp |
| **Driver Behaviour** | Throttle aggression, RPM volatility (rolling std), Speed stability (CV), braking event count, mean engine load, mean speed |

---

## 4. Data Preprocessing Pipeline

### 4.1 Pipeline Steps

```
Raw CSV / Live Stream
    │
    ├── 1. LOADING & PARSING
    │       • Read CSV with proper column encoding
    │       • Parse timestamp column
    │       • Handle encoding issues (UTF-8 / Latin-1)
    │
    ├── 2. MISSING VALUE HANDLING
    │       • Strategy: Forward-fill for short gaps (≤5 consecutive readings)
    │       • For longer gaps: drop segment or interpolate (linear)
    │       • Log missing value percentage per column
    │
    ├── 3. DUPLICATE REMOVAL
    │       • Remove exact duplicate timestamps
    │       • Keep last if duplicate timestamps with different values
    │
    ├── 4. OUTLIER DETECTION & HANDLING
    │       • Physical range validation (see PID normal ranges in doc 03)
    │       • Values outside physical ranges → clip or flag
    │       • IQR-based outlier detection for statistical outliers within physical ranges
    │       • Strategy: clip extreme outliers, flag moderate ones for review
    │
    ├── 5. RESAMPLING
    │       • Ensure uniform 1 Hz sampling rate
    │       • Upsample if data is sub-Hz (linear interpolation)
    │       • Downsample if data is >1 Hz (mean aggregation)
    │
    ├── 6. FEATURE ENGINEERING
    │       • Compute all derived features (see Section 3.2)
    │       • Rolling windows: 10s, 30s, 60s configurable
    │       • Drop rows where rolling features have NaN (initial window period)
    │
    ├── 7. NORMALIZATION / SCALING
    │       • Method: StandardScaler (Z-score) for Isolation Forest, Autoencoder, K-Means
    │       • Method: MinMaxScaler for models requiring bounded inputs
    │       • Fit scaler on training data only; transform both train and test
    │
    ├── 8. TRAIN-TEST SPLIT
    │       • Strategy: Temporal split (not random shuffle) to respect time-series nature
    │       • Split ratio: 70% train / 15% validation / 15% test
    │       • Ensure no data leakage across temporal boundaries
    │
    └── 9. OUTPUT
            • Preprocessed DataFrames ready for model training
            • Scaler objects saved for inference-time transformation
            • Feature metadata saved for pipeline reproducibility
```

### 4.2 Code Reference: Preprocessing Pipeline

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from pathlib import Path

class OBDPreprocessor:
    """Preprocessing pipeline for OBD-II sensor data."""
    
    COLUMN_MAP = {
        'Engine Coolant Temperature [Â°C]': 'coolant_temp',
        'Intake Manifold Absolute Pressure [kPa]': 'manifold_pressure',
        'Engine RPM [RPM]': 'rpm',
        'Vehicle Speed Sensor [km/h]': 'speed',
        'Intake Air Temperature [Â°C]': 'intake_temp',
        'Air Flow Rate from Mass Flow Sensor [g/s]': 'maf',
        'Absolute Throttle Position [%]': 'throttle',
        'Ambient Air Temperature [Â°C]': 'ambient_temp',
        'Accelerator Pedal Position D [%]': 'accel_pedal_d',
        'Accelerator Pedal Position E [%]': 'accel_pedal_e',
    }
    
    PHYSICAL_RANGES = {
        'coolant_temp': (-40, 215),
        'manifold_pressure': (0, 255),
        'rpm': (0, 16384),
        'speed': (0, 255),
        'intake_temp': (-40, 215),
        'maf': (0, 655.35),
        'throttle': (0, 100),
        'ambient_temp': (-40, 215),
        'accel_pedal_d': (0, 100),
        'accel_pedal_e': (0, 100),
    }
    
    def __init__(self, window_sizes=[10, 30, 60]):
        self.window_sizes = window_sizes
        self.scaler = StandardScaler()
        self.fitted = False
    
    def load_csv(self, filepath: str) -> pd.DataFrame:
        """Load and parse a single OBD-II CSV file."""
        df = pd.read_csv(filepath, encoding='latin-1')
        df.rename(columns=self.COLUMN_MAP, inplace=True)
        df['timestamp'] = pd.to_datetime(df['Time'], unit='s', errors='coerce')
        return df
    
    def load_all(self, directory: str) -> pd.DataFrame:
        """Load and concatenate all CSV files from the dataset directory."""
        frames = []
        for filepath in Path(directory).glob('*.csv'):
            df = self.load_csv(str(filepath))
            df['source_file'] = filepath.stem
            frames.append(df)
        return pd.concat(frames, ignore_index=True).sort_values('timestamp')
    
    def handle_missing(self, df: pd.DataFrame, max_ffill: int = 5) -> pd.DataFrame:
        """Forward-fill gaps ≤ max_ffill; drop remaining NaNs."""
        df = df.fillna(method='ffill', limit=max_ffill)
        return df.dropna()
    
    def validate_ranges(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clip values to physical ranges."""
        for col, (low, high) in self.PHYSICAL_RANGES.items():
            if col in df.columns:
                df[col] = df[col].clip(lower=low, upper=high)
        return df
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute derived features."""
        # Rates of change
        for col in ['rpm', 'speed', 'throttle', 'coolant_temp']:
            df[f'{col}_delta'] = df[col].diff()
        
        # Rolling statistics
        for w in self.window_sizes:
            for col in ['rpm', 'speed', 'throttle']:
                df[f'{col}_rolling_mean_{w}'] = df[col].rolling(w).mean()
                df[f'{col}_rolling_std_{w}'] = df[col].rolling(w).std()
        
        # Throttle aggression (sum of positive deltas in window)
        df['throttle_aggression'] = df['throttle_delta'].clip(lower=0).rolling(60).sum()
        
        # Braking events (speed decreasing rapidly)
        df['braking_event'] = (df['speed_delta'] < -2.0).astype(int)
        df['braking_count_60s'] = df['braking_event'].rolling(60).sum()
        
        # Fuel consumption (instantaneous)
        speed_mph = df['speed'] * 0.621371  # km/h to mph
        df['mpg_instant'] = np.where(df['maf'] > 0, 710.7 * speed_mph / df['maf'], 0)
        
        # Pedal imbalance
        df['pedal_imbalance'] = (df['accel_pedal_d'] - df['accel_pedal_e']).abs()
        
        # RPM-to-Speed ratio
        df['rpm_speed_ratio'] = np.where(df['speed'] > 5, df['rpm'] / df['speed'], 0)
        
        # Drop initial NaN rows from rolling features
        df.dropna(inplace=True)
        
        return df
    
    def scale(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Apply StandardScaler. Fit on training data only."""
        feature_cols = [c for c in df.columns if c not in ['timestamp', 'source_file']]
        if fit:
            self.scaler.fit(df[feature_cols])
            self.fitted = True
        df[feature_cols] = self.scaler.transform(df[feature_cols])
        return df
    
    def temporal_split(self, df: pd.DataFrame, train_ratio=0.7, val_ratio=0.15):
        """Split data temporally (no shuffling)."""
        n = len(df)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))
        return df[:train_end], df[train_end:val_end], df[val_end:]
    
    def run(self, data_dir: str):
        """Execute full preprocessing pipeline."""
        df = self.load_all(data_dir)
        df = self.handle_missing(df)
        df = self.validate_ranges(df)
        df = self.engineer_features(df)
        train, val, test = self.temporal_split(df)
        train_scaled = self.scale(train, fit=True)
        val_scaled = self.scale(val, fit=False)
        test_scaled = self.scale(test, fit=False)
        return train_scaled, val_scaled, test_scaled
```

### 4.3 Dataset Characteristics After Preprocessing

| Metric | Value |
|--------|-------|
| Total raw CSV files | 81 |
| Vehicle | Seat Leon (single vehicle) |
| Recording period | July 2017 – April 2018 |
| Total raw records | ~500,000+ (estimated across 81 files) |
| Sampling rate | Variable (0.5–2 Hz, resampled to 1 Hz) |
| Raw features | 10 sensor columns + 1 timestamp |
| Engineered features | ~30+ additional columns |
| Total features after engineering | ~40 |
| Missing value rate | <2% (most files are complete) |
| Train / Validation / Test split | 70% / 15% / 15% (temporal) |

---

## 5. Model Training Pipeline

### 5.1 Training Workflow

```
1. LOAD preprocessed data (train split)
2. SELECT feature subset for target ML task
3. CONFIGURE model hyperparameters
4. TRAIN model on training set
5. VALIDATE on validation set → tune hyperparameters
6. EVALUATE on test set → report final metrics
7. SERIALIZE model (joblib for sklearn, SavedModel for TF)
8. VERSION model with metadata (timestamp, dataset hash, hyperparams, metrics)
9. DEPLOY to model store (./models/ directory)
```

### 5.2 Model Versioning

Each trained model is stored with metadata:

```
models/
├── anomaly_detection/
│   ├── isolation_forest_v1.0.joblib
│   ├── autoencoder_v1.0.h5
│   └── metadata.json
├── health_score/
│   ├── health_model_v1.0.joblib
│   └── metadata.json
├── predictive_maintenance/
│   ├── rul_oil_v1.0.joblib
│   ├── rul_coolant_v1.0.joblib
│   ├── rul_brakes_v1.0.joblib
│   └── metadata.json
├── fuel_efficiency/
│   ├── fuel_model_v1.0.joblib
│   └── metadata.json
├── driver_behaviour/
│   ├── kmeans_driver_v1.0.joblib
│   └── metadata.json
└── scalers/
    ├── standard_scaler_v1.0.joblib
    └── minmax_scaler_v1.0.joblib
```

**metadata.json** example:
```json
{
  "model_name": "isolation_forest_v1.0",
  "trained_at": "2026-04-05T12:00:00Z",
  "dataset_version": "KIT_OBD_2018_v1",
  "dataset_hash": "sha256:abc123...",
  "n_training_samples": 350000,
  "hyperparameters": {
    "n_estimators": 200,
    "contamination": 0.05,
    "max_features": 1.0,
    "random_state": 42
  },
  "metrics": {
    "estimated_anomaly_rate": 0.048,
    "silhouette_score": null
  },
  "feature_columns": ["rpm", "speed", "throttle", "coolant_temp", "..."]
}
```

---

*Cross-references: [03 OBD & Data Acquisition](03_obd_and_data_acquisition.md) · [05 ML Models Reference](05_ml_models_reference.md) · [06 Dataset](06_dataset_and_data_documentation.md)*
