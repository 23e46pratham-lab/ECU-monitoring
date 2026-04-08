# 01 — Project Overview & Requirements

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Version**: 1.0 (Phase I)  
> **Last Updated**: April 2026  
> **Authors**: Anish V S, S K Saichaand Shetty, Yojan D, Pratham U  
> **Guide**: Dr Saleena T S — Assistant Professor Grade II, Dept. of ICBS  
> **Institution**: St Joseph Engineering College (Autonomous), Mangaluru  
> **Affiliated to**: Visvesvaraya Technological University, Belagavi

---

## 1. Product Overview

### 1.1 What Is This System?

The Intelligent Vehicle Health Monitoring and Predictive Maintenance System is a full-stack platform that collects real-time vehicle sensor data from the standardised On-Board Diagnostics II (OBD-II) interface, processes this data through a modular machine learning pipeline, and delivers actionable insights — health scores, anomaly alerts, maintenance predictions, fuel efficiency estimates, and driver behaviour analysis — to a web-based dashboard accessible by any driver without specialist automotive knowledge.

### 1.2 Why Build It?

Modern vehicles generate rich diagnostic streams through ECUs and dozens of sensors. Despite this, most consumer vehicles still rely on:

- **Reactive maintenance** — fixing parts only after they fail.
- **Schedule-based maintenance** — servicing at fixed mileage/time intervals regardless of actual condition.
- **Opaque diagnostic tools** — professional OBD-II scanners that display raw DTCs and sensor values without interpretation.

The system bridges the gap between abundant vehicle data and intelligent, actionable interpretation by providing a **unified, multi-task ML-based platform** that no existing consumer-grade solution offers.

### 1.3 Key Differentiators

| Aspect | Existing Tools | This System |
|--------|---------------|-------------|
| Scope | Single-task (fuel OR behaviour OR faults) | Multi-task unified platform |
| Interpretation | Raw sensor values / DTC codes | ML-derived insights (health score, predictions) |
| User Accessibility | Requires automotive knowledge | Intuitive dashboard for any driver |
| Health Quantification | None | Vehicle Health Score (0–100) |
| Maintenance Strategy | Reactive / scheduled | Predictive (Remaining Useful Life estimation) |
| Hardware Requirement | Proprietary scanners | Standard ELM327 OBD-II adapter (~₹500–₹2,000) |

---

## 2. Problem Statement

Although modern vehicles generate large volumes of diagnostic and sensor data through onboard ECUs, this data is **underutilized in consumer vehicles**. Existing OBD-II tools mainly display raw sensor values or Diagnostic Trouble Codes (DTCs) without providing intelligent interpretation, trend analysis, or predictive insights.

**Core Problem**: There is a critical gap between the raw diagnostic data available from the OBD-II port and the intelligent, integrated interpretation needed for proactive vehicle health management. No existing consumer-grade system combines anomaly detection, health scoring, predictive maintenance, fuel efficiency prediction, and driver behaviour analysis over a single standardised OBD-II data stream.

**Impact**:
- Nearly 50% of vehicle breakdowns are preceded by detectable warning signs that go unnoticed.
- Reactive maintenance costs 2–5× more than condition-based maintenance.
- Drivers lack a simple, unified "health dashboard" analogous to a credit score for their vehicle.
- Fleet operators cannot centrally monitor vehicle condition without expensive proprietary systems.

---

## 3. Goals and Objectives

### 3.1 Primary Goals

| # | Goal | Success Indicator |
|---|------|-------------------|
| G1 | Enable proactive, condition-based vehicle maintenance | System generates RUL predictions for ≥3 component categories |
| G2 | Provide an intuitive vehicle health summary | VHS (0–100) displayed on dashboard, understandable without training |
| G3 | Detect anomalies before they trigger warning lights | Isolation Forest + Autoencoder detect deviations from baseline behaviour |
| G4 | Analyse and classify driver behaviour | K-Means clustering classifies sessions into ≥3 behaviour categories |
| G5 | Estimate real-time fuel efficiency | Regression model predicts instantaneous and session-level fuel consumption |

### 3.2 Technical Objectives

1. **Data Acquisition**: Continuously acquire real-time OBD-II data via ELM327 adapter at ≥1 Hz polling rate.
2. **ML Pipeline**: Implement a modular Python-based pipeline with five distinct ML tasks: anomaly detection, health scoring, predictive maintenance, fuel prediction, and driver behaviour classification.
3. **Dashboard**: Build a responsive web dashboard (React 19 + TypeScript + Vite + Tailwind CSS v4) displaying real-time telemetry, gauges, health scores, alerts, and ML insights. The current demo implementation uses Recharts for time-series charts and `motion/react` for animations.
4. **Storage**: Persist all OBD-II data in a time-series database (PostgreSQL + TimescaleDB) for long-term trend analysis and model retraining.
5. **Streaming**: Implement MQTT-based real-time data streaming between the acquisition client and backend.
6. **Offline Dataset Support**: Support offline analysis using the KIT Automotive OBD-II Dataset (81 CSV files, Seat Leon, 2017–2018).

---

## 4. Scope and Constraints

### 4.1 In-Scope

| Area | Details |
|------|---------|
| Data Acquisition | OBD-II Mode 01 (live data), Mode 03/07 (DTCs) via ELM327 adapter |
| Vehicle Types | Consumer passenger vehicles with standard OBD-II DLC (post-January 1996) |
| ML Tasks | Anomaly detection, health scoring, predictive maintenance, fuel efficiency, driver behaviour |
| Dashboard | Web-based responsive dashboard (desktop + mobile browser) |
| Dataset | KIT Automotive OBD-II Dataset (Marc Weber, 2018) for training and validation |
| Deployment | Prototype-level — single server, Docker-compose deployment |
| Development Environment | OBD-II emulator used for testing (no physical vehicle required during development) |

### 4.2 Out-of-Scope

| Area | Reason |
|------|--------|
| Manufacturer-specific extended PIDs | Not guaranteed across vehicle makes |
| ECU write operations | Safety, warranty, and liability concerns — **read-only access only** |
| Pre-1996 vehicles (OBD-I) | Non-standard connectors and protocols |
| Large-scale commercial deployment | Prototype scope |
| Native mobile application | Web-based approach via browser; no native iOS/Android app |
| GPS / IMU sensor fusion | Planned for future work |

### 4.3 Design Constraints

1. **OBD-II Protocol Limitations**: Restricted to SAE J1979 Mode 01 standard PIDs. CAN bus max polling rate ~10 Hz for full PID sets.
2. **ECU Compatibility**: Not all PIDs are supported by all vehicles. System must gracefully handle PID unavailability.
3. **Read-Only Access**: System shall **never** issue Mode 04 (Clear DTC) without explicit user confirmation. No ECU parameter modification, firmware flashing, or control configuration changes.
4. **Internet Dependency**: Advanced ML inference, cloud-based reports, and email notifications require connectivity. Core data acquisition and local buffering work offline.
5. **Power Supply**: OBD-II port provides ~12V DC / 500 mA. Continuous engine-off operation depends on vehicle battery.
6. **Network Bandwidth**: Outbound data limited to 2 Mbps for cellular compatibility. MQTT payload compression recommended.
7. **Data Privacy**: Compliant with India's Digital Personal Data Protection Act (DPDP Act 2023). Minimum necessary data collection, explicit user consent for cloud transmission, secure deletion on request.

---

## 5. Personas and User Stories

### 5.1 Personas

#### Persona 1: Individual Vehicle Owner — "Ravi"
- **Demographics**: 35-year-old IT professional, Mangaluru. Owns a 2018 Hyundai i20.
- **Pain Points**: Has experienced unexpected breakdowns. Finds OBD scanner apps confusing (raw PIDs, DTCs with no explanation). Wants to know "is my car healthy?" without being an engineer.
- **Goals**: Get a simple health score, receive maintenance predictions, understand if driving habits are affecting the car.

#### Persona 2: Fleet Operator — "Priya"
- **Demographics**: 42-year-old logistics manager. Manages 25 delivery vehicles.
- **Pain Points**: Reactive maintenance causes unplanned downtime. No centralized dashboard for fleet health. Drivers don't report minor issues.
- **Goals**: Centralized monitoring, predictive alerts before breakdowns, driver behaviour tracking for training.

#### Persona 3: Used Car Dealer — "Suresh"
- **Demographics**: 50-year-old used car dealer, Bangalore.
- **Pain Points**: Buyers demand transparency. No standardized way to assess vehicle condition objectively.
- **Goals**: Generate a vehicle health report with objective scores for prospective buyers.

#### Persona 4: Automotive Enthusiast / Hobbyist — "Akash"
- **Demographics**: 22-year-old engineering student. Owns modified car. Wants to track performance metrics.
- **Pain Points**: Basic OBD apps don't offer ML insights or historical trend analysis.
- **Goals**: Deep telemetry, real-time charts, anomaly detection, performance optimization.

### 5.2 User Stories

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|-----------|----------|
| US-01 | Vehicle Owner | See a single health score for my car | I know at a glance if my car needs attention | P0 |
| US-02 | Vehicle Owner | Receive maintenance predictions with estimated km remaining | I can plan service visits proactively | P0 |
| US-03 | Vehicle Owner | View real-time engine parameters on my phone | I can monitor my car during a drive | P0 |
| US-04 | Vehicle Owner | Get anomaly alerts before dashboard warning lights | I can catch problems early | P0 |
| US-05 | Vehicle Owner | See my driver behaviour score and tips | I can improve driving habits and save fuel | P1 |
| US-06 | Vehicle Owner | View fuel efficiency metrics and trends | I can identify conditions causing high consumption | P1 |
| US-07 | Fleet Operator | View all vehicles on a single dashboard | I can monitor fleet health centrally | P1 |
| US-08 | Fleet Operator | Compare driver behaviour across drivers | I can identify and train risky drivers | P2 |
| US-09 | Used Car Dealer | Generate a PDF health report for a vehicle | I can provide objective condition assessments to buyers | P2 |
| US-10 | Any User | Connect an ELM327 adapter and see data within 10 minutes | I don't need specialist knowledge to set up | P0 |

---

## 6. Use Cases

### UC-01: Real-Time Vehicle Monitoring Session

| Field | Description |
|-------|-------------|
| **Actor** | Driver / Vehicle Owner |
| **Precondition** | ELM327 adapter plugged into OBD-II port; vehicle ignition ON; system connected |
| **Main Flow** | 1. System polls OBD-II PIDs at configurable interval (default 1 Hz) → 2. Raw ECU responses parsed into engineering units → 3. Structured, timestamped records forwarded to processing pipeline → 4. Dashboard displays live RPM, Speed, Throttle, Load, Coolant Temp, Battery → 5. Charts update in real-time with sparkline trends |
| **Postcondition** | All data persisted in time-series database with session ID |
| **Alt Flow A** | Unsupported PID → System skips PID, logs warning, continues with remaining PIDs |
| **Alt Flow B** | Connection lost → System buffers locally, reconnects automatically |

### UC-02: Fault Code Scan & Display

| Field | Description |
|-------|-------------|
| **Actor** | Driver |
| **Precondition** | Active OBD-II connection |
| **Main Flow** | 1. User triggers DTC scan (or system performs periodic scan) → 2. System sends Mode 03 (stored) and Mode 07 (pending) requests → 3. Retrieved DTCs decoded to SAE-compliant identifiers → 4. Displayed with: DTC code, severity, plain-language description, affected system, probable cause, recommended action, timestamp |
| **Postcondition** | DTCs stored in database |
| **Special** | "Clear DTCs" function requires explicit user confirmation + warning that clearing does not fix the issue |

### UC-03: ML Health Score Computation

| Field | Description |
|-------|-------------|
| **Actor** | System (automated) |
| **Trigger** | Every 5–10 seconds during active session |
| **Main Flow** | 1. Collect current parameter snapshot + recent history buffer → 2. Run Isolation Forest anomaly detection → 3. Compute weighted subsystem scores (thermal, engine, electrical) → 4. Derive composite Vehicle Health Score (0–100) → 5. Update dashboard gauge with colour-coded ranges (Excellent/Good/Fair/Critical) |
| **Output** | VHS value, risk level, RUL estimate, health summary text |

### UC-04: Predictive Maintenance Alert

| Field | Description |
|-------|-------------|
| **Actor** | System → Driver (notification) |
| **Trigger** | Predicted RUL for any component drops below configurable threshold |
| **Main Flow** | 1. Random Forest regression models evaluate degradation trends → 2. RUL estimated for key components (oil, coolant system, brakes, battery, air filter) → 3. When RUL < threshold, system generates maintenance alert → 4. Alert displayed on dashboard with urgency level, component name, predicted km/days remaining, recommended action |

### UC-05: Driver Behaviour Analysis

| Field | Description |
|-------|-------------|
| **Actor** | System → Driver |
| **Main Flow** | 1. Extract derived features from OBD-II stream (throttle aggression, RPM volatility, speed stability, braking frequency) → 2. K-Means clustering (k=3) classifies session as ECO-OPTIMAL, NORMAL, or AGGRESSIVE → 3. Compute driver behaviour score (0–10) → 4. Display classification badge, confidence bar, fuel efficiency impact, and improvement tips |

### UC-06: Fuel Efficiency Prediction

| Field | Description |
|-------|-------------|
| **Actor** | System → Driver |
| **Main Flow** | 1. Regression model uses MAF (g/s), VSS (km/h), RPM, throttle position → 2. Predicts instantaneous fuel consumption (MPG or L/100km) → 3. Aggregates to trip-level and session-level averages → 4. Displays live fuel gauge + historical trend chart → 5. Alerts if consumption deviates >20% from baseline |
| **Formula (simplified)** | `MPG = 710.7 × VSS(mph) / MAF(g/s)` for gasoline vehicles |

---

## 7. Success Metrics & KPIs

| Category | Metric | Target | Measurement Method |
|----------|--------|--------|-------------------|
| **Accuracy** | Anomaly detection precision | ≥85% | Validated against labelled dataset anomalies |
| **Accuracy** | Health Score correlation with actual vehicle state | ≥80% | Expert review of scored vehicles |
| **Accuracy** | Driver behaviour classification accuracy | ≥90% | Confusion matrix on test set |
| **Accuracy** | Fuel efficiency prediction R² | ≥0.90 | Test set evaluation |
| **Performance** | Data acquisition latency (full PID set) | ≤500 ms @ 1 Hz | Timing instrumentation |
| **Performance** | Dashboard refresh latency | ≤2 seconds | Network timing |
| **Performance** | ML inference time (anomaly detection) | ≤200 ms / record | Profiling |
| **Performance** | ML inference time (autoencoder) | ≤500 ms / record | Profiling |
| **Performance** | ML inference time (health score) | ≤100 ms / evaluation | Profiling |
| **Performance** | API response time (p95) | ≤1 second @ 100 concurrent | Load testing |
| **Reliability** | System uptime | ≥99.0% monthly | Monitoring |
| **Usability** | Time to first data on dashboard | ≤10 minutes from unboxing | User testing |
| **Storage** | Monthly storage per vehicle @ 1 Hz | ≤500 MB | Database metrics |
| **Throughput** | Ingestion rate | ≥10 records/sec/vehicle | Pipeline benchmarks |
| **Scale** | Concurrent connected vehicles | Up to 100 | Load testing |

---

## 8. Functional Requirements

### FR-01: Real-Time OBD-II Data Acquisition
- Continuously acquire vehicle data through ELM327-compatible OBD-II interface.
- Query supported PIDs: Engine RPM, Vehicle Speed, Coolant Temp, Throttle Position, Engine Load, Fuel Trim, Oxygen Sensors, Runtime, Intake Air Temp, MAF, Ambient Temp, Accelerator Pedal Positions.
- Configurable polling intervals (default: 1 Hz, max: 10 Hz).
- Parse raw ECU responses into engineering units.
- Gracefully handle unsupported PIDs without functional failure.
- Generate structured, timestamped records forwarded to processing pipeline.

### FR-02: Diagnostic Trouble Code (DTC) Retrieval
- Retrieve active (Mode 03) and pending (Mode 07) DTCs.
- Decode to SAE-compliant fault identifiers with human-readable descriptions.
- Classify by severity and affected system category.
- Store in database with detection timestamp.
- Provide "Clear DTCs" function with explicit user confirmation.

### FR-03: Historical Data Logging
- Persistently store all OBD-II parameters and DTC records.
- Each record includes: vehicle identifier, session ID, ISO 8601 timestamp.
- Support long-term trend analysis and model retraining.

### FR-04: Vehicle Health Score Computation
- Compute composite VHS (0–100) from weighted factors: parameter deviations, DTC severity, anomaly outputs, subsystem health indicators.
- Periodically update and display on dashboard with colour-coded gauge.
- Sub-scores: Thermal Health, Engine Health, Electrical Health.

### FR-05: Predictive Maintenance Forecasting
- Estimate RUL for key components: oil, coolant system, brakes, battery, air filter.
- Use historical trends + Random Forest regression.
- Generate alerts when RUL < configurable threshold.

### FR-06: Fuel Efficiency Prediction
- Predict instantaneous and session-level fuel consumption via regression model.
- Real-time fuel efficiency metrics on dashboard.
- Alert when consumption deviates >20% from baseline.

### FR-07: Driver Behaviour Analysis
- Classify driving events: harsh braking, sudden acceleration, over-revving, excessive idling.
- Compute Driver Behaviour Score (0–10) per session.
- Compare against historical performance.

### FR-08: Vehicle Profile Management
- Register and manage one or more vehicle profiles.
- Associate OBD-II sessions with correct vehicle record.

### FR-09: Real-Time Alerts & Notifications
- Generate real-time alerts on dashboard for critical health events.
- Optional email / browser push notifications.

---

## 9. Non-Functional Requirements

### NFR-01: Reliability
- Minimum 99.0% uptime during active monitoring sessions.
- Stable OBD-II communication with automatic reconnection.
- Prevent data loss during temporary disconnections.

### NFR-02: Availability
- Dashboard and backend accessible 24/7.
- Planned maintenance ≤4 hours/month.

### NFR-03: Scalability
- Support multiple vehicles and concurrent users.
- Consistent processing speed and dashboard responsiveness under load.

### NFR-04: Security
- Passwords stored as bcrypt hashes (work factor ≥12). Plain-text passwords never stored or logged.
- All client–server communication encrypted (HTTPS/TLS).
- JWT-based session management.

### NFR-05: Maintainability
- Modular, well-documented architecture.
- ML models deployable as version-controlled artefacts; independent updates without full restart.

### NFR-06: Portability
- Responsive dashboard: desktop (≥1024px) and mobile (≥360px).
- Deployable on standard cloud or local server without major configuration changes.
- Docker containerization for environment consistency.

### NFR-07: Usability
- First-time user with no automotive knowledge can connect, configure, and access dashboard within 10 minutes using on-screen instructions.

### NFR-08: Data Integrity
- Unique record identifiers: `{vehicle_id}_{session_id}_{timestamp}`.
- Validation and consistency checks for tamper-resistant storage.

---

## 10. Regulatory and Compliance

### 10.1 Data Privacy
- **India DPDP Act 2023**: Collect minimum necessary data, obtain explicit consent before cloud transmission, provide secure data deletion on request.
- **Vehicle Telemetry**: GPS data (if added in future) is PII — requires additional consent and encryption.

### 10.2 OBD-II Standards Compliance
- **SAE J1979** (OBD-II diagnostic standard): System uses only standard diagnostic modes.
- **SAE J1962** (DLC connector standard): Compatible with standard 16-pin connector.
- **ISO 15765-4** (CAN protocol): Primary communication protocol.
- **Read-only access**: System never modifies ECU state. This is both a safety requirement and a regulatory consideration for vehicle warranties.

### 10.3 Emissions & Safety
- System does not modify emission control parameters.
- Clear DTC function warns user that clearing codes does not resolve underlying issues and may mask emission failures.

---

## 11. Software Requirements

| Component | Technology | Version |
|-----------|-----------|---------|
| Programming Language | Python | ≥3.10 |
| OBD-II Communication | python-OBD | ≥0.7.1 |
| ML Framework | Scikit-learn | ≥1.3 |
| Deep Learning | TensorFlow 2.x or PyTorch 2.x | Latest stable |
| Data Processing | NumPy, Pandas | Latest stable |
| Backend API | Flask or FastAPI | Latest stable |
| Relational DB | PostgreSQL | ≥14 |
| Time-Series Extension | TimescaleDB | ≥2.x |
| Message Queue | MQTT (Mosquitto) | ≥2.0 |
| Frontend Framework | React 19 + TypeScript | ^19.0.0 / ~5.8 |
| Build Tool | Vite 6 | ^6.2.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) | ^4.1.14 |
| Animation | Motion (`motion/react` — Framer Motion) | ^12.x |
| Charting | Recharts + D3.js | ^3.x / ^7.x |
| UI Icons | Lucide React | ^0.546.0 |
| Authentication | JWT + bcrypt | — |
| Version Control | Git + GitHub | — |
| IDE | VS Code + Jupyter Notebook | — |
| Containerization | Docker + Docker Compose | Latest stable |

## 12. Hardware Requirements

| Component | Specification |
|-----------|--------------|
| OBD-II Adapter | ELM327-compatible, Bluetooth ≥2.0 or Wi-Fi |
| Protocol Support | ISO 15765-4 (CAN), SAE J1979 PIDs |
| Vehicle Compatibility | Any passenger vehicle manufactured ≥ January 1996 with 16-pin OBD-II DLC (SAE J1962) |
| Minimum OBD-II Modes | Mode 01 (live data) + Mode 03 (stored DTCs) |
| Development Emulator | ELM327 emulator software (OBDSim or equivalent) — used in place of physical vehicle during development |

## 13. Performance Requirements Summary

| Metric | Target |
|--------|--------|
| Data acquisition latency (1 Hz) | ≤500 ms per cycle |
| Data acquisition latency (10 Hz) | ≤150 ms per cycle |
| Dashboard refresh | ≤2 seconds |
| Chart refresh interval | ≤1 second |
| Anomaly detection inference | ≤200 ms / record |
| Autoencoder inference | ≤500 ms / record |
| Health score computation | ≤100 ms / evaluation |
| Predictive maintenance per component | ≤1 second |
| Fuel efficiency prediction | ≤100 ms / record |
| Driver behaviour classification | ≤200 ms / event |
| API response time (p95 @ 100 users) | ≤1 second |
| Max API response time | ≤5 seconds |
| Ingestion throughput | ≥10 records/sec/vehicle |
| Concurrent vehicles | Up to 100 |
| Monthly storage per vehicle (1 Hz) | ≤500 MB |
| System uptime | ≥99.0% |
| PDF report generation | ≤10 seconds (30-day report) |

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [04 ML Pipeline](04_ml_pipeline_overview.md) · [06 Dataset](06_dataset_and_data_documentation.md)*
