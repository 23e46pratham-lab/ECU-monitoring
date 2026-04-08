# 06 — Dataset & Data Documentation

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Dataset Description, Data Schema, Data Dictionary, Versioning, Validation Rules

---

## 1. Dataset Description

### 1.1 Primary Dataset

| Property | Value |
|----------|-------|
| **Name** | Automotive OBD-II Dataset |
| **Creator** | Marc Weber |
| **Institution** | Karlsruhe Institute of Technology (KIT), Germany |
| **DOI** | [10.5445/IR/1000085073](https://doi.org/10.5445/IR/1000085073) |
| **Production Year** | 2018 |
| **Publication Year** | 2023 |
| **License** | Apache License 2.0 |
| **Subject Area** | Engineering — Automotive |
| **Resource Type** | Dataset |

### 1.2 Data Collection Setup

| Property | Value |
|----------|-------|
| **Vehicle** | Seat Leon |
| **OBD-II Dongle** | KIWI 3 (PLX Devices) |
| **Recording Application** | OBD Auto Doctor (Creosys) |
| **Recording Device** | iOS smartphone |
| **Communication Protocol** | Bluetooth (KIWI 3 ↔ iPhone) |
| **Region** | Baden-Württemberg, Germany (cities: Karlsruhe [KA], Rottweil [RT], Stuttgart [S], Calw [CW], Böblingen [BB]) |
| **Recording Period** | July 5, 2017 – April 23, 2018 |
| **Number of Trips** | 81 individual trip recordings |

### 1.3 File Naming Convention

```
<yyyy-mm-dd>_<brand>_<model>_<from>_<to>_<condition>_<extension>.csv
```

| Field | Description | Example Values |
|-------|-------------|----------------|
| `yyyy-mm-dd` | Recording date | 2017-07-05 |
| `brand` | Vehicle brand | Seat |
| `model` | Vehicle model | Leon |
| `from` | Start location (German plate code) | KA (Karlsruhe), RT (Rottweil), S (Stuttgart) |
| `to` | End location (German plate code) | KA, RT, S, CW, BB |
| `condition` | Road/traffic condition label | Normal, Frei (free), Stau (busy/traffic), Frei (free-flowing) |
| `extension` | Special situations (optional) | Vollbremsung (full braking), Messfehler (measurement error), Beschleunigung (acceleration), Glatteis (black ice) |

### 1.4 Dataset Statistics

| Metric | Value |
|--------|-------|
| Total files | 81 CSV files |
| Total dataset size | ~135 MB (compressed: 11.5 MB ZIP) |
| Estimated total records | ~500,000+ rows |
| Columns per file | 11 (1 time + 10 sensor) |
| Smallest file | ~445 KB (2017-07-14_Seat_Leon_KA_KA_Frei.csv) |
| Largest file | ~5.5 MB (2018-03-29_Seat_Leon_KA_RT_Stau.csv) |
| Shortest trip | ~5 minutes |
| Longest trip | ~75 minutes |
| Route types | City (KA_KA), Highway (KA_RT, RT_S), Mixed |
| Traffic conditions | Normal, Frei (free), Stau (congested) |
| Special conditions | Vollbremsung (emergency braking), Glatteis (icy road), Beschleunigung (acceleration test), Messfehler (measurement error) |

### 1.5 Unique Route Combinations

| Route | Count | Description |
|-------|-------|-------------|
| KA → KA | 16 | Within Karlsruhe (city driving) |
| KA → RT | 8 | Karlsruhe to Rottweil (highway, ~100 km) |
| RT → KA | 8 | Rottweil to Karlsruhe (highway return) |
| RT → S | 13 | Rottweil to Stuttgart (highway, ~100 km) |
| S → RT | 13 | Stuttgart to Rottweil (highway return) |
| KA → BB | 1 | Karlsruhe to Böblingen |
| BB → RT | 2 | Böblingen to Rottweil |
| S → CW | 1 | Stuttgart to Calw |
| RT → RT | 2 | Within Rottweil (short local trips) |
| Other | 17 | Various combinations |

---

## 2. Data Schema

### 2.1 CSV Column Schema

| # | Column Name (as in CSV) | Clean Name | Data Type | Unit | PID | Nullable |
|---|------------------------|------------|-----------|------|-----|----------|
| 0 | Time | `timestamp` | float | seconds (from epoch or session start) | — | No |
| 1 | Engine Coolant Temperature [°C] | `coolant_temp` | float | °C | 0x05 | Yes |
| 2 | Intake Manifold Absolute Pressure [kPa] | `manifold_pressure` | float | kPa | 0x0B | Yes |
| 3 | Engine RPM [RPM] | `rpm` | float | RPM | 0x0C | No |
| 4 | Vehicle Speed Sensor [km/h] | `speed` | float | km/h | 0x0D | No |
| 5 | Intake Air Temperature [°C] | `intake_temp` | float | °C | 0x0F | Yes |
| 6 | Air Flow Rate from Mass Flow Sensor [g/s] | `maf` | float | g/s | 0x10 | Yes |
| 7 | Absolute Throttle Position [%] | `throttle` | float | % | 0x11 | No |
| 8 | Ambient Air Temperature [°C] | `ambient_temp` | float | °C | 0x46 | Yes |
| 9 | Accelerator Pedal Position D [%] | `accel_pedal_d` | float | % | 0x49 | Yes |
| 10 | Accelerator Pedal Position E [%] | `accel_pedal_e` | float | % | 0x4A | Yes |

**Note**: The original CSV files have encoding issues with the degree symbol (°). The raw column names contain `Ã‚Â°C` instead of `°C` due to UTF-8/Latin-1 encoding mismatch. The preprocessing pipeline handles this via column renaming.

### 2.2 Database Schema (PostgreSQL + TimescaleDB)

#### Table: `vehicles`
```sql
CREATE TABLE vehicles (
    vehicle_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make          VARCHAR(50) NOT NULL,
    model         VARCHAR(50) NOT NULL,
    year          INTEGER NOT NULL,
    vin           VARCHAR(17),
    engine_type   VARCHAR(20) DEFAULT 'gasoline',
    obd_protocol  VARCHAR(20) DEFAULT 'CAN',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `sessions`
```sql
CREATE TABLE sessions (
    session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id    UUID REFERENCES vehicles(vehicle_id),
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ,
    source_file   VARCHAR(255),
    status        VARCHAR(20) DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `sensor_data` (TimescaleDB Hypertable)
```sql
CREATE TABLE sensor_data (
    time                TIMESTAMPTZ NOT NULL,
    session_id          UUID REFERENCES sessions(session_id),
    vehicle_id          UUID REFERENCES vehicles(vehicle_id),
    rpm                 DOUBLE PRECISION,
    speed               DOUBLE PRECISION,
    coolant_temp        DOUBLE PRECISION,
    manifold_pressure   DOUBLE PRECISION,
    intake_temp         DOUBLE PRECISION,
    maf                 DOUBLE PRECISION,
    throttle            DOUBLE PRECISION,
    ambient_temp        DOUBLE PRECISION,
    accel_pedal_d       DOUBLE PRECISION,
    accel_pedal_e       DOUBLE PRECISION
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('sensor_data', 'time');

-- Enable compression for older data
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vehicle_id',
    timescaledb.compress_orderby = 'time DESC'
);
```

#### Table: `health_scores`
```sql
CREATE TABLE health_scores (
    id              SERIAL PRIMARY KEY,
    vehicle_id      UUID REFERENCES vehicles(vehicle_id),
    session_id      UUID REFERENCES sessions(session_id),
    timestamp       TIMESTAMPTZ NOT NULL,
    health_score    INTEGER CHECK (health_score BETWEEN 0 AND 100),
    thermal_health  INTEGER,
    engine_health   INTEGER,
    electrical_health INTEGER,
    risk_level      VARCHAR(10),
    is_anomaly      BOOLEAN DEFAULT FALSE,
    anomaly_score   DOUBLE PRECISION
);
```

#### Table: `maintenance_predictions`
```sql
CREATE TABLE maintenance_predictions (
    id              SERIAL PRIMARY KEY,
    vehicle_id      UUID REFERENCES vehicles(vehicle_id),
    component       VARCHAR(50) NOT NULL,
    predicted_rul_km    DOUBLE PRECISION,
    predicted_rul_days  INTEGER,
    urgency         VARCHAR(20),
    recommended_action  TEXT,
    predicted_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `driver_profiles`
```sql
CREATE TABLE driver_profiles (
    id              SERIAL PRIMARY KEY,
    vehicle_id      UUID REFERENCES vehicles(vehicle_id),
    session_id      UUID REFERENCES sessions(session_id),
    behaviour_class VARCHAR(20),
    driver_score    DOUBLE PRECISION,
    confidence      DOUBLE PRECISION,
    throttle_aggression DOUBLE PRECISION,
    rpm_volatility  DOUBLE PRECISION,
    speed_cv        DOUBLE PRECISION,
    braking_frequency DOUBLE PRECISION,
    fuel_impact     VARCHAR(30),
    insight_text    TEXT,
    classified_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `dtc_records`
```sql
CREATE TABLE dtc_records (
    id              SERIAL PRIMARY KEY,
    vehicle_id      UUID REFERENCES vehicles(vehicle_id),
    session_id      UUID REFERENCES sessions(session_id),
    code            VARCHAR(6) NOT NULL,
    severity        VARCHAR(20),
    description     TEXT,
    affected_system VARCHAR(50),
    probable_cause  TEXT,
    recommended_action TEXT,
    first_detected  TIMESTAMPTZ DEFAULT NOW(),
    cleared_at      TIMESTAMPTZ
);
```

#### Table: `alerts`
```sql
CREATE TABLE alerts (
    alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID REFERENCES vehicles(vehicle_id),
    alert_type      VARCHAR(30) NOT NULL,
    severity        VARCHAR(20) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT,
    component       VARCHAR(50),
    acknowledged    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);
```

#### Table: `users`
```sql
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);
```

#### Table: `user_vehicles`
```sql
CREATE TABLE user_vehicles (
    user_id     UUID REFERENCES users(user_id),
    vehicle_id  UUID REFERENCES vehicles(vehicle_id),
    role        VARCHAR(20) DEFAULT 'owner',
    PRIMARY KEY (user_id, vehicle_id)
);
```

---

## 3. Data Dictionary

### 3.1 Sensor Parameter Dictionary

| Parameter | Description | Physical Meaning | Typical Normal Range | How It's Measured | Relevance to ML |
|-----------|-------------|-----------------|---------------------|-------------------|----------------|
| **Engine Coolant Temperature** | Temperature of the engine coolant fluid circulating through the engine block | Indicates engine thermal state; cold = warming up, hot = potential overheating | 85–100 °C (operating) | Thermistor in coolant passage; resistance changes with temperature | Key input for thermal health scoring and anomaly detection |
| **Intake Manifold Absolute Pressure** | Air pressure inside the intake manifold | Low pressure = high vacuum = low load; high pressure = high load or turbo boost | 30–100 kPa (naturally aspirated) | Pressure sensor in intake manifold | Engine load estimation; fuel calculation |
| **Engine RPM** | Crankshaft rotation speed | Higher RPM = higher engine speed; directly correlates with power output | 600–1000 (idle), 1000–4000 (driving) | Crankshaft position sensor (Hall effect or inductive) | Core feature for anomaly detection, driver behaviour, health scoring |
| **Vehicle Speed** | Forward velocity of the vehicle | Zero = stationary; correlates with gear ratio × RPM | 0–120 km/h (typical), up to 255 km/h | Wheel speed sensor (ABS encoder ring) or transmission output shaft sensor | Fuel efficiency (MPG = f(speed, MAF)), driver behaviour |
| **Intake Air Temperature** | Temperature of air entering the engine | Affects air density and thus fuel-air mixture; hot air = less dense = less power | 15–45 °C (depends on ambient conditions) | Thermistor in intake manifold or air filter housing | Secondary input for fuel prediction, combustion efficiency |
| **Mass Air Flow Rate (MAF)** | Mass flow rate of air entering the engine per second | Directly proportional to fuel injection rate (stoichiometric ratio ~14.7:1 for gasoline) | 2–25 g/s (depends on engine size and load) | Hot-wire anemometer in intake tract | Primary input for fuel consumption calculation |
| **Absolute Throttle Position** | Opening angle of the throttle valve | 0% = closed (idle), 100% = wide open (full throttle) | 0–80% (normal driving) | Potentiometer or contactless position sensor on throttle body | Driver behaviour analysis, engine load correlation |
| **Ambient Air Temperature** | Outside air temperature | Weather context for engine performance and A/C load | -10 to 45 °C (seasonal) | External temp sensor (typically near front bumper) | Contextual feature for normalizing engine thermal behaviour |
| **Accelerator Pedal Position D** | Driver's foot position on the accelerator pedal (sensor D) | Direct indicator of driver demand | 0–100% | Dual-track potentiometer (first track) | Driver behaviour, throttle correlation validation |
| **Accelerator Pedal Position E** | Redundant accelerator pedal sensor (sensor E) | Safety-redundant measurement of driver demand | 0–100% | Dual-track potentiometer (second track) | Cross-validation with Sensor D for sensor health monitoring |

### 3.2 Derived Feature Dictionary

| Feature | Computation | Unit | Range | Purpose |
|---------|------------|------|-------|---------|
| `rpm_delta` | `rpm[t] - rpm[t-1]` | RPM/s | -2000 to +2000 | Acceleration/deceleration detection |
| `speed_delta` | `speed[t] - speed[t-1]` | km/h/s | -30 to +30 | Braking and acceleration events |
| `throttle_delta` | `throttle[t] - throttle[t-1]` | %/s | -50 to +50 | Throttle aggression |
| `coolant_delta` | `coolant[t] - coolant[t-1]` | °C/s | -2 to +2 | Thermal rate of change |
| `rpm_rolling_mean_30` | `mean(rpm[t-30:t])` | RPM | 0–8000 | Smoothed RPM trend |
| `rpm_rolling_std_30` | `std(rpm[t-30:t])` | RPM | 0–3000 | RPM volatility |
| `throttle_aggression` | `sum(max(0, throttle_delta))[t-60:t]` | — | 0–200+ | Cumulative throttle ramp |
| `braking_count_60s` | `count(speed_delta < -2)[t-60:t]` | count | 0–30 | Braking frequency |
| `mpg_instant` | `710.7 × speed(mph) / maf` | MPG | 0–100+ | Instantaneous fuel economy |
| `pedal_imbalance` | `abs(accel_d - accel_e)` | % | 0–50 | Sensor health indicator |
| `rpm_speed_ratio` | `rpm / speed` (if speed > 5) | RPM/(km/h) | 10–200 | Gear position proxy |

---

## 4. Data Versioning

### 4.1 Dataset Version Track

| Version | Date | Description | Hash |
|---------|------|-------------|------|
| v1.0 | 2018 | Original KIT OBD-II Dataset (81 CSV files, Seat Leon) | SHA256 of ZIP archive |
| v1.1 | 2026-Q1 | Preprocessed: column renaming, encoding fix, NaN handling | — |
| v1.2 | 2026-Q2 | Feature-engineered: all derived features added | — |
| v2.0 | Future | Additional vehicles / additional sensor columns | — |

### 4.2 Versioning Strategy

- Raw dataset stored as-is (immutable archive).
- Preprocessed versions stored as Parquet files with version suffix.
- Feature-engineered datasets versioned alongside the preprocessing code that generated them.
- Model metadata references the dataset version used for training.

---

## 5. Data Validation Rules

### 5.1 Physical Range Validation

| Field | Min | Max | Action if Violated |
|-------|-----|-----|--------------------|
| `rpm` | 0 | 16,384 | Clip to range |
| `speed` | 0 | 255 | Clip to range |
| `coolant_temp` | -40 | 215 | Clip to range |
| `manifold_pressure` | 0 | 255 | Clip to range |
| `intake_temp` | -40 | 215 | Clip to range |
| `maf` | 0 | 655.35 | Clip to range |
| `throttle` | 0 | 100 | Clip to range |
| `ambient_temp` | -40 | 215 | Clip to range |
| `accel_pedal_d` | 0 | 100 | Clip to range |
| `accel_pedal_e` | 0 | 100 | Clip to range |

### 5.2 Temporal Validation

| Rule | Check | Action |
|------|-------|--------|
| Monotonicity | Timestamps must be strictly increasing within a session | Drop duplicates; flag reordered records |
| Gap Detection | Time gap > 5 seconds between consecutive records | Log warning; split into sub-sessions if gap > 60s |
| Sampling Rate | Expected: 1 record/second (±500ms tolerance) | Resample if outside tolerance |

### 5.3 Cross-Parameter Validation

| Rule | Description | Action |
|------|-------------|--------|
| RPM=0 and Speed>0 | Engine off but vehicle moving — physically impossible for normal operation | Flag as potential sensor error |
| Speed=0 and Throttle>20% | Stationary with throttle open — unusual but possible (neutral rev) | Log for review |
| MAF=0 and RPM>0 | No air flow but engine running — sensor malfunction | Flag as anomaly |
| Pedal D-E imbalance >15% | Dual-track sensors diverging significantly | Flag as sensor health issue |
| Coolant temp rising while RPM=0 | Coolant temperature can not rise while engine is off | Flag as sensor error or residual heat (post-shutdown) |

### 5.4 Statistical Validation

| Check | Method | Threshold |
|-------|--------|-----------|
| Z-score outlier | Per-column Z-score computation | |Z| > 4 flagged as statistical outlier |
| IQR outlier | Per-column IQR computation | Below Q1 - 3×IQR or above Q3 + 3×IQR |
| Variance check | Per-column variance over session | Variance = 0 → suspect stuck sensor |
| Correlation integrity | RPM vs MAF correlation | Pearson r < 0.3 → suspect data quality issue |

---

*Cross-references: [03 OBD & Data Acquisition](03_obd_and_data_acquisition.md) · [04 ML Pipeline](04_ml_pipeline_overview.md) · [09 Database & Storage](09_database_and_storage.md)*
