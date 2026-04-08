# 11 — Monitoring, Logging & Security

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Logging Strategy, System Monitoring & Alerting, ML Model Monitoring, Security Architecture, Data Privacy, Threat Modeling

---

## 1. Logging Strategy

### 1.1 Logging Framework

| Component | Library | Output |
|-----------|---------|--------|
| Backend (FastAPI) | Python `logging` + `structlog` | JSON-structured logs |
| ML Inference | Python `logging` | Model inference events |
| MQTT Broker | Mosquitto native logging | Broker events |
| Database | PostgreSQL native logging | Query logs, slow queries |
| Frontend | `console.log/warn/error` | Browser dev tools |

### 1.2 Log Severity Levels

| Level | Usage | Examples |
|-------|-------|---------|
| **DEBUG** | Development-only detailed tracing | Raw PID responses, intermediate ML values, SQL queries |
| **INFO** | Normal operational events | Session started, ML model loaded, API request served, record ingested |
| **WARNING** | Unexpected but recoverable situations | Unsupported PID skipped, high inference latency, MQTT reconnect |
| **ERROR** | Failures requiring attention | Database connection failed, ML model file not found, MQTT publish failed |
| **CRITICAL** | System-level failures | Application crash, database corruption, security breach detected |

### 1.3 Log Entry Format

Every log entry follows a structured JSON format:

```json
{
  "timestamp": "2026-04-05T12:00:00.123Z",
  "level": "INFO",
  "module": "services.acquisition",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_id": "VH-001",
  "message": "Telemetry record ingested successfully",
  "extra": {
    "record_sequence": 12345,
    "processing_time_ms": 5.2,
    "source": "mqtt"
  }
}
```

### 1.4 Log Configuration

```python
# core/logging_config.py

import logging
import structlog

def setup_logging(log_level="INFO", log_file="app.log"):
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level)
        ),
        logger_factory=structlog.WriteLoggerFactory(
            file=open(log_file, "a") if log_file else None
        ),
    )

# Usage in application modules:
import structlog
logger = structlog.get_logger()

logger.info("telemetry_ingested",
    vehicle_id="VH-001",
    session_id="abc-123",
    processing_time_ms=5.2
)
```

### 1.5 Log Retention Policy

| Log Type | Retention Period | Storage Location | Action After Retention |
|----------|-----------------|-----------------|----------------------|
| Application logs | 30 days | `/var/log/vehicle-health/app.log` | Archive to compressed storage, then delete |
| Access logs (API) | 30 days | `/var/log/vehicle-health/access.log` | Archive |
| Audit logs | 12 months (minimum) | Dedicated audit log database | Immutable, never auto-deleted |
| ML inference logs | 30 days | `/var/log/vehicle-health/ml.log` | Archive |
| MQTT broker logs | 14 days | `/var/log/mosquitto/mosquitto.log` | Rotate |
| Error logs | 90 days | `/var/log/vehicle-health/error.log` | Archive |

### 1.6 Administrative Audit Logging

All administrative actions are logged to an immutable audit trail:

| Event | Logged Data |
|-------|------------|
| User registration | user_id, email, timestamp |
| Login success/failure | user_id, IP address, timestamp, success/failure |
| Vehicle profile created/modified/deleted | user_id, vehicle_id, action, timestamp |
| DTC clear command | user_id, vehicle_id, DTC codes cleared, timestamp |
| ML model update/deployment | admin_id, model_name, version, timestamp |
| Threshold configuration change | admin_id, parameter, old_value, new_value, timestamp |
| Data deletion request | user_id, data_scope, timestamp |

```sql
CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id     UUID,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100),
    resource_id VARCHAR(255),
    details     JSONB,
    ip_address  INET,
    success     BOOLEAN DEFAULT TRUE
);

-- Immutable: Deny UPDATE and DELETE on audit_log
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
```

---

## 2. System Monitoring & Alerting

### 2.1 System Health Metrics

| Metric | Source | Normal Range | Alert Threshold |
|--------|--------|-------------|----------------|
| API response time (p95) | FastAPI middleware | <1 second | >2 seconds for 5 min |
| API error rate | FastAPI error handler | <1% | >5% for 5 min |
| MQTT message queue depth | Mosquitto stats | <100 messages | >500 messages |
| Database connections | PostgreSQL `pg_stat_activity` | <80% pool capacity | >90% pool capacity |
| Database query latency (p95) | Query instrumentation | <50ms | >200ms |
| ML inference latency (p95) | Model instrumentation | <500ms | >1 second |
| Disk space available | OS monitoring | >20% free | <10% free |
| Memory usage | OS monitoring | <80% | >90% |
| CPU usage | OS monitoring | <70% | >85% sustained for 5 min |
| WebSocket connections | Connection manager | — | >1000 (capacity planning) |
| Data ingestion rate | Pipeline metrics | 1 record/sec/vehicle | <0.5 record/sec (data loss?) |

### 2.2 Monitoring Stack (Recommended)

| Tool | Purpose |
|------|---------|
| **Prometheus** | Metrics collection and storage |
| **Grafana** | Dashboard visualization for system metrics |
| **FastAPI Instrumentator** | Automatic API metrics (requests, latency, errors) |
| **psutil** | Python library for system resource monitoring |

### 2.3 Health Check Endpoint

```python
@app.get("/api/health")
async def health_check():
    checks = {
        "api": "healthy",
        "database": await check_database(),
        "mqtt": await check_mqtt(),
        "ml_models": check_ml_models_loaded(),
        "uptime": get_uptime_seconds()
    }
    overall = "healthy" if all(v == "healthy" or isinstance(v, (int, float)) for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}
```

---

## 3. ML Model Monitoring

### 3.1 Model Performance Tracking

| Metric | How to Track | Action on Degradation |
|--------|-------------|----------------------|
| Anomaly detection rate | % of records flagged as anomaly | If consistently >15% or <1%, investigate |
| Health score distribution | Mean and std of VHS over time | If mean drops steadily, check for model drift |
| RUL prediction spread | Variance of RUL predictions | High variance → model uncertainty, retrain |
| Fuel prediction error | Predicted vs. formula-computed MAE | If MAE > 2.0 L/100km, retrain |
| Driver behaviour distribution | % per cluster over time | If one cluster dominates >80%, k may need adjustment |
| Inference latency | p50, p95, p99 per model | If p95 > target, optimise or scale |

### 3.2 Data Drift Detection

```python
class DriftDetector:
    """Monitors feature distributions for data drift."""
    
    def __init__(self, reference_stats):
        self.reference = reference_stats  # Mean/std from training data
        self.window = []
        self.window_size = 1000
    
    def check(self, record):
        self.window.append(record)
        if len(self.window) > self.window_size:
            self.window.pop(0)
        
        if len(self.window) < self.window_size:
            return None  # Not enough data
        
        drift_detected = {}
        for feature, ref in self.reference.items():
            current_mean = np.mean([r[feature] for r in self.window])
            current_std = np.std([r[feature] for r in self.window])
            
            # Simple Z-test: is current mean significantly different from reference?
            z_score = abs(current_mean - ref['mean']) / (ref['std'] / np.sqrt(len(self.window)))
            if z_score > 3.0:  # p < 0.001
                drift_detected[feature] = {
                    'ref_mean': ref['mean'],
                    'current_mean': current_mean,
                    'z_score': z_score
                }
        
        return drift_detected if drift_detected else None
```

### 3.3 Model Retraining Triggers

| Trigger | Description | Action |
|---------|-------------|--------|
| Data drift detected | Feature distributions shifted significantly | Queue retraining with new data |
| Performance degradation | Metrics below threshold for >7 days | Alert admin, queue retraining |
| New vehicle onboarded | Different vehicle make/model | Evaluate model performance on new vehicle data |
| Scheduled | Every 30 days (or after N new records) | Preventive retraining |
| Manual | Admin triggers retraining | Deploy new model version |

---

## 4. Security Architecture

### 4.1 Security Layers

| Layer | Mechanism | Implementation |
|-------|-----------|---------------|
| **Authentication** | JWT tokens | Stateless, RS256 or HS256 signed |
| **Password Storage** | bcrypt | Work factor 12, salt auto-generated |
| **Transport Encryption** | TLS 1.2+ | HTTPS for API, MQTTS for telemetry |
| **Data at Rest** | PostgreSQL encryption | Transparent Data Encryption (TDE) or full-disk encryption |
| **API Security** | CORS, rate limiting, input validation | FastAPI middleware |
| **Injection Prevention** | Parameterised queries (SQLAlchemy ORM) | No raw SQL string concatenation |
| **Secrets Management** | Environment variables | `.env` file (dev), Docker secrets or vault (prod) |

### 4.2 Authentication Flow Security

```
Registration:
  Client → POST /api/auth/register {email, password}
  Server → bcrypt.hash(password, rounds=12) → store hash
  Server → generate JWT(user_id) → return token

Login:
  Client → POST /api/auth/login {email, password}
  Server → bcrypt.verify(password, stored_hash)
  Server → if valid: generate JWT access_token (60 min) + refresh_token (7 days)
  Server → return tokens

Protected Request:
  Client → GET /api/health/VH-001
           Header: Authorization: Bearer <access_token>
  Server → verify JWT signature + expiry
  Server → extract user_id from payload
  Server → check user owns vehicle VH-001
  Server → return data or 403 Forbidden
```

### 4.3 MQTT Security

```
# Production MQTT security:

1. TLS encryption: MQTTS on port 8883
   - Server certificate signed by trusted CA
   - Client certificate authentication (mutual TLS) optional

2. Username/Password authentication:
   - Each acquisition client has unique credentials
   - Credentials stored in Mosquitto password file (hashed)

3. ACL (Access Control List):
   # Acquisition client can only publish to its own vehicle topics
   user vehicle_VH001
   topic write vehicle/VH-001/telemetry
   topic write vehicle/VH-001/dtc
   topic write vehicle/VH-001/status
   topic read  vehicle/VH-001/command
   
   # Backend can subscribe to all vehicle topics
   user backend_service
   topic read  vehicle/+/telemetry
   topic read  vehicle/+/dtc
   topic read  vehicle/+/status
   topic write vehicle/+/command
   topic write vehicle/+/alerts
```

### 4.4 Input Validation

```python
from pydantic import BaseModel, validator, Field

class SensorRecord(BaseModel):
    rpm: float = Field(ge=0, le=16384)
    speed: float = Field(ge=0, le=255)
    coolant_temp: float = Field(ge=-40, le=215)
    throttle: float = Field(ge=0, le=100)
    maf: float = Field(ge=0, le=655.35)
    
    @validator('rpm', 'speed', 'coolant_temp', 'throttle', 'maf')
    def must_be_finite(cls, v):
        if not np.isfinite(v):
            raise ValueError('Value must be finite (not NaN or Inf)')
        return v
```

---

## 5. Data Privacy

### 5.1 Data Classification

| Data Category | Sensitivity | Examples | Protection |
|--------------|-------------|---------|-----------|
| **Vehicle Telemetry** | Low-Medium | RPM, Speed, Coolant Temp | Encrypted in transit and at rest |
| **Vehicle Identity** | Medium | VIN, Make, Model, Year | Access-controlled, not publicly exposed |
| **User Credentials** | High | Email, Password | bcrypt hashed, never logged |
| **Location Data** | High (PII) | GPS coordinates (future) | Explicit consent required, encrypted |
| **Driving Behaviour** | Medium | Driver scores, behaviour classification | Associated with vehicle, not individual name |
| **Maintenance Records** | Low | Service dates, components replaced | Standard encryption |

### 5.2 DPDP Act 2023 Compliance (India)

| Principle | Implementation |
|-----------|---------------|
| **Lawful Purpose** | Data collected solely for vehicle health monitoring and predictive maintenance |
| **Purpose Limitation** | Vehicle data not shared with third parties or used for advertising |
| **Data Minimisation** | Only standard OBD-II PIDs collected; no audio, camera, or biometric data |
| **Consent** | Explicit consent obtained at registration for data collection and cloud processing |
| **Right to Erasure** | User can request deletion of all personal data and vehicle telemetry via API endpoint |
| **Data Security** | Encryption in transit (TLS) and at rest; access controls; audit logging |
| **Breach Notification** | Incident response plan includes notification within 72 hours |

### 5.3 Data Deletion Endpoint

```python
@app.delete("/api/user/data")
async def delete_user_data(user: User = Depends(get_current_user)):
    """Delete all user data (DPDP Act compliance)."""
    vehicles = await get_user_vehicles(user.user_id)
    for vehicle in vehicles:
        await db.execute("DELETE FROM sensor_data WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM health_scores WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM alerts WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM dtc_records WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM driver_profiles WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM maintenance_predictions WHERE vehicle_id = $1", vehicle.id)
        await db.execute("DELETE FROM vehicles WHERE vehicle_id = $1", vehicle.id)
    await db.execute("DELETE FROM users WHERE user_id = $1", user.user_id)
    
    # Audit log (retained separately)
    await audit_log("data_deletion", user.user_id, "all_data")
    
    return {"deleted": True, "message": "All personal and vehicle data deleted"}
```

---

## 6. Threat Modeling

### 6.1 Threat Matrix (STRIDE)

| Threat | Category | Attack Vector | Impact | Mitigation |
|--------|----------|--------------|--------|-----------|
| Credential theft | **S**poofing | Phishing, brute force | Unauthorized dashboard access | bcrypt + rate limiting + account lockout |
| MQTT data injection | **T**ampering | Fake telemetry published to broker | False alerts, incorrect health scores | MQTT authentication + ACL + message signing |
| Data exfiltration | **I**nformation Disclosure | Unencrypted MQTT traffic intercepted | Vehicle data exposed | TLS/MQTTS encryption |
| DTC clear abuse | **E**levation of Privilege | Unauthorized Mode 04 command | Masking vehicle faults | Explicit user confirmation + audit log |
| Denial of service | **D**enial of Service | Flood MQTT broker with messages | System unavailable | Rate limiting + message size limits |
| Log tampering | **R**epudiation | Modifying audit logs | Hide unauthorized actions | Immutable audit log (no UPDATE/DELETE permissions) |
| Vehicle tracking | **I**nformation Disclosure | Correlating telemetry timestamps with locations | Privacy violation | No GPS data by default; location requires explicit consent |
| Man-in-the-middle | **T**ampering | Intercept ELM327 Bluetooth connection | Modified sensor data | Bluetooth pairing authentication; future: encrypted OBD adapters |

### 6.2 Risk Assessment

| Risk | Likelihood | Impact | Overall Risk | Priority |
|------|-----------|--------|-------------|----------|
| Credential theft | Medium | High | High | P0 — Mitigated by bcrypt + JWT |
| MQTT injection | Low | High | Medium | P1 — Mitigated by auth + ACL |
| Data exfiltration (transit) | Low | Medium | Low | P1 — Mitigated by TLS |
| DTC clear abuse | Low | Medium | Low | P2 — Mitigated by confirmation flow |
| DoS on MQTT | Low | Medium | Low | P2 — Mitigated by rate limits |
| Bluetooth MITM | Low | Low | Low | P3 — Future: secure adapters |

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [07 Backend & API](07_backend_and_api_reference.md) · [10 Data Pipeline](10_data_pipeline_and_streaming.md)*
