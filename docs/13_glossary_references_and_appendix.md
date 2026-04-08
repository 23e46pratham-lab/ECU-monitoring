# 13 — Glossary, References & Appendix

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Technical Glossary, Academic References, Literature Survey Summary, Appendix Materials

---

## 1. Technical Glossary

### 1.1 Automotive & OBD-II Terms

| Term | Full Form | Definition |
|------|-----------|-----------|
| **OBD-II** | On-Board Diagnostics II | Standardised vehicle self-diagnostic and reporting system (SAE J1979), mandatory in US vehicles since 1996 |
| **ECU** | Electronic Control Unit | Embedded computer that controls one or more electrical systems in a vehicle (e.g., Engine ECU, Transmission ECU) |
| **DLC** | Diagnostic Link Connector | Standardised 16-pin connector (SAE J1962) located near the steering column for OBD-II access |
| **PID** | Parameter Identifier | A code used to request specific data from the vehicle's ECU (e.g., PID 0x0C = Engine RPM) |
| **DTC** | Diagnostic Trouble Code | A code set by the ECU when a fault condition is detected (e.g., P0300 = Random Misfire) |
| **CAN** | Controller Area Network | A multi-master serial bus standard (ISO 15765-4) for communication between ECUs; dominant OBD-II protocol |
| **ELM327** | — | A popular OBD-II to RS232 interpreter IC (and its many clones) that translates CAN/J1850/ISO commands to simple AT commands |
| **MIL** | Malfunction Indicator Lamp | The "check engine" light on the dashboard; activated when a DTC is set |
| **MAF** | Mass Air Flow (sensor) | Sensor measuring the mass flow rate of air entering the engine (g/s); critical for fuel calculation |
| **MAP** | Manifold Absolute Pressure | Sensor measuring intake manifold air pressure (kPa); indicates engine load |
| **TPS** | Throttle Position Sensor | Sensor measuring throttle valve opening (0–100%) |
| **VSS** | Vehicle Speed Sensor | Sensor measuring vehicle forward velocity (km/h) |
| **IAT** | Intake Air Temperature | Sensor measuring the temperature of air entering the engine (°C) |
| **RPM** | Revolutions Per Minute | Engine crankshaft rotational speed |
| **RUL** | Remaining Useful Life | Predicted time/distance before a component requires maintenance or replacement |
| **VHS** | Vehicle Health Score | Composite metric (0–100) representing overall vehicle condition |
| **STFT** | Short-Term Fuel Trim | Real-time adjustment to fuel injection (%) based on O2 sensor feedback |
| **LTFT** | Long-Term Fuel Trim | Learned adjustment to fuel injection (%) based on sustained STFT patterns |
| **TDC** | Top Dead Centre | The position of the piston at the highest point in the cylinder; reference for timing |
| **MPG** | Miles Per Gallon | Fuel efficiency unit (US/UK); higher = more efficient |
| **L/100km** | Litres per 100 Kilometres | Fuel consumption unit (metric); lower = more efficient |
| **BS-IV/BS-VI** | Bharat Stage IV/VI | Indian emission standards (equivalent to Euro IV/VI); BS-IV mandates OBD-II capability |

### 1.2 Machine Learning Terms

| Term | Definition |
|------|-----------|
| **Isolation Forest** | Ensemble-based unsupervised anomaly detection algorithm that isolates anomalies by random feature partitioning; anomalies require fewer splits |
| **Autoencoder** | Neural network trained to reconstruct its input; high reconstruction error indicates anomaly (the input doesn't match learned "normal" patterns) |
| **Random Forest** | Ensemble of decision trees trained with bagging; used for both classification and regression; robust to overfitting |
| **K-Means** | Unsupervised clustering algorithm that partitions data into k clusters by minimizing within-cluster variance |
| **LSTM** | Long Short-Term Memory; a type of recurrent neural network (RNN) designed for sequence data; handles long-term dependencies |
| **Feature Engineering** | The process of creating new input features from raw data (e.g., rolling statistics, rates of change, cross-parameter ratios) |
| **Z-Score Normalization (StandardScaler)** | Transforms features to have zero mean and unit variance: `z = (x - μ) / σ` |
| **Min-Max Scaling** | Transforms features to a fixed range [0, 1]: `x' = (x - min) / (max - min)` |
| **Contamination** | The expected proportion of anomalies in the dataset; hyperparameter of Isolation Forest |
| **Silhouette Score** | Metric measuring how similar a data point is to its own cluster vs. other clusters; ranges from -1 to 1 |
| **R² (R-Squared)** | Coefficient of determination; proportion of variance in the target explained by the model; 1.0 = perfect |
| **RMSE** | Root Mean Squared Error; square root of the average squared difference between predicted and actual values |
| **MAE** | Mean Absolute Error; average of absolute differences between predicted and actual values |
| **Confusion Matrix** | Table showing true positives, true negatives, false positives, and false negatives for a classification model |
| **Overfitting** | Model performs well on training data but poorly on unseen data (memorizes rather than generalizes) |
| **Data Drift** | Change in the statistical properties of input data over time, which can degrade model performance |
| **Batch Normalization** | Technique to normalize layer inputs during training, improving training speed and stability |
| **Dropout** | Regularization technique that randomly deactivates neurons during training to prevent overfitting |
| **Cross-Validation** | Technique to evaluate model generalization by splitting data into multiple train/test folds |

### 1.3 Software & Infrastructure Terms

| Term | Definition |
|------|-----------|
| **FastAPI** | Modern, high-performance Python web framework for building APIs with automatic Swagger docs and type validation |
| **Flask** | Lightweight Python web framework; micro-framework for web applications and APIs |
| **MQTT** | Message Queuing Telemetry Transport; lightweight publish-subscribe messaging protocol designed for IoT |
| **Mosquitto** | Open-source MQTT broker maintained by Eclipse Foundation |
| **PostgreSQL** | Open-source relational database management system with advanced SQL support |
| **TimescaleDB** | PostgreSQL extension optimized for time-series data with hypertables, compression, and continuous aggregates |
| **Hypertable** | TimescaleDB concept: a table automatically partitioned into time-based chunks for efficient time-series queries |
| **JWT** | JSON Web Token; compact, URL-safe token format for stateless authentication |
| **bcrypt** | Password hashing algorithm with configurable work factor; resistant to brute-force attacks |
| **WebSocket** | Full-duplex communication protocol over a single TCP connection; enables real-time server-to-client push |
| **REST** | Representational State Transfer; architectural style for HTTP APIs using standard methods (GET, POST, PUT, DELETE) |
| **Docker** | Container runtime for packaging applications with their dependencies |
| **Docker Compose** | Tool for defining and running multi-container Docker setups using a YAML file |
| **Pydantic** | Python library for data validation and settings management using type annotations |
| **SQLAlchemy** | Python SQL toolkit and ORM (Object-Relational Mapping) for database interactions |
| **React** | Declarative, component-based JavaScript UI library; the frontend framework for the dashboard (v19) |
| **TypeScript** | Statically typed superset of JavaScript; all dashboard data models and component props are typed |
| **Vite** | Next-generation build tool and dev server with native ESM and fast Hot Module Replacement (HMR) |
| **Tailwind CSS** | Utility-first CSS framework; v4 uses a `@theme {}` block for design token registration |
| **Recharts** | React-native charting library built on D3 and SVG; used for time-series sparklines and trend charts |
| **Motion (Framer Motion)** | React animation library (`motion/react`); drives tab transitions, gauge fills, and HUD animations |
| **Lucide React** | React icon library with tree-shakable SVG icons (replaces icon font approaches) |
| **Chart.js** | JavaScript charting library for canvas-based charts; referenced in earlier design iterations |
| **CORS** | Cross-Origin Resource Sharing; browser security mechanism allowing/restricting cross-domain API requests |
| **PITR** | Point-In-Time Recovery; database recovery to a specific historical moment using WAL archives |
| **QoS** | Quality of Service; MQTT message delivery guarantee level (0 = at most once, 1 = at least once, 2 = exactly once) |

### 1.4 Acronyms Quick Reference

| Acronym | Expansion |
|---------|-----------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| DOM | Document Object Model |
| DPDP | Digital Personal Data Protection (India) |
| GUI | Graphical User Interface |
| HTML | HyperText Markup Language |
| HTTP | HyperText Transfer Protocol |
| IDE | Integrated Development Environment |
| JSON | JavaScript Object Notation |
| ML | Machine Learning |
| ORM | Object-Relational Mapping |
| PDF | Portable Document Format |
| PII | Personally Identifiable Information |
| SAE | Society of Automotive Engineers |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| SRS | Software Requirements Specification |
| SVG | Scalable Vector Graphics |
| TCP | Transmission Control Protocol |
| TLS | Transport Layer Security |
| UI | User Interface |
| UX | User Experience |
| UUID | Universally Unique Identifier |
| VIN | Vehicle Identification Number |
| VTU | Visvesvaraya Technological University |
| WAL | Write-Ahead Logging |
| XML | eXtensible Markup Language |

---

## 2. References

### 2.1 Academic References (from Literature Survey)

| # | Authors | Title | Year | Source | Key Contribution |
|---|---------|-------|------|--------|-----------------|
| 1 | A. Kumar & R. Jain | Machine Learning-Based Driver Behavior Detection Using OBD-II Data and GPS | 2023 | Smart City and Informatization (SCI23) | 100% accuracy with Random Forest for driving behaviour classification |
| 2 | M. Canal, J. Topham, C. Mayeux & J. Gomes | Predicting Fuel Consumption from Naturalistic Data Using Tree-Based Machine Learning Algorithms | 2024 | SAE World Congress | XGBoost achieved R² ≈ 0.99 for fuel consumption prediction |
| 3 | T. Abukhalil, R. Almahaireh, M. Alomari & M. Al-Karaki | Real-time Fuel Consumption Estimation Using OBD-II for Driving Behavior Analysis | 2020 | IECON 2020 | SVM-based fuel estimation with RMSE = 2.4364 |
| 4 | I. Singh & S. Sharma | A Framework for Driver Behavior Monitoring Using Random Forest and OBD-II Data | 2025 | Communication Technologies | G-force metrics for driver aggression detection |
| 5 | S. Joshuva, V. Vennila & J. K. Das | A Machine Learning-based Approach for Vehicle Health Monitoring System | 2022 | International Conference | Random Forest + Gradient Boosting for vehicle health classification |
| 6 | H. Ding, S. H. Kim & J. Lee | Vehicle Health Monitoring Using Machine Learning | 2020 | IEEE ICTC | Multi-class health classification on CAN bus data |
| 7 | W. Yan & Z. Zhou | The Role of Machine Learning in Predictive Maintenance for Vehicles | 2020 | Industry Research | LSTM-based time-series approach for predictive maintenance |
| 8 | Y. Andiojaya & H. Demirci | A Bagging Algorithm for the Imputation of Missing Values in Time Series | 2019 | Expert Systems with Applications | Random Forest Bagging for OBD-II missing data imputation |
| 9 | L. Klusáček & J. Hnidka | Identification of Driving Style Using Machine Learning | 2024 | Transactions on Transport Sciences | Distinction between aggressive and normal driving patterns |
| 10 | S. Zhang, R. Pattipati & B. Bai | Anomaly Detection and Diagnosis for Vehicles | 2011 | IEEE Transactions on Intelligent Transport Systems | Isolation Forest for vehicular anomaly detection |
| 11 | K. A. Reddy & B. R. Kumar | Fuel Economy Prediction Using Machine Learning | 2020 | ICSTCEE 2020 | Comparative ML analysis for fuel economy |
| 12 | R. More & A. Agrawal | Predictive Maintenance Based on OBD-II Data | 2019 | IEEE Pune Section Conference | Predictive maintenance architecture using OBD-II |

### 2.2 Standards & Specifications

| Standard | Title | Publisher | Relevance |
|----------|-------|-----------|-----------|
| SAE J1979 | E/E Diagnostic Test Modes | SAE International | OBD-II diagnostic modes and PIDs |
| SAE J1962 | Diagnostic Connector | SAE International | DLC physical connector specification |
| SAE J2012 | Diagnostic Trouble Code Definitions | SAE International | DTC code structure and standard codes |
| ISO 15765-4 | Diagnostics on CAN | ISO | CAN protocol for OBD-II diagnostics |
| ISO 9141-2 | CARB Requirements for OBD | ISO | K-Line OBD-II communication protocol |
| ISO 14230-4 | Keyword Protocol 2000 (KWP2000) | ISO | KWP2000 OBD-II communication protocol |

### 2.3 Dataset Reference

| Property | Value |
|----------|-------|
| Title | Automotive OBD-II Dataset |
| Creator | Marc Weber |
| DOI | [10.5445/IR/1000085073](https://doi.org/10.5445/IR/1000085073) |
| Institution | Karlsruhe Institute of Technology (KIT) |
| License | Apache License 2.0 |

### 2.4 Technology Documentation

| Technology | Documentation URL |
|-----------|-------------------|
| python-OBD | https://python-obd.readthedocs.io/ |
| FastAPI | https://fastapi.tiangolo.com/ |
| Scikit-learn | https://scikit-learn.org/stable/documentation.html |
| TensorFlow | https://www.tensorflow.org/api_docs |
| TimescaleDB | https://docs.timescale.com/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| Eclipse Mosquitto | https://mosquitto.org/documentation/ |
| MQTT v3.1.1 | https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html |
| React | https://react.dev/ |
| TypeScript | https://www.typescriptlang.org/docs/ |
| Vite | https://vitejs.dev/guide/ |
| Tailwind CSS v4 | https://tailwindcss.com/docs |
| Recharts | https://recharts.org/en-US/api |
| Motion (Framer Motion) | https://motion.dev/docs |
| Firebase Auth | https://firebase.google.com/docs/auth |
| Gemini API (`@google/genai`) | https://ai.google.dev/gemini-api/docs |
| Docker | https://docs.docker.com/ |
| Pydantic | https://docs.pydantic.dev/ |
| SQLAlchemy | https://docs.sqlalchemy.org/ |

---

## 3. Appendix

### A. OBD-II PID Quick Reference Card

```
Mode 01 (Current Data):
  0x04  Calculated Engine Load (%)
  0x05  Engine Coolant Temp (°C)           ← Used
  0x06  Short-term Fuel Trim Bank 1 (%)
  0x07  Long-term Fuel Trim Bank 1 (%)
  0x0B  Intake Manifold Abs. Pressure (kPa) ← Used
  0x0C  Engine RPM                          ← Used
  0x0D  Vehicle Speed (km/h)                ← Used
  0x0E  Timing Advance (° before TDC)
  0x0F  Intake Air Temp (°C)                ← Used
  0x10  MAF Sensor (g/s)                    ← Used
  0x11  Throttle Position (%)               ← Used
  0x1F  Runtime Since Engine Start (s)
  0x2F  Fuel Tank Level (%)
  0x42  Control Module Voltage (V)
  0x46  Ambient Air Temp (°C)               ← Used
  0x49  Accel Pedal Position D (%)          ← Used
  0x4A  Accel Pedal Position E (%)          ← Used

Mode 03: Read Stored DTCs
Mode 07: Read Pending DTCs
```

### B. Fuel Consumption Formulas

```
Gasoline Fuel Consumption:
  MPG = 710.7 × VSS(mph) / MAF(g/s)
  
  Where:
    710.7 = conversion constant
    VSS = Vehicle Speed in mph (multiply km/h by 0.621371)
    MAF = Mass Air Flow Rate in grams per second

  To convert MPG to L/100km:
    L/100km = 235.215 / MPG

  Alternative formula (from physics):
    Fuel_rate (L/hr) = MAF(g/s) × 3600 / (AFR × fuel_density)
    Where:
      AFR ≈ 14.7 (stoichiometric air-fuel ratio for gasoline)
      fuel_density ≈ 755 g/L (gasoline at 15°C)
    Then:
      L/100km = Fuel_rate(L/hr) / Speed(km/h) × 100
```

### C. Health Score Weights Configuration

```yaml
health_score:
  thermal_weight: 0.40
  engine_weight: 0.40
  electrical_weight: 0.20

  thermal_thresholds:
    normal_max: 100  # °C
    warning_max: 110
    critical_max: 120
    penalty_per_degree: 5

  engine_thresholds:
    rpm_warning: 4500
    rpm_penalty: 5
    load_warning: 90.0  # %
    load_penalty: 2

  electrical_thresholds:
    voltage_warning: 12.8  # V
    voltage_warning_penalty: 10
    voltage_critical: 12.0
    voltage_critical_penalty: 20

  anomaly_penalty: 10
  dtc_penalty_per_code: 5

  score_ranges:
    excellent: [80, 100]  # Green
    good: [60, 79]        # Amber
    fair: [40, 59]        # Orange
    critical: [0, 39]     # Red
```

### D. Docker Compose Template

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db:5432/vehicle_health
      - MQTT_BROKER=mqtt
      - MQTT_PORT=1883
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    volumes:
      - ./backend/app:/app
      - ./backend/models:/models
    depends_on:
      - db
      - mqtt
    restart: unless-stopped

  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - mosquitto-data:/mosquitto/data
      - mosquitto-log:/mosquitto/log
    restart: unless-stopped

  db:
    image: timescale/timescaledb:latest-pg14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=vehicle_health
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

volumes:
  pgdata:
  mosquitto-data:
  mosquitto-log:
```

### E. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (asyncpg format) |
| `MQTT_BROKER` | Yes | `localhost` | MQTT broker hostname |
| `MQTT_PORT` | No | `1883` | MQTT broker port |
| `MQTT_USERNAME` | No | — | MQTT authentication username |
| `MQTT_PASSWORD` | No | — | MQTT authentication password |
| `JWT_SECRET_KEY` | Yes | — | Secret key for JWT signing (min 32 chars) |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT access token expiry |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | JWT refresh token expiry |
| `LOG_LEVEL` | No | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins (comma-separated) |
| `MODEL_DIR` | No | `./models` | Directory containing trained ML model files |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor |

### F. Document Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Project Overview & Requirements](01_project_overview_and_requirements.md) | Product overview, problem statement, goals, scope, personas, use cases, KPIs, functional/non-functional requirements, regulatory compliance |
| 02 | [System Architecture & Design](02_system_architecture_and_design.md) | HLD, LLD, data flow, component architecture, sequence flows, deployment |
| 03 | [OBD-II & Data Acquisition](03_obd_and_data_acquisition.md) | OBD-II protocols, PIDs, acquisition pipeline, edge device, simulation, DTC reference |
| 04 | [ML Pipeline Overview](04_ml_pipeline_overview.md) | ML strategy, problem formulation, feature engineering, preprocessing pipeline |
| 05 | [ML Models Reference](05_ml_models_reference.md) | Detailed specification for all 6 ML models |
| 06 | [Dataset & Data Documentation](06_dataset_and_data_documentation.md) | KIT dataset description, schema, data dictionary, versioning, validation rules |
| 07 | [Backend & API Reference](07_backend_and_api_reference.md) | FastAPI architecture, all endpoints, WebSocket, authentication |
| 08 | [Frontend & Dashboard](08_frontend_and_dashboard.md) | Frontend architecture, UI/UX design, components, state management |
| 09 | [Database & Storage](09_database_and_storage.md) | PostgreSQL + TimescaleDB design, indexing, compression, backup |
| 10 | [Data Pipeline & Streaming](10_data_pipeline_and_streaming.md) | MQTT pipeline, real-time processing, WebSocket management |
| 11 | [Monitoring, Logging & Security](11_monitoring_logging_and_security.md) | Logging, monitoring, ML model monitoring, security, privacy, threats |
| 12 | [Project Management & Roadmap](12_project_management_and_roadmap.md) | Roadmap, sprint planning, WBS, risk management |
| 13 | [Glossary, References & Appendix](13_glossary_references_and_appendix.md) | This document |

---

*End of documentation suite.*
