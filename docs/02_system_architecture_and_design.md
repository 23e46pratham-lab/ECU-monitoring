# 02 — System Architecture & Design

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: High-Level Design, Low-Level Design, Data Flow, Component Architecture, Sequence Flows, Deployment Architecture

---

## 1. Architectural Overview

The system follows a **five-layer architecture** pattern, where each layer has a clearly defined responsibility and communicates with adjacent layers through well-specified interfaces. This separation of concerns enables independent scaling, testing, and replacement of individual components.

### 1.1 Layer Summary

| Layer | Technology Stack | Responsibility |
|-------|-----------------|----------------|
| **Hardware Layer** | OBD-II Scanner (ELM327), Vehicle ECU | Physical data acquisition from the vehicle's diagnostic port |
| **Ingestion Layer** | API Gateway, MQTT (Mosquitto), Data Validator | High-frequency telemetry buffering, protocol normalization, and stream management |
| **Processing Layer** | Python (FastAPI), K-Means, Random Forest, Isolation Forest, LSTM, Autoencoder | Business logic, formula-based calculations, and ML model inference |
| **Storage Layer** | PostgreSQL + TimescaleDB | Dual-database persistence for time-series sensor data and relational metadata |
| **Presentation Layer** | Web Dashboard (React 19 + TypeScript + Vite + Tailwind CSS v4, Recharts) + REST/WebSocket | Real-time visualization, alerts, and driver-facing reports |

---

## 2. High-Level Design (HLD)

### 2.1 System Context

The system operates in a context where:
- A **vehicle** exposes sensor data via the OBD-II port.
- An **ELM327 adapter** bridges the vehicle's CAN bus to a host device (laptop/phone) via Bluetooth/Wi-Fi.
- A **Python acquisition client** (`python-OBD`) polls PIDs and publishes structured records to an MQTT broker.
- A **backend server** (FastAPI) subscribes to the MQTT stream, runs ML inference, persists data, and serves the dashboard via REST+WebSocket APIs.
- A **web dashboard** renders real-time visualizations in the user's browser.

### 2.2 High-Level Architecture Diagram (Textual)

```
┌─────────────┐    CAN Bus     ┌──────────────┐   Bluetooth/Wi-Fi   ┌─────────────────────┐
│ Vehicle ECU │ ──────────────►│ ELM327 OBD-II│ ──────────────────► │ Acquisition Client  │
│ (Sensors)   │                │ Adapter       │                     │ (python-OBD)        │
└─────────────┘                └──────────────┘                     └──────────┬──────────┘
                                                                               │ MQTT Publish
                                                                               ▼
                                                                    ┌─────────────────────┐
                                                                    │ MQTT Broker          │
                                                                    │ (Mosquitto)          │
                                                                    └──────────┬──────────┘
                                                                               │ MQTT Subscribe
                                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVER (FastAPI)                                     │
│                                                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Data Ingestion│  │ ML Inference  │  │ Alert Engine │  │ API Router   │                │
│  │ Service       │  │ Engine        │  │              │  │ (REST/WS)    │                │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                   │                 │                         │
│         └────────────┬────┴───────────────────┘                 │                         │
│                      ▼                                          │                         │
│         ┌──────────────────────┐                                │                         │
│         │ PostgreSQL +         │                                │                         │
│         │ TimescaleDB          │                                │                         │
│         └──────────────────────┘                                │                         │
└──────────────────────────────────────────────────────────────────┤────────────────────────┘
                                                                   │ REST API + WebSocket
                                                                   ▼
                                                        ┌─────────────────────┐
                                                        │ Web Dashboard       │
                                                        │ (React/TS/Vite SPA) │
                                                        └─────────────────────┘
```

### 2.3 Communication Protocols

| Connection | Protocol | Direction | Port | Payload |
|-----------|----------|-----------|------|---------|
| ECU ↔ ELM327 | CAN (ISO 15765-4) | Bidirectional | — | OBD-II PID requests/responses |
| ELM327 ↔ Acquisition Client | Bluetooth SPP / Wi-Fi TCP | Bidirectional | BT or TCP:35000 | AT commands, PID query strings |
| Acquisition Client → MQTT Broker | MQTT v3.1.1 | Publish | 1883 (TLS: 8883) | JSON sensor records |
| MQTT Broker → Backend | MQTT v3.1.1 | Subscribe | 1883 | JSON sensor records |
| Backend ↔ Dashboard | HTTP/1.1 + WebSocket | Bidirectional | 8000 (HTTPS: 443) | JSON REST responses + WS frames |
| Backend ↔ Database | PostgreSQL wire protocol | Bidirectional | 5432 | SQL queries/results |

---

## 3. Low-Level Design (LLD)

### 3.1 Module Decomposition

The system is decomposed into four primary **processing modules**, each with distinct inputs, algorithms, and outputs:

#### Module 1: Driver Behaviour Profiling
| Attribute | Detail |
|-----------|--------|
| **Input Features** | Vehicle Speed (VSS), Engine RPM, Throttle Position, Brake Events (derived) |
| **Algorithm** | K-Means Clustering (k=3) |
| **Output** | Driver classification (ECO-OPTIMAL / NORMAL / AGGRESSIVE) + Driver Score (0–10) |
| **Update Frequency** | Per session / batch (end of trip) |
| **Key Derived Features** | Throttle aggression (sum of positive deltas), RPM volatility (variance), speed stability, braking frequency |

#### Module 2: Real-Time Mileage Calculation
| Attribute | Detail |
|-----------|--------|
| **Input Features** | Vehicle Speed Sensor (VSS in mph), Mass Air Flow (MAF in g/s) |
| **Formula** | `MPG = 710.7 × VSS / MAF` (gasoline) |
| **Output** | Instantaneous MPG, Trip Average MPG, Lifetime Average MPG |
| **Update Frequency** | Every ~1 second (real-time) |

#### Module 3: Diagnostic Fault Detection
| Attribute | Detail |
|-----------|--------|
| **Input** | OBD-II Mode 03 (stored DTCs) and Mode 07 (pending DTCs) |
| **Algorithm** | DTC Lookup Table (SAE J2012 standard codes) |
| **Output** | DTC code + severity classification + plain-language description + recommended action |
| **Update Frequency** | On user request or periodic scan (configurable interval) |

#### Module 4: ML-Based Health Monitoring & Predictive Maintenance
| Attribute | Detail |
|-----------|--------|
| **Input Features** | 9 ECU parameters: Engine Coolant Temp, Intake Manifold Pressure, Engine RPM, Vehicle Speed, Intake Air Temp, MAF, Throttle Position, Ambient Temp, Accelerator Pedal Position |
| **Algorithms** | Isolation Forest + Autoencoder (anomaly detection), Random Forest (health classification + RUL prediction), Weighted scoring model (VHS) |
| **Output** | Vehicle Health Score (0–100), Anomaly flags, Remaining Useful Life estimates, Maintenance alerts |
| **Update Frequency** | Every 5–10 seconds during active session |

### 3.2 Module Interaction Matrix

| Module | Depends On | Provides Data To | Update Frequency |
|--------|-----------|-------------------|-----------------|
| Driver Behaviour Profiling | VSS, RPM, Throttle, Brake (OBD-II) | Presentation Layer, Storage Layer | Per session / batch |
| Mileage Calculation | VSS, MAF (OBD-II) | Presentation Layer (live gauge), Storage | Every ~1 second |
| Fault Detection | OBD-II Modes 03/07 | Health Module, Presentation Layer | On request / periodic |
| ML Health Monitoring | 9 ECU params + DTC status from other modules | Presentation Layer (alerts), Storage | Every 5–10 seconds |

### 3.3 Class Structure

The codebase is organized into three packages:

#### 3.3.1 Domain Models

**`VehicleProfile`**
- `vehicle_id: str` — Unique identifier
- `make: str`, `model: str`, `year: int` — Vehicle metadata
- `vin: str` — Vehicle Identification Number (optional)
- `engine_type: str` — Gasoline / Diesel
- `obd_protocol: str` — CAN / ISO / SAE
- Methods: `register()`, `update()`, `delete()`

**`OBDSession`**
- `session_id: str` — UUID
- `vehicle_id: str` — FK to VehicleProfile
- `start_time: datetime`, `end_time: datetime`
- `data_records: List[SensorRecord]`
- Methods: `start()`, `stop()`, `get_duration()`

**`SensorRecord`**
- `timestamp: datetime`
- `session_id: str`
- `rpm: float`, `speed: float`, `throttle: float`, `load: float`
- `coolant_temp: float`, `intake_temp: float`, `ambient_temp: float`
- `maf: float`, `manifold_pressure: float`
- `accel_pedal_d: float`, `accel_pedal_e: float`

**`DTCRecord`**
- `code: str` — e.g. "P0300"
- `severity: str` — Critical / Warning / Advisory
- `description: str`
- `affected_system: str`
- `probable_cause: str`
- `recommended_action: str`
- `first_detected: datetime`

**`MaintenanceAlert`**
- `alert_id: str`
- `component: str`
- `urgency: str` — Critical / Warning / Advisory
- `predicted_rul_km: float`
- `predicted_rul_days: int`
- `recommended_action: str`
- `created_at: datetime`

#### 3.3.2 Service Layer

**`DataAcquisitionService`**
- `connect(port: str) → bool`
- `poll_pids(pid_list: List[str]) → SensorRecord`
- `scan_dtcs() → List[DTCRecord]`
- `clear_dtcs(confirm: bool) → bool`

**`MLInferenceService`**
- `detect_anomaly(record: SensorRecord) → AnomalyResult`
- `compute_health_score(record: SensorRecord, history: List) → HealthScore`
- `predict_rul(component: str, history: List) → RULPrediction`
- `predict_fuel_efficiency(record: SensorRecord) → FuelPrediction`
- `classify_driver_behaviour(session: OBDSession) → DriverProfile`

**`AlertService`**
- `evaluate_alerts(health: HealthScore, rul: Dict) → List[Alert]`
- `send_notification(alert: Alert, channels: List[str])`

**`DashboardService`**
- `get_live_data(vehicle_id: str) → Dict`
- `get_health_summary(vehicle_id: str) → Dict`
- `get_historical_data(vehicle_id: str, range: DateRange) → List`
- `generate_report(vehicle_id: str, type: str) → PDF`

#### 3.3.3 ML Components

**`IsolationForestDetector`**
- `model: sklearn.IsolationForest`
- `fit(X: DataFrame)`, `predict(X: DataFrame) → array`
- `contamination: float = 0.05`

**`AutoencoderDetector`**
- `model: tf.keras.Model`
- `threshold: float`
- `fit(X: DataFrame, epochs: int)`, `predict(X: DataFrame) → array`

**`HealthScoreCalculator`**
- `weights: Dict[str, float]` — subsystem weight configuration
- `compute(thermal: float, engine: float, electrical: float) → int`

**`RULPredictor`**
- `model: sklearn.RandomForestRegressor`
- `fit(X: DataFrame, y: Series)`, `predict(X: DataFrame) → array`

**`FuelEfficiencyModel`**
- `model: sklearn.RandomForestRegressor`
- `fit(X: DataFrame, y: Series)`, `predict(X: DataFrame) → float`

**`DriverBehaviourClassifier`**
- `model: sklearn.KMeans` (k=3)
- `fit(X: DataFrame)`, `predict(X: DataFrame) → str`
- `compute_score(cluster_label: int, features: Dict) → float`

---

## 4. Data Flow Architecture

### 4.1 End-to-End Data Flow

```
Phase 1: ACQUISITION
  Vehicle ECU → ELM327 Adapter → python-OBD Client
  ↓
  Raw PID responses parsed into engineering units
  ↓
  Structured JSON record created:
  {
    "timestamp": "2026-04-05T12:00:00.000Z",
    "session_id": "abc-123",
    "vehicle_id": "VH-001",
    "rpm": 2450.0,
    "speed": 65.0,
    "throttle": 32.5,
    "load": 45.0,
    "coolant_temp": 92.0,
    "intake_temp": 28.0,
    "maf": 12.3,
    "manifold_pressure": 95.0,
    "ambient_temp": 30.0,
    "accel_pedal_d": 35.0,
    "accel_pedal_e": 33.0
  }

Phase 2: INGESTION
  JSON record → MQTT Broker (topic: vehicle/{id}/telemetry)
  ↓
  Data Validator checks:
    - Required fields present
    - Values within physical ranges (RPM: 0–8000, Temp: -40–200°C, etc.)
    - Timestamp monotonically increasing
  ↓
  Valid records forwarded; invalid records logged to dead-letter queue

Phase 3: PROCESSING
  ┌─────────────────────────────────────────────────────────────┐
  │ Parallel Processing Pipeline                                │
  │                                                             │
  │  Input Buffer (last N records)                              │
  │    ├── Anomaly Detection (Isolation Forest + Autoencoder)   │
  │    ├── Health Score Computation (Weighted Model)             │
  │    ├── RUL Prediction (Random Forest Regression)            │
  │    ├── Fuel Efficiency Prediction (Regression)              │
  │    └── Driver Behaviour (K-Means, per session)              │
  │                                                             │
  │  All outputs → Alert Evaluation Engine                      │
  └─────────────────────────────────────────────────────────────┘

Phase 4: STORAGE
  Raw sensor records → TimescaleDB hypertable (time-series)
  ML outputs → PostgreSQL tables (relational)
  DTCs → PostgreSQL with severity classification
  Alerts → PostgreSQL with delivery status tracking
  User/Vehicle profiles → PostgreSQL

Phase 5: PRESENTATION
  REST API serves:
    - GET /api/vehicle/{id}/live → Current sensor snapshot
    - GET /api/vehicle/{id}/health → Health score + subsystem breakdown
    - GET /api/vehicle/{id}/alerts → Active alerts list
    - GET /api/vehicle/{id}/history → Time-range historical data
  
  WebSocket streams:
    - ws://server/ws/vehicle/{id} → Real-time sensor updates pushed to dashboard
  
  Dashboard renders:
    - Live Telemetry cards (RPM, Speed, Throttle, Load, Coolant, Battery)
    - Digital Cockpit (SVG gauges + canvas time-series charts)
    - AI Neural Core (Health Score ring, Driver Profile badge, Anomaly Monitor, Recommendations)
```

### 4.2 Data Transformation Pipeline

| Stage | Input | Transformation | Output |
|-------|-------|---------------|--------|
| Raw Acquisition | Hex-encoded ECU response | Formula decoding per SAE J1979 | Engineering-unit float values |
| Normalization | Raw sensor values | Min-max scaling or Z-score standardization | Normalized features [0, 1] |
| Feature Engineering | Normalized values + history buffer | Rolling mean, rolling std, rate of change (Δ/Δt), cross-parameter ratios | Augmented feature vector |
| ML Inference | Augmented feature vector | Model-specific prediction | Classification labels, regression values, anomaly scores |
| Alert Generation | ML outputs + configurable thresholds | Threshold comparison + severity classification | Alert objects |
| Visualization | Alert objects + ML outputs + raw data | JSON deserialization + React state update + Recharts re-render | Dashboard UI updates |

---

## 5. Component Responsibilities

### 5.1 Acquisition Client (`obd_client.py`)
- Connects to ELM327 via Bluetooth/Wi-Fi using `python-OBD`.
- Polls configured PID list at specified interval.
- Handles connection drops with exponential backoff retry.
- Publishes JSON records to MQTT topic `vehicle/{vehicle_id}/telemetry`.
- Handles Mode 03/07 DTC queries on request.
- Runs on the edge device (laptop, Raspberry Pi, or smartphone).

### 5.2 MQTT Broker (Mosquitto)
- Receives telemetry from acquisition clients.
- Routes to subscribed backend consumers.
- Supports TLS encryption for production.
- Topic structure: `vehicle/{id}/telemetry`, `vehicle/{id}/dtc`, `vehicle/{id}/command`.

### 5.3 Backend Server (FastAPI)
- Subscribes to MQTT topics for all registered vehicles.
- Routes incoming data through validation pipeline.
- Invokes ML inference engine on validated records.
- Persists data and results to PostgreSQL/TimescaleDB.
- Exposes REST API for dashboard data retrieval.
- Manages WebSocket connections for real-time push to dashboards.
- Handles user authentication (JWT) and authorization.

### 5.4 ML Inference Engine
- Loads pre-trained models from versioned model store.
- Maintains per-vehicle history buffers for windowed features.
- Runs inference on each incoming record (anomaly, health) and per-session (driver behaviour).
- Outputs structured results to alert engine and storage.

### 5.5 Alert Engine
- Evaluates ML outputs against configurable thresholds.
- Generates alerts with severity levels: Critical, Warning, Advisory.
- Dispatches to dashboard (WebSocket push), email, and browser notifications.
- Tracks alert delivery and acknowledgement status.

### 5.6 Web Dashboard
- **Live Telemetry Page**: Data cards for RPM, Speed, Throttle, Load, Coolant, Battery with real-time updates.
- **Digital Cockpit Page**: SVG gauge visualizations (RPM semi-circle, Speed full-circle, Temperature semi-circle) + canvas-based time-series charts (Engine Load, Fuel Economy).
- **AI Neural Core Page**: Health Score ring gauge, Driver Profile badge with confidence bar, Anomaly Monitor with status indicators, AI Recommendations panel.
- Responsive design: desktop sidebar navigation + mobile bottom navigation bar.
- Connection status indicator ("OBD-II LIVE" with pulsing dot).

---

## 6. Sequence Flows

### 6.1 Sequence: Real-Time Monitoring Session

```
User              Acquisition Client     MQTT Broker      Backend Server       Database          Dashboard
 │                      │                    │                 │                   │                 │
 ├── Start Session ────►│                    │                 │                   │                 │
 │                      ├── Connect ELM327 ──┤                 │                   │                 │
 │                      │                    │                 │                   │                 │
 │                      │◄── AT OK ──────────┤                 │                   │                 │
 │                      │                    │                 │                   │                 │
 │                      ├── Poll PIDs ───────┤                 │                   │                 │
 │                      │     (1 Hz loop)    │                 │                   │                 │
 │                      │                    │                 │                   │                 │
 │                      ├── Publish JSON ───►│                 │                   │                 │
 │                      │                    ├── Forward ─────►│                   │                 │
 │                      │                    │                 ├── Validate ───────┤                 │
 │                      │                    │                 ├── ML Inference ───┤                 │
 │                      │                    │                 ├── Store Record ──►│                 │
 │                      │                    │                 ├── Store Results ─►│                 │
 │                      │                    │                 │                   │                 │
 │                      │                    │                 ├── Push via WS ──────────────────────►│
 │                      │                    │                 │                   │                 │
 │                      │                    │                 │                   │       Update UI ◄┤
 │                      │                    │                 │                   │                 │
 │          (repeats every 1 second)         │                 │                   │                 │
```

### 6.2 Sequence: Fault Code Scan & Display

```
User           Dashboard         Backend          Acquisition Client    Vehicle ECU
 │                │                 │                     │                 │
 ├── Click Scan ─►│                 │                     │                 │
 │                ├── GET /dtc ────►│                     │                 │
 │                │                 ├── Mode 03 Query ───►│                 │
 │                │                 │                     ├── 03 Request ──►│
 │                │                 │                     │◄── DTC Bytes ───┤
 │                │                 │                     ├── Mode 07 ─────►│
 │                │                 │                     │◄── Pending ─────┤
 │                │                 │◄── DTCs (decoded) ──┤                 │
 │                │                 ├── Decode (SAE) ─────┤                 │
 │                │                 ├── Store in DB ──────┤                 │
 │                │◄── JSON DTCs ───┤                     │                 │
 │◄── Display ────┤                 │                     │                 │
```

### 6.3 Sequence: Predictive Maintenance Alert

```
Backend (scheduled)     ML Engine           Alert Engine        Database         Dashboard
       │                    │                    │                  │                │
       ├── Trigger RUL ────►│                    │                  │                │
       │                    ├── Load history ───►│                  │                │
       │                    │◄── History data ───┤                  │                │
       │                    ├── RF Predict ──────┤                  │                │
       │                    │    (per component) │                  │                │
       │                    │                    │                  │                │
       │◄── RUL Results ────┤                    │                  │                │
       │                    │                    │                  │                │
       ├── Evaluate ────────────────────────────►│                  │                │
       │                    │                    ├── RUL < Thresh? ─┤                │
       │                    │                    ├── Generate Alert  │                │
       │                    │                    ├── Store Alert ───►│                │
       │                    │                    ├── Push Alert ────────────────────►│
       │                    │                    │                  │       Show Alert│
```

---

## 7. Deployment Architecture

### 7.1 Development Environment

```
┌──────────────────────────────────────────────────────────┐
│                    Developer Machine                      │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Docker Compose Stack                    │ │
│  │                                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │ FastAPI   │  │Mosquitto │  │PostgreSQL +      │  │ │
│  │  │ Backend   │  │ MQTT     │  │TimescaleDB       │  │ │
│  │  │ :8000     │  │ :1883    │  │ :5432            │  │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────┐  ┌────────────────────────┐ │
│  │ OBD-II Emulator         │  │ Web Dashboard          │ │
│  │ (ELMSim / OBDSim)       │  │ (localhost:8000)       │ │
│  └─────────────────────────┘  └────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────┐                             │
│  │ Jupyter Notebook        │  ← ML experimentation       │
│  │ (localhost:8888)         │                             │
│  └─────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Docker Compose Services

| Service | Image | Ports | Volumes | Purpose |
|---------|-------|-------|---------|---------|
| `backend` | Custom (Dockerfile) | 8000:8000 | `./app:/app`, `./models:/models` | FastAPI server + ML inference |
| `mqtt` | `eclipse-mosquitto:2` | 1883:1883, 9001:9001 | `./mosquitto/config:/mosquitto/config` | MQTT message broker |
| `db` | `timescale/timescaledb:latest-pg14` | 5432:5432 | `pgdata:/var/lib/postgresql/data` | PostgreSQL + TimescaleDB |
| `obd-sim` | Custom (Dockerfile) | — | — | OBD-II emulator for testing |

### 7.3 Production Deployment (Future)

For a production deployment, the same Docker Compose stack would be deployed to a cloud VM (AWS EC2, GCP Compute, DigitalOcean Droplet) or orchestrated via Kubernetes for multi-vehicle fleet scenarios:

| Component | Cloud Service Option |
|-----------|---------------------|
| Backend | AWS EC2 / GCP Compute Engine / Container as a Service |
| MQTT Broker | AWS IoT Core / EMQX Cloud / Self-hosted Mosquitto |
| Database | AWS RDS (PostgreSQL) + TimescaleDB Cloud |
| Static Dashboard | CDN (CloudFront / Cloud CDN) or served by backend |
| SSL/TLS | Let's Encrypt / AWS Certificate Manager |
| Monitoring | CloudWatch / Prometheus + Grafana |

### 7.4 Network Architecture

```
Internet
    │
    ├── HTTPS :443 ──► [Reverse Proxy / Load Balancer]
    │                       │
    │                       ├── /api/* ────► Backend (FastAPI :8000)
    │                       ├── /ws/* ─────► Backend (WebSocket :8000)
    │                       └── /* ────────► Static Files (Dashboard HTML/CSS/JS)
    │
    ├── MQTTS :8883 ──► [MQTT Broker (Mosquitto)]
    │                       ▲
    │                       │ (from vehicles via cellular/Wi-Fi)
    │
    └── Internal :5432 ──► [PostgreSQL + TimescaleDB] (not exposed to internet)
```

---

## 8. Technology Decision Rationale

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Backend Framework | FastAPI | Flask, Django | Async support, automatic OpenAPI docs, high performance, type hints |
| ML Framework | Scikit-learn + TensorFlow | PyTorch only, H2O.ai | Scikit-learn ideal for traditional ML (RF, IF, KMeans); TF for autoencoder/LSTM |
| Database | PostgreSQL + TimescaleDB | InfluxDB, MongoDB, pure PostgreSQL | TimescaleDB gives time-series optimizations (hypertables, compression) on top of full SQL/relational capabilities |
| Messaging | MQTT (Mosquitto) | Kafka, RabbitMQ, Redis Pub/Sub | MQTT designed for IoT; lightweight, low-bandwidth, ideal for vehicle telemetry; simpler than Kafka for prototype scale |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 | Vue, Angular, SvelteKit | Component model scales well with complex dashboard state; TypeScript ensures data contract safety; Vite provides fast HMR in development; Tailwind v4 removes CSS maintenance burden; real-time rendering via React hooks aligns naturally with streaming telemetry data |
| OBD Library | python-OBD | pyOBD, OBDwiz | Active maintenance, clean API, handles PID decoding, supports async mode |
| Auth | JWT + bcrypt | OAuth2, session cookies | Stateless tokens suitable for API-first architecture; bcrypt for secure password storage |
| Containerization | Docker Compose | Kubernetes, bare metal | Appropriate for prototype scale; easy to graduate to K8s later |

---

*Cross-references: [01 Project Overview](01_project_overview_and_requirements.md) · [03 OBD & Data Acquisition](03_obd_and_data_acquisition.md) · [07 Backend & API](07_backend_and_api_reference.md) · [09 Database & Storage](09_database_and_storage.md)*
