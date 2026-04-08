# 05 — ML Models Reference

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Detailed specification for each ML model — Anomaly Detection, Health Score, Predictive Maintenance, Fuel Efficiency, Driver Behaviour, LSTM Time-Series

---

## Model 1: Anomaly Detection (Isolation Forest + Autoencoder)

### 1.1 Problem Definition

Detect abnormal vehicle operating patterns — deviations from normal sensor behaviour that may indicate developing faults, sensor malfunctions, or unusual operating conditions — **before** a Diagnostic Trouble Code is set or a dashboard warning light activates.

### 1.2 Approach: Dual-Model Strategy

| Property | Isolation Forest | Autoencoder |
|----------|-----------------|-------------|
| Type | Unsupervised | Semi-supervised (trained on "normal" data) |
| Principle | Anomalies are easier to isolate with fewer random partitions | High reconstruction error = anomaly |
| Speed | Very fast (≤200 ms/record) | Moderate (≤500 ms/record) |
| Strength | No training labels needed; robust to high-dimensional data | Captures complex non-linear relationships |
| Weakness | May miss context-dependent anomalies | Requires careful threshold tuning |
| Framework | Scikit-learn | TensorFlow / PyTorch |

Final anomaly flag is determined by an **ensemble vote**: if either model flags anomaly → anomaly detected. Severity is escalated if both models agree.

### 1.3 Input Features

| Feature | Source | Preprocessing |
|---------|--------|--------------|
| Engine RPM | Raw PID 0x0C | Z-score normalized |
| Vehicle Speed | Raw PID 0x0D | Z-score normalized |
| Coolant Temperature | Raw PID 0x05 | Z-score normalized |
| Throttle Position | Raw PID 0x11 | Z-score normalized |
| MAF | Raw PID 0x10 | Z-score normalized |
| Manifold Pressure | Raw PID 0x0B | Z-score normalized |
| Intake Air Temp | Raw PID 0x0F | Z-score normalized |
| Ambient Temp | Raw PID 0x46 | Z-score normalized |
| Accel Pedal D | Raw PID 0x49 | Z-score normalized |
| Accel Pedal E | Raw PID 0x4A | Z-score normalized |
| RPM Rolling Std (30s) | Derived | Z-score normalized |
| Speed Rolling Std (30s) | Derived | Z-score normalized |
| RPM Rate of Change | Derived | Z-score normalized |
| Throttle Rate of Change | Derived | Z-score normalized |
| Coolant Temp Rate of Change | Derived | Z-score normalized |
| Pedal Imbalance | Derived | Z-score normalized |

**Total input dimension**: ~16 features

### 1.4 Output

| Output | Type | Values |
|--------|------|--------|
| `is_anomaly` | Binary | 0 (Normal) / 1 (Anomaly) |
| `anomaly_score` | Float | 0.0 (very normal) to 1.0 (highly anomalous) |
| `anomaly_type` | String | "RPM_INSTABILITY", "THERMAL_DEVIATION", "SENSOR_FAULT", "PATTERN_ANOMALY" |

### 1.5 Isolation Forest Hyperparameters

| Hyperparameter | Value | Rationale |
|---------------|-------|-----------|
| `n_estimators` | 200 | Sufficient trees for stable anomaly scores |
| `contamination` | 0.05 (5%) | Estimated proportion of anomalies in normal driving data |
| `max_features` | 1.0 | Use all features per tree |
| `max_samples` | 'auto' (256) | Default subsampling for efficiency |
| `random_state` | 42 | Reproducibility |
| `n_jobs` | -1 | Parallel computation |

### 1.6 Autoencoder Architecture

```
Input Layer:     16 neurons (input features)
                    │
Encoder:        Dense(64, ReLU) → BatchNorm → Dropout(0.2)
                Dense(32, ReLU) → BatchNorm → Dropout(0.2)
                Dense(16, ReLU) → BatchNorm
                    │
Bottleneck:     Dense(8, ReLU)    ← Compressed representation
                    │
Decoder:        Dense(16, ReLU) → BatchNorm → Dropout(0.2)
                Dense(32, ReLU) → BatchNorm → Dropout(0.2)
                Dense(64, ReLU) → BatchNorm
                    │
Output Layer:   Dense(16, Linear)  ← Reconstructed input
```

| Hyperparameter | Value |
|---------------|-------|
| Optimizer | Adam (lr=0.001) |
| Loss Function | MSE (Mean Squared Error) |
| Epochs | 50 |
| Batch Size | 256 |
| Early Stopping | patience=5 on validation loss |
| Anomaly Threshold | 95th percentile of training reconstruction error |

### 1.7 Training Method

1. **Data**: Use only "normal" driving data (entire KIT dataset assumed mostly normal).
2. **Split**: 70% train / 15% val / 15% test (temporal split).
3. **Isolation Forest**: `fit()` on training data → `predict()` returns -1 (anomaly) or 1 (normal).
4. **Autoencoder**: Train on training data to minimise reconstruction error → Threshold set at 95th percentile of training MSE → Test samples with MSE > threshold → anomaly.

### 1.8 Evaluation Metrics

Since ground truth anomaly labels don't exist in the dataset:

| Metric | Method |
|--------|--------|
| Estimated Anomaly Rate | Should be ~3-7% on unseen data (sanity check) |
| Precision (qualitative) | Manual review: are flagged anomalies actually unusual? |
| Reconstruction Error Distribution | Should show clear separation between normal (low MSE) and anomalous (high MSE) |
| Domain Validation | Inject synthetic anomalies (spike RPM to 7000, coolant to 120°C) → verify detection |
| Contamination Sensitivity | Sweep contamination from 0.01 to 0.10 → select value producing most actionable alerts |

### 1.9 Limitations

- No labelled anomaly dataset → evaluation is qualitative, not quantitative.
- Autoencoder threshold is dataset-specific; may need recalibration for different vehicles.
- Single-vehicle dataset (Seat Leon) → anomaly baselines may not transfer to other makes.

### 1.10 Possible Improvements

- Collect and label a small set of known fault scenarios for supervised evaluation.
- Use Variational Autoencoder (VAE) for probabilistic anomaly scoring.
- Implement sliding-window LSTM Autoencoder for temporal anomaly patterns.
- Add contextual anomaly detection (accounting for driving mode: idle vs highway).

---

## Model 2: Vehicle Health Score

### 2.1 Problem Definition

Compute a single, interpretable **Vehicle Health Score (0–100)** that summarizes the overall condition of the vehicle, analogous to a credit score for cars. The score must be understandable by non-technical users.

### 2.2 Input Features

| Feature | Source | Weight | Impact on Score |
|---------|--------|--------|----------------|
| Coolant Temperature | OBD-II PID 0x05 | 40% (Thermal Health) | >100°C → score decreases by 5 per °C above threshold |
| Engine RPM | OBD-II PID 0x0C | 20% (Engine Health) | >4500 RPM sustained → -5 penalty |
| Engine Load | Derived / PID 0x04 | 20% (Engine Health) | >90% sustained → -2 penalty |
| Battery Voltage | PID 0x42 | 20% (Electrical Health) | <12.8V → -10 penalty |
| Anomaly Detection Output | ML Model 1 | Modifier | Active anomaly → additional -5 to -15 |
| Active DTC Count | Fault Detection Module | Modifier | Per active DTC: -5 to -20 based on severity |

### 2.3 Computation Algorithm

```python
def compute_health_score(data, anomaly_result, dtc_count):
    # 1. Thermal Health (0-100)
    thermal_health = 100
    if data['coolant_temp'] > 100:
        thermal_health -= (data['coolant_temp'] - 100) * 5
    thermal_health = max(0, thermal_health)
    
    # 2. Engine Health (0-100)
    engine_health = 100
    if data['rpm'] > 4500:
        engine_health -= 5
    if data['load'] > 90:
        engine_health -= 2
    engine_health = max(0, engine_health)
    
    # 3. Electrical Health (0-100)
    electrical_health = 100
    if data['battery_voltage'] < 12.8:
        electrical_health -= 10
    if data['battery_voltage'] < 12.0:
        electrical_health -= 20
    electrical_health = max(0, electrical_health)
    
    # 4. Weighted composite
    vhs = round(
        thermal_health * 0.40 +
        engine_health * 0.40 +
        electrical_health * 0.20
    )
    
    # 5. Anomaly penalty
    if anomaly_result['is_anomaly']:
        vhs = max(0, vhs - 10)
    
    # 6. DTC penalty
    vhs = max(0, vhs - (dtc_count * 5))
    
    return min(100, max(0, vhs))
```

### 2.4 Output

| Output | Type | Range | Display |
|--------|------|-------|---------|
| `health_score` | Integer | 0–100 | Circular gauge, colour-coded |
| `risk_level` | String | "Low" / "Medium" / "High" | Text label with colour |
| `thermal_health` | Integer | 0–100 | Breakdown detail |
| `engine_health` | Integer | 0–100 | Breakdown detail |
| `electrical_health` | Integer | 0–100 | Breakdown detail |
| `summary_text` | String | — | Human-readable status message |

### 2.5 Score Interpretation

| Score Range | Colour | Label | Meaning |
|-------------|--------|-------|---------|
| 80–100 | Green (#00ff41) | Excellent | All systems nominal |
| 60–79 | Amber (#ffc800) | Good | Minor issues detected; monitoring |
| 40–59 | Orange (#ff8c00) | Fair | Attention needed; schedule maintenance |
| 0–39 | Red (#ff2a2a) | Critical | Immediate attention required |

---

## Model 3: Predictive Maintenance (RUL Estimation)

### 3.1 Problem Definition

Predict the **Remaining Useful Life (RUL)** of key vehicle components in kilometres and estimated days, enabling proactive, condition-based maintenance scheduling instead of fixed-interval servicing.

### 3.2 Components Tracked

| Component | Degradation Indicators | Typical Service Interval | Model Approach |
|-----------|----------------------|------------------------|----------------|
| Engine Oil | Cumulative thermal stress, total runtime, RPM hours | 10,000–15,000 km | RF Regression |
| Coolant System | Sustained high coolant temps, thermal cycling frequency | 40,000–60,000 km | RF Regression |
| Brake Pads | Braking event frequency × intensity, cumulative deceleration | 30,000–70,000 km | RF Regression |
| Air Filter | MAF degradation trend, cumulative runtime | 15,000–30,000 km | RF Regression |
| Battery | Voltage trend, charge cycle depth, ambient temp stress | 3–5 years | RF Regression |

### 3.3 Input Features (per component)

**Engine Oil RUL**:
| Feature | Description |
|---------|------------|
| `cumulative_thermal_stress` | Sum of (coolant_temp - 100)+ over total runtime |
| `total_runtime_hours` | Cumulative engine run time |
| `mean_rpm` | Average RPM during usage |
| `high_rpm_cycles` | Count of RPM > 4500 |
| `mean_engine_load` | Average calculated engine load |

**Brake Pads RUL**:
| Feature | Description |
|---------|------------|
| `cumulative_braking_intensity` | Sum of |speed_delta| for all braking events |
| `total_braking_events` | Count of braking events |
| `mean_braking_speed` | Average speed at which braking occurs |
| `aggressive_braking_ratio` | Proportion of hard braking events (|delta| > 5 km/h/s) |

### 3.4 Synthetic Label Generation

Since the dataset does not contain ground-truth RUL labels, they are **synthetically generated**:

```python
def generate_synthetic_rul(df, component, service_interval_km):
    """
    Assumes the vehicle starts with fresh components at the beginning of the dataset.
    RUL decreases based on usage intensity and stress factors.
    """
    # Estimate km driven from speed and time
    df['km_elapsed'] = (df['speed'] / 3600).cumsum()  # speed(km/h) × dt(s) / 3600
    
    # Base RUL: linear decrease from service_interval
    df[f'{component}_rul_km'] = service_interval_km - df['km_elapsed']
    
    # Stress modifier: accelerated wear under stress conditions
    if component == 'oil':
        stress_factor = 1 + (df['cumulative_thermal_stress'] / 10000)
        df[f'{component}_rul_km'] /= stress_factor
    
    df[f'{component}_rul_km'] = df[f'{component}_rul_km'].clip(lower=0)
    return df
```

### 3.5 Model: Random Forest Regressor

| Hyperparameter | Value | Rationale |
|---------------|-------|-----------|
| `n_estimators` | 200 | Balance between accuracy and speed |
| `max_depth` | 15 | Prevent overfitting while capturing patterns |
| `min_samples_split` | 10 | Ensure minimum data per split |
| `min_samples_leaf` | 5 | Prevent very specific leaves |
| `max_features` | 'sqrt' | Feature subsampling for ensemble diversity |
| `random_state` | 42 | Reproducibility |

### 3.6 Evaluation Metrics

| Metric | Target |
|--------|--------|
| R² (coefficient of determination) | ≥ 0.85 |
| RMSE (Root Mean Squared Error) | < 500 km |
| MAE (Mean Absolute Error) | < 300 km |
| MAPE (Mean Absolute % Error) | < 15% |

### 3.7 Output

| Output | Type | Example |
|--------|------|---------|
| `component` | String | "Engine Oil" |
| `rul_km` | Integer | 3,500 |
| `rul_days` | Integer | 45 |
| `urgency` | String | "Warning" |
| `recommended_action` | String | "Schedule oil change within 30 days" |

### 3.8 Limitations

- Synthetic RUL labels are approximations; real component wear varies by vehicle, driving conditions, and oil/brake pad brand.
- Single-vehicle dataset limits generalisability.
- No access to actual maintenance records for ground-truth validation.

### 3.9 Possible Improvements

- Integrate actual maintenance records (user-entered) to calibrate synthetic labels.
- Use degradation-based RUL (trend of MAF sensor accuracy degradation for air filter, voltage trend for battery).
- Apply ensemble methods (XGBoost, LightGBM) for potentially better accuracy.
- Use Bayesian approaches for uncertainty quantification in RUL estimates.

---

## Model 4: Fuel Efficiency Prediction

### 4.1 Problem Definition

Predict instantaneous and session-average fuel consumption from OBD-II sensor values, enabling real-time fuel economy feedback and efficiency trend analysis.

### 4.2 Input Features

| Feature | PID | Unit | Importance |
|---------|-----|------|-----------|
| Mass Air Flow Rate | 0x10 | g/s | Very High — directly proportional to fuel flow |
| Vehicle Speed | 0x0D | km/h | High — determines MPG (distance per fuel) |
| Engine RPM | 0x0C | RPM | Medium — correlates with fuel injection rate |
| Throttle Position | 0x11 | % | Medium — driver demand indicator |
| Intake Manifold Pressure | 0x0B | kPa | Medium — engine load proxy |
| Intake Air Temperature | 0x0F | °C | Low — affects air density and combustion |

### 4.3 Target Variable

Fuel consumption derived from the physics-based formula:

```
For gasoline vehicles:
MPG = 710.7 × VSS(mph) / MAF(g/s)

L/100km = 3600 × MAF / (speed_kmh × fuel_density × 1000)
where fuel_density ≈ 0.755 kg/L for gasoline
```

This formula-derived value serves as the target for the regression model. The ML model then learns to predict fuel consumption from the broader feature set, potentially outperforming the simple formula by capturing non-linear relationships.

### 4.4 Model: Random Forest Regressor

| Hyperparameter | Value |
|---------------|-------|
| `n_estimators` | 200 |
| `max_depth` | 20 |
| `min_samples_split` | 5 |
| `min_samples_leaf` | 2 |
| `max_features` | 'sqrt' |
| `random_state` | 42 |

### 4.5 Evaluation Metrics

| Metric | Target | Literature Benchmark |
|--------|--------|---------------------|
| R² | ≥ 0.90 | Canal et al.: 0.99 (XGBoost) |
| RMSE | < 1.5 L/100km | Abukhalil et al.: RMSE = 2.4364 (SVM) |
| MAE | < 1.0 L/100km | — |

### 4.6 Output

| Output | Type | Display |
|--------|------|---------|
| `fuel_consumption_instant` | Float (L/100km) | Live gauge + sparkline |
| `fuel_consumption_trip` | Float (L/100km) | Trip summary card |
| `mpg_instant` | Float | Alternative unit display |
| `baseline_deviation` | Float (%) | Alert if >20% deviation |

### 4.7 Limitations

- No direct fuel flow sensor data in the dataset; consumption is derived from MAF.
- Single vehicle type (Seat Leon) limits cross-vehicle accuracy.
- Diesel vehicles require different fuel density constant.

### 4.8 Possible Improvements

- Incorporate engine load and ambient temperature for better cold-start accuracy.
- Use XGBoost or LightGBM for potentially higher R² (as shown by Canal et al.).
- Add GPS-derived road gradient data for terrain-adjusted prediction.
- Implement separate models for different driving modes (city, highway, idle).

---

## Model 5: Driver Behaviour Classification

### 5.1 Problem Definition

Classify driving sessions into behaviour categories and compute a driver score, enabling feedback for safer and more fuel-efficient driving.

### 5.2 Input Features (Session-Level Aggregations)

| Feature | Computation | Unit |
|---------|------------|------|
| `mean_throttle` | Mean throttle position over session | % |
| `throttle_aggression` | Sum of positive throttle deltas / session duration | %/s |
| `rpm_volatility` | Standard deviation of RPM over session | RPM |
| `mean_speed` | Mean vehicle speed | km/h |
| `speed_cv` | Coefficient of variation of speed (std/mean) | — |
| `braking_frequency` | Number of braking events per km driven | events/km |
| `aggressive_braking_ratio` | Proportion of hard braking events (>3 km/h/s decel) | — |
| `mean_engine_load` | Mean calculated engine load | % |
| `high_rpm_ratio` | Proportion of time RPM > 4000 | — |
| `idle_ratio` | Proportion of time speed < 5 km/h | — |

### 5.3 Algorithm: K-Means Clustering

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `k` (n_clusters) | 3 | ECO-OPTIMAL, NORMAL, AGGRESSIVE |
| `init` | 'k-means++' | Better centroid initialisation |
| `n_init` | 10 | Multiple initialisations for stability |
| `max_iter` | 300 | Sufficient for convergence |
| `random_state` | 42 | Reproducibility |

### 5.4 Cluster Interpretation

After K-Means fitting, cluster centroids are analysed to assign labels:

| Cluster | Label | Typical Centroid Profile |
|---------|-------|------------------------|
| 0 | **ECO-OPTIMAL** | Low throttle aggression (<15), low RPM volatility (<200), high speed stability (CV <0.3), minimal aggressive braking |
| 1 | **NORMAL** | Moderate throttle aggression (15–40), moderate RPM volatility (200–500), average braking frequency |
| 2 | **AGGRESSIVE** | High throttle aggression (>40), high RPM volatility (>500), low speed stability (CV >0.5), frequent aggressive braking |

### 5.5 Driver Score Computation

```python
def compute_driver_score(cluster_label, features):
    """
    Compute driver score (0-10) using penalty-based approach.
    10 = perfect eco driving, 0 = dangerous driving.
    """
    score = 10.0
    
    # Penalty for throttle aggression
    score -= min(3.0, features['throttle_aggression'] / 20)
    
    # Penalty for aggressive braking
    score -= min(2.0, features['aggressive_braking_ratio'] * 5)
    
    # Penalty for high RPM usage
    score -= min(2.0, features['high_rpm_ratio'] * 4)
    
    # Penalty for speed instability
    score -= min(1.5, features['speed_cv'] * 2)
    
    # Bonus for eco driving
    if cluster_label == 0:  # ECO-OPTIMAL
        score = min(10.0, score + 1.0)
    
    return round(max(0, min(10, score)), 1)
```

### 5.6 Evaluation Metrics

| Metric | Method | Target |
|--------|--------|--------|
| Silhouette Score | `sklearn.metrics.silhouette_score` | ≥ 0.4 |
| Cluster Separation | Visual inspection of cluster centroids | Clear separation on key features |
| Inertia | Within-cluster sum of squares | Elbow method confirms k=3 |
| Domain Validation | Expert review of classified sessions | Labels match intuitive assessment |
| Literature Benchmark | Kumar & Jain (2023) → 100% RF accuracy for supervised classification | N/A (unsupervised) |

### 5.7 Output

| Output | Type | Display |
|--------|------|---------|
| `behaviour_class` | String | "ECO-OPTIMAL", "NORMAL", "AGGRESSIVE" |
| `driver_score` | Float (0–10) | Circular gauge |
| `confidence` | Float (%) | Confidence bar |
| `fuel_impact` | String | "+12% Consumption" or "-5% Consumption" |
| `insight_text` | String | "Smooth acceleration profile. Fuel efficiency maximized." |

### 5.8 Limitations

- Unsupervised approach: no ground-truth labels for behaviour categories.
- K-Means assumes spherical clusters; may not capture complex behaviour boundaries.
- Session-level aggregation loses within-session dynamics.
- Road conditions (traffic, terrain) affect driving patterns but are not accounted for.

### 5.9 Possible Improvements

- Use DBSCAN or Gaussian Mixture Models for non-spherical cluster shapes.
- Implement event-level classification (per-event, not per-session) using supervised models with labelled events.
- Incorporate G-force metrics (as in Singh & Sharma, 2025) for richer behaviour features.
- Add contextual features (traffic density, road type) to account for environmental factors.

---

## Model 6: LSTM Time-Series Forecasting (Future Enhancement)

### 6.1 Problem Definition

Predict future sensor values from historical sequences, enabling early warning of developing faults before they manifest as measurable anomalies. For example, predicting that coolant temperature will exceed 110°C in the next 5 minutes based on current trends.

### 6.2 Architecture

```
Input Shape: (batch_size, sequence_length, num_features)
             e.g., (32, 60, 10)  →  60 seconds of 10 features

Layer 1:    LSTM(64, return_sequences=True)
            Dropout(0.2)

Layer 2:    LSTM(32, return_sequences=False)
            Dropout(0.2)

Layer 3:    Dense(16, activation='relu')

Output:     Dense(10, activation='linear')
            →  Predicted next timestep for all 10 features
```

### 6.3 Planned Hyperparameters

| Parameter | Value |
|-----------|-------|
| Sequence Length | 60 timesteps (60 seconds at 1 Hz) |
| Prediction Horizon | 1 timestep (next second) or 60 timesteps (next minute) |
| Optimizer | Adam (lr=0.001) |
| Loss | MSE |
| Batch Size | 32 |
| Epochs | 100 with early stopping (patience=10) |

### 6.4 Training Strategy

- Sliding window: each training sample is a window of 60 consecutive readings → predict the 61st.
- Temporal train/test split (no shuffling).
- Evaluation: MAE per feature, worst-case prediction error.

### 6.5 Status

**Not yet implemented.** Planned for Phase II of the project. The infrastructure (data pipeline, feature engineering) supports LSTM integration.

### 6.6 Use Cases for LSTM

| Use Case | Input | Output |
|----------|-------|--------|
| Thermal Runaway Warning | 60s coolant temp trend | Predicted temp in 5 min |
| RPM Instability Forecast | 60s RPM sequence | Predicted RPM variance |
| Sensor Degradation | 60s MAF sequence | Predicted MAF drift |

---

## Summary: Model Comparison Matrix

| Model | Algorithm | Type | Input Dim | Output | Inference Time | Framework | Status |
|-------|-----------|------|-----------|--------|---------------|-----------|--------|
| Anomaly (IF) | Isolation Forest | Unsupervised | ~16 | Binary + Score | ≤200 ms | sklearn | Implemented |
| Anomaly (AE) | Autoencoder | Semi-supervised | ~16 | Binary + Score | ≤500 ms | TensorFlow | Implemented |
| Health Score | Weighted Model | Rule-based | 5–6 | Score (0–100) | ≤100 ms | Custom Python | Implemented |
| Pred. Maintenance | Random Forest Regr. | Supervised | 5–8 per component | RUL (km, days) | ≤1s per comp. | sklearn | Implemented |
| Fuel Efficiency | Random Forest Regr. | Supervised | 6 | L/100km or MPG | ≤100 ms | sklearn | Implemented |
| Driver Behaviour | K-Means | Unsupervised | 10 | Class + Score (0–10) | ≤200 ms | sklearn | Implemented |
| LSTM Forecast | LSTM | Deep Learning | (60, 10) | Predicted sequence | ≤1s | TensorFlow | Planned (Phase II) |

---

*Cross-references: [04 ML Pipeline Overview](04_ml_pipeline_overview.md) · [06 Dataset](06_dataset_and_data_documentation.md) · [11 Monitoring & Security](11_monitoring_logging_and_security.md)*
