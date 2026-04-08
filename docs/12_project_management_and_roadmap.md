# 12 — Project Management & Roadmap

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Product Roadmap, Sprint Planning, Task Breakdown, Risk Management

---

## 1. Product Roadmap

### 1.1 Phase Overview

| Phase | Timeline | Focus | Status |
|-------|----------|-------|--------|
| **Phase I** | Sep 2025 – Mar 2026 | Research, SRS, System Design, Prototype Dashboard | ✅ Completed |
| **Phase II** | Apr 2026 – Sep 2026 | Full Backend Implementation, ML Training, Integration Testing | 🔄 In Progress |
| **Phase III** | Oct 2026 – Dec 2026 | Polish, User Testing, Report, Final Submission | 📋 Planned |
| **Future** | Post-graduation | Multi-vehicle fleet, GPS fusion, mobile app, commercialization | 💡 Vision |

### 1.2 Phase I Deliverables (Completed)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Literature survey (12 papers) | ✅ | Published in project report Chapter 2 |
| Software Requirements Specification | ✅ | Chapter 3 of report |
| System Design (all diagrams) | ✅ | Architecture, Use Case, Sequence, Class, Activity diagrams |
| Interactive Dashboard Prototype | ✅ | 3-page HTML/CSS/JS dashboard with mock OBD simulator |
| Mock ML Inference Engine | ✅ | JavaScript-based health score, anomaly detection, driver profiling |
| Dataset Selection | ✅ | KIT Automotive OBD-II Dataset (81 CSV files) |
| Phase I Report | ✅ | Submitted to VTU |

### 1.3 Phase II Deliverables (Current)

| Deliverable | Target Date | Priority |
|-------------|------------|----------|
| Python OBD acquisition client | Apr 2026 | P0 |
| MQTT broker setup (Mosquitto) | Apr 2026 | P0 |
| FastAPI backend skeleton | Apr 2026 | P0 |
| PostgreSQL + TimescaleDB schema deployment | Apr 2026 | P0 |
| Data preprocessing pipeline (Python) | May 2026 | P0 |
| Anomaly detection model training (IF + AE) | May 2026 | P0 |
| Health score model implementation | May 2026 | P0 |
| Predictive maintenance model training (RF) | Jun 2026 | P0 |
| Fuel efficiency model training | Jun 2026 | P1 |
| Driver behaviour clustering (K-Means) | Jun 2026 | P1 |
| REST API endpoints (all) | Jul 2026 | P0 |
| WebSocket real-time push | Jul 2026 | P0 |
| Dashboard-to-backend integration | Aug 2026 | P0 |
| Authentication (JWT + bcrypt) | Aug 2026 | P1 |
| Docker Compose full stack | Aug 2026 | P1 |
| Integration testing | Sep 2026 | P0 |
| Phase II Report | Sep 2026 | P0 |

### 1.4 Phase III Deliverables (Planned)

| Deliverable | Target Date | Priority |
|-------------|------------|----------|
| PDF report generation feature | Oct 2026 | P1 |
| Historical trend dashboard page | Oct 2026 | P1 |
| Email/push notification system | Nov 2026 | P2 |
| OBD-II emulator integration testing | Nov 2026 | P0 |
| User acceptance testing with peers | Nov 2026 | P0 |
| Performance optimization & bug fixes | Dec 2026 | P0 |
| Final documentation suite | Dec 2026 | P0 |
| Project demonstration (viva) | Dec 2026 | P0 |
| Final Report submission to VTU | Dec 2026 | P0 |

### 1.5 Future Vision (Post-Project)

| Feature | Description | Complexity |
|---------|-------------|-----------|
| GPS + IMU Sensor Fusion | Integrate GPS for location-based analytics, IMU for G-force metrics | High |
| LSTM Time-Series Forecasting | Predict future sensor values for early fault warning | High |
| Multi-Vehicle Fleet Dashboard | Fleet-wide health overview with comparative analytics | Medium |
| Mobile App (React Native) | Native iOS/Android app for on-the-go monitoring | High |
| Cloud Deployment (AWS/GCP) | Production-grade cloud infrastructure | Medium |
| OBD-II Live Hardware Testing | Test with physical KIWI/ELM327 on real vehicles | Medium |
| Marketplace Integration | Insurance telematics, used car marketplaces | Very High |
| Voice Alerts | Audio announcements for critical alerts while driving | Low |

---

## 2. Sprint Planning

### 2.1 Sprint Structure

| Parameter | Value |
|-----------|-------|
| Sprint Duration | 2 weeks |
| Team Size | 4 members |
| Sprint Ceremonies | Planning (Monday W1), Daily Standup (async), Review+Retro (Friday W2) |
| Tracking | GitHub Projects board |
| Version Control | Git + GitHub (feature branches → main) |

### 2.2 Sprint Breakdown (Phase II)

#### Sprint 1 (Apr W1–W2): Foundation
| Task | Owner | Story Points |
|------|-------|-------------|
| Set up project repository structure | Anish | 3 |
| Docker Compose with PostgreSQL + TimescaleDB | Saichaand | 5 |
| Mosquitto MQTT broker container | Yojan | 3 |
| FastAPI hello world + project skeleton | Pratham | 3 |
| Database schema deployment scripts | Saichaand | 5 |
| python-OBD installation + ELM327 emulator test | Anish | 5 |

#### Sprint 2 (Apr W3–W4): Data Ingestion
| Task | Owner | Story Points |
|------|-------|-------------|
| OBD acquisition client → MQTT publisher | Anish | 8 |
| MQTT consumer in backend (subscribe + validate) | Yojan | 5 |
| Sensor data → TimescaleDB insert | Saichaand | 5 |
| Data validation module with rules | Pratham | 5 |
| Connection status tracking | Anish | 3 |

#### Sprint 3 (May W1–W2): Preprocessing + First Model
| Task | Owner | Story Points |
|------|-------|-------------|
| CSV loader for KIT dataset (all 81 files) | Saichaand | 3 |
| Data preprocessing pipeline (Python class) | Pratham | 8 |
| Feature engineering (rolling stats, derivatives) | Pratham | 8 |
| Isolation Forest training + evaluation | Anish | 8 |
| Autoencoder architecture + training | Yojan | 8 |

#### Sprint 4 (May W3–W4): Health + Predictive Models
| Task | Owner | Story Points |
|------|-------|-------------|
| Health score calculator implementation | Anish | 5 |
| Synthetic RUL label generation | Pratham | 5 |
| Random Forest RUL training (oil, coolant, brakes) | Saichaand | 8 |
| Model serialization + versioning | Yojan | 3 |

#### Sprint 5 (Jun W1–W2): Fuel + Driver Models
| Task | Owner | Story Points |
|------|-------|-------------|
| Fuel consumption formula + RF training | Saichaand | 5 |
| K-Means driver behaviour clustering | Pratham | 5 |
| Driver score computation logic | Anish | 3 |
| ML inference engine (load all models, orchestrate) | Yojan | 8 |

#### Sprint 6 (Jun W3–W4): API Development
| Task | Owner | Story Points |
|------|-------|-------------|
| Auth endpoints (register, login, JWT) | Yojan | 8 |
| Vehicle CRUD endpoints | Saichaand | 5 |
| Telemetry endpoints (live, history) | Anish | 5 |
| Health + Maintenance endpoints | Pratham | 5 |
| Driver + DTC endpoints | Anish | 5 |

#### Sprint 7 (Jul W1–W2): WebSocket + Dashboard Integration
| Task | Owner | Story Points |
|------|-------|-------------|
| WebSocket server implementation | Yojan | 5 |
| Dashboard: Replace mock simulator with WebSocket client | Anish | 8 |
| Dashboard: Auth login screen | Pratham | 5 |
| Dashboard: Vehicle selector | Saichaand | 3 |

#### Sprint 8 (Jul W3–W4): Alert System + Reports
| Task | Owner | Story Points |
|------|-------|-------------|
| Alert engine (evaluate + dispatch) | Pratham | 5 |
| Email notification service | Yojan | 3 |
| PDF report generation | Saichaand | 8 |
| Dashboard: Alert panel integration | Anish | 5 |

#### Sprint 9 (Aug W1–W2): Docker + Testing
| Task | Owner | Story Points |
|------|-------|-------------|
| Docker Compose full stack (all services) | Yojan | 5 |
| Integration tests (API + ML pipeline) | All | 13 |
| Performance benchmarking | Saichaand | 5 |
| Bug fixes from testing | All | 8 |

#### Sprint 10 (Aug W3–Sep W2): Documentation + Report
| Task | Owner | Story Points |
|------|-------|-------------|
| Phase II report writing | All | 13 |
| Documentation suite generation | Pratham | 8 |
| Demo video recording | Anish | 3 |
| Final code cleanup + README | Yojan | 5 |

---

## 3. Task Breakdown (Work Breakdown Structure)

### 3.1 WBS Level 1

```
1.0 Project Management
2.0 Research & Design
3.0 Data Pipeline
4.0 ML Models
5.0 Backend API
6.0 Frontend Dashboard
7.0 Integration & Testing
8.0 Documentation & Reporting
```

### 3.2 WBS Level 2

```
1.0 Project Management
    1.1 Sprint planning & tracking
    1.2 Team coordination
    1.3 Risk management
    1.4 Progress reporting

2.0 Research & Design
    2.1 Literature survey
    2.2 SRS documentation
    2.3 System architecture design
    2.4 UML diagrams
    2.5 Technology selection

3.0 Data Pipeline
    3.1 OBD-II acquisition client
    3.2 MQTT broker setup
    3.3 Data ingestion service
    3.4 Data validation module
    3.5 Database schema deployment
    3.6 Offline buffering logic

4.0 ML Models
    4.1 Data preprocessing pipeline
    4.2 Feature engineering
    4.3 Anomaly detection (IF + AE)
    4.4 Health score model
    4.5 Predictive maintenance (RUL)
    4.6 Fuel efficiency prediction
    4.7 Driver behaviour classification
    4.8 Model versioning + storage

5.0 Backend API
    5.1 FastAPI project setup
    5.2 Authentication (JWT + bcrypt)
    5.3 Vehicle management endpoints
    5.4 Telemetry endpoints
    5.5 Health + maintenance endpoints
    5.6 Driver + DTC endpoints
    5.7 WebSocket real-time feed
    5.8 Report generation

6.0 Frontend Dashboard
    6.1 Live telemetry page
    6.2 Digital cockpit page
    6.3 AI neural core page
    6.4 Auth login screen
    6.5 Vehicle selector
    6.6 Historical data views
    6.7 WebSocket integration

7.0 Integration & Testing
    7.1 Docker Compose stack
    7.2 End-to-end integration testing
    7.3 Performance benchmarking
    7.4 OBD-II emulator testing
    7.5 Bug fixes

8.0 Documentation & Reporting
    8.1 Phase I report
    8.2 Phase II report
    8.3 Documentation suite (these docs)
    8.4 User manual
    8.5 Demo presentation
```

---

## 4. Risk Management

### 4.1 Risk Register

| # | Risk | Category | Probability | Impact | Overall | Mitigation Strategy | Contingency |
|---|------|----------|------------|--------|---------|--------------------|----|
| R1 | ML models underperform on single-vehicle dataset | Technical | Medium | High | **High** | Use ensemble methods, extensive feature engineering, cross-validation | Supplement with synthetic data or additional public datasets |
| R2 | OBD-II emulator doesn't fully replicate real ELM327 behaviour | Technical | Medium | Medium | **Medium** | Use well-documented emulators (OBDSim); test on multiple emulators | Design system to gracefully handle unexpected ELM327 responses |
| R3 | Team member unavailable (illness, other commitments) | Resource | Low | Medium | **Low** | Code documentation, knowledge sharing, modular architecture | Redistribute tasks; modular design allows independent work |
| R4 | Scope creep (feature addition beyond plan) | Management | High | Medium | **High** | Clearly defined scope in SRS; change control process | Defer new features to "Future Work" |
| R5 | Integration complexity between MQTT, backend, and dashboard | Technical | Medium | High | **High** | Early integration testing (Sprint 7); Docker Compose for consistency | Fallback to direct HTTP polling if WebSocket/MQTT integration fails |
| R6 | TimescaleDB compression/performance issues | Technical | Low | Medium | **Low** | Test with realistic data volumes early; benchmark | Fallback to plain PostgreSQL with manual partitioning |
| R7 | KIT dataset encoding issues (UTF-8/Latin-1) | Technical | High | Low | **Low** | Handle in preprocessing pipeline; well-documented column mapping | Already mitigated in preprocessing code |
| R8 | Dependency version conflicts (Python, TensorFlow) | Technical | Medium | Low | **Low** | Docker containerization; requirements.txt with pinned versions | Virtual environments; test matrix |
| R9 | Report/documentation deadline pressure | Schedule | Medium | Medium | **Medium** | Start documentation early; maintain running notes | Prioritize report requirements over optional features |
| R10 | No access to physical vehicle for testing | Technical | High | Medium | **Medium** | OBD-II emulator is primary testing strategy | Borrow vehicle briefly for demonstration; use KIT dataset as ground truth |

### 4.2 Risk Response Summary

| Response Type | Risks Addressed |
|--------------|----------------|
| **Avoid** | R4 (scope creep) — strict scope boundary |
| **Mitigate** | R1, R2, R5, R6 — technical precautions, early testing |
| **Accept** | R3, R7, R8 — low impact, manageable |
| **Transfer** | R10 — use emulator as alternative |

---

*Cross-references: [01 Project Overview](01_project_overview_and_requirements.md) · [02 System Architecture](02_system_architecture_and_design.md)*
