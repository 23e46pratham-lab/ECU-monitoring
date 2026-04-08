# 07 — Backend & API Reference

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Backend Architecture, API Design Principles, Endpoint Reference, Authentication & Authorization

---

## 1. Backend Architecture

### 1.1 Framework: FastAPI

The backend is built on **FastAPI** (Python), chosen for:
- Native async/await support for concurrent MQTT message handling and API serving.
- Automatic OpenAPI (Swagger) documentation generation.
- Built-in request validation via Pydantic models.
- High performance (comparable to Node.js / Go for I/O-bound tasks).

### 1.2 Backend Module Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Configuration (env vars, secrets)
│   ├── dependencies.py          # Shared dependencies (DB sessions, auth)
│   │
│   ├── api/                     # API route modules
│   │   ├── __init__.py
│   │   ├── auth.py              # Login, register, token refresh
│   │   ├── vehicles.py          # Vehicle CRUD
│   │   ├── telemetry.py         # Live data, historical queries
│   │   ├── health.py            # Health scores, anomaly status
│   │   ├── maintenance.py       # RUL predictions, alerts
│   │   ├── driver.py            # Driver behaviour profiles
│   │   ├── dtc.py               # DTC retrieval, clearing
│   │   └── reports.py           # PDF report generation
│   │
│   ├── models/                  # Pydantic schemas + SQLAlchemy ORM
│   │   ├── __init__.py
│   │   ├── schemas.py           # Request/Response Pydantic models
│   │   ├── database.py          # SQLAlchemy models (ORM)
│   │   └── enums.py             # Severity, AlertType, BehaviourClass
│   │
│   ├── services/                # Business logic layer
│   │   ├── __init__.py
│   │   ├── acquisition.py       # MQTT consumer, data ingestion
│   │   ├── ml_engine.py         # ML inference orchestration
│   │   ├── alert_engine.py      # Alert evaluation + dispatch
│   │   ├── report_service.py    # PDF generation
│   │   └── notification.py      # Email + push notification
│   │
│   ├── ml/                      # ML model loaders + inference
│   │   ├── __init__.py
│   │   ├── anomaly.py           # Isolation Forest + Autoencoder
│   │   ├── health.py            # Health score computation
│   │   ├── maintenance.py       # RUL prediction
│   │   ├── fuel.py              # Fuel efficiency prediction
│   │   ├── driver.py            # Driver behaviour classification
│   │   └── preprocessor.py      # Real-time feature engineering
│   │
│   ├── core/                    # Cross-cutting concerns
│   │   ├── __init__.py
│   │   ├── security.py          # JWT, bcrypt, authentication logic
│   │   ├── database.py          # DB connection pool management
│   │   ├── mqtt.py              # MQTT client management
│   │   └── logging_config.py    # Structured logging setup
│   │
│   └── websocket/               # WebSocket handlers
│       ├── __init__.py
│       └── live_feed.py         # Real-time data push to dashboard
│
├── models/                      # Trained ML model files
│   ├── anomaly_detection/
│   ├── health_score/
│   ├── predictive_maintenance/
│   ├── fuel_efficiency/
│   ├── driver_behaviour/
│   └── scalers/
│
├── Dockerfile
├── requirements.txt
└── docker-compose.yml
```

### 1.3 Application Lifecycle

```python
# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    await init_database()        # PostgreSQL + TimescaleDB connection
    await init_mqtt_consumer()   # Subscribe to vehicle telemetry topics
    load_ml_models()             # Load all trained models into memory
    
    yield  # Application runs
    
    # SHUTDOWN
    await close_mqtt()
    await close_database()

app = FastAPI(
    title="Vehicle Health Monitoring API",
    version="1.0.0",
    description="API for intelligent vehicle health monitoring and predictive maintenance",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(vehicles_router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(telemetry_router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(health_router, prefix="/api/health", tags=["Health"])
app.include_router(maintenance_router, prefix="/api/maintenance", tags=["Maintenance"])
app.include_router(driver_router, prefix="/api/driver", tags=["Driver Behaviour"])
app.include_router(dtc_router, prefix="/api/dtc", tags=["DTCs"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
```

---

## 2. API Design Principles

| Principle | Implementation |
|-----------|---------------|
| **RESTful conventions** | Resources as nouns (`/vehicles`, `/health`), HTTP verbs for actions (GET, POST, PUT, DELETE) |
| **Versioning** | URL-based: `/api/v1/...` (v1 implied in current version) |
| **Pagination** | `?page=1&limit=50` for list endpoints; default limit=50, max=500 |
| **Filtering** | Query parameters: `?start_time=...&end_time=...&severity=critical` |
| **Sorting** | `?sort_by=timestamp&order=desc` |
| **Error Responses** | Standard JSON error format: `{"detail": "...", "status_code": 4xx/5xx}` |
| **Authentication** | JWT Bearer tokens in `Authorization` header |
| **Rate Limiting** | 100 requests/minute per authenticated user (configurable) |
| **Content Type** | `application/json` for all API responses |
| **CORS** | Configurable allowed origins |

### 2.1 Standard Response Envelope

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "timestamp": "2026-04-05T12:00:00Z"
  }
}
```

### 2.2 Error Response Format

```json
{
  "status": "error",
  "detail": "Vehicle not found",
  "status_code": 404,
  "timestamp": "2026-04-05T12:00:00Z"
}
```

---

## 3. API Endpoints Reference

### 3.1 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|--------------|-------------|---------|
| POST | `/api/auth/register` | Register new user | No | `{email, password, display_name}` | `{user_id, email, token}` |
| POST | `/api/auth/login` | Authenticate user | No | `{email, password}` | `{access_token, token_type, expires_in}` |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes | `{refresh_token}` | `{access_token, expires_in}` |
| GET | `/api/auth/me` | Get current user profile | Yes | — | `{user_id, email, display_name, vehicles}` |

### 3.2 Vehicles (`/api/vehicles`)

| Method | Endpoint | Description | Auth | Request/Params | Response |
|--------|----------|-------------|------|---------------|---------|
| POST | `/api/vehicles` | Register new vehicle | Yes | `{make, model, year, vin?, engine_type?}` | `{vehicle_id, ...}` |
| GET | `/api/vehicles` | List user's vehicles | Yes | — | `[{vehicle_id, make, model, year, ...}]` |
| GET | `/api/vehicles/{id}` | Get vehicle details | Yes | — | `{vehicle_id, make, model, year, ...}` |
| PUT | `/api/vehicles/{id}` | Update vehicle | Yes | `{make?, model?, year?, ...}` | `{vehicle_id, ...}` |
| DELETE | `/api/vehicles/{id}` | Delete vehicle | Yes | — | `{deleted: true}` |

### 3.3 Telemetry (`/api/telemetry`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| GET | `/api/telemetry/{vehicle_id}/live` | Get latest sensor snapshot | Yes | — | `{timestamp, rpm, speed, throttle, ...}` |
| GET | `/api/telemetry/{vehicle_id}/history` | Get historical sensor data | Yes | `start_time, end_time, interval?` | `[{timestamp, rpm, speed, ...}]` |
| GET | `/api/telemetry/{vehicle_id}/sessions` | List recording sessions | Yes | `page, limit` | `[{session_id, start_time, end_time, duration}]` |
| GET | `/api/telemetry/{vehicle_id}/sessions/{session_id}` | Get session data | Yes | `page, limit` | `[{timestamp, rpm, speed, ...}]` |

### 3.4 Health (`/api/health`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| GET | `/api/health/{vehicle_id}` | Get current health status | Yes | — | `{health_score, thermal, engine, electrical, risk_level, summary}` |
| GET | `/api/health/{vehicle_id}/history` | Health score history | Yes | `start_time, end_time` | `[{timestamp, health_score, risk_level}]` |
| GET | `/api/health/{vehicle_id}/anomalies` | Get detected anomalies | Yes | `start_time, end_time` | `[{timestamp, anomaly_type, score}]` |

### 3.5 Maintenance (`/api/maintenance`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| GET | `/api/maintenance/{vehicle_id}/predictions` | Get RUL predictions | Yes | — | `[{component, rul_km, rul_days, urgency, recommended_action}]` |
| GET | `/api/maintenance/{vehicle_id}/alerts` | Get active maintenance alerts | Yes | `severity?` | `[{alert_id, component, urgency, message, created_at}]` |
| PATCH | `/api/maintenance/alerts/{alert_id}/acknowledge` | Acknowledge alert | Yes | — | `{acknowledged: true}` |
| POST | `/api/maintenance/{vehicle_id}/log` | Log completed maintenance | Yes | `{component, action, km_at_service, date}` | `{log_id}` |
| GET | `/api/maintenance/{vehicle_id}/history` | Get maintenance log | Yes | — | `[{log_id, component, action, date, km}]` |

### 3.6 Driver Behaviour (`/api/driver`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| GET | `/api/driver/{vehicle_id}/profile` | Get latest driver profile | Yes | — | `{behaviour_class, score, confidence, fuel_impact, insight}` |
| GET | `/api/driver/{vehicle_id}/history` | Session-by-session scores | Yes | `start_time, end_time` | `[{session_id, behaviour_class, score, timestamp}]` |

### 3.7 DTCs (`/api/dtc`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| GET | `/api/dtc/{vehicle_id}` | Get active DTCs | Yes | — | `[{code, severity, description, system, probable_cause, recommended_action}]` |
| POST | `/api/dtc/{vehicle_id}/scan` | Trigger DTC scan | Yes | — | `[{code, severity, ...}]` |
| POST | `/api/dtc/{vehicle_id}/clear` | Clear DTCs (with confirmation) | Yes | `{confirm: true}` | `{cleared: true, warning: "..."}` |

### 3.8 Reports (`/api/reports`)

| Method | Endpoint | Description | Auth | Params | Response |
|--------|----------|-------------|------|--------|---------|
| POST | `/api/reports/{vehicle_id}/generate` | Generate PDF report | Yes | `{report_type, start_date, end_date}` | `{report_id, status: "generating"}` |
| GET | `/api/reports/{report_id}/download` | Download PDF | Yes | — | Binary PDF file |
| GET | `/api/reports/{vehicle_id}` | List generated reports | Yes | — | `[{report_id, type, date_range, status}]` |

### 3.9 WebSocket (`/ws`)

| Endpoint | Direction | Payload | Purpose |
|----------|-----------|---------|---------|
| `ws://server/ws/vehicle/{id}` | Server → Client | JSON sensor snapshot (every ~1s) | Real-time sensor updates for dashboard |
| `ws://server/ws/vehicle/{id}/alerts` | Server → Client | JSON alert object | Push alerts to dashboard immediately |

**WebSocket Message Format**:
```json
{
  "type": "telemetry",
  "data": {
    "timestamp": "2026-04-05T12:00:00.000Z",
    "rpm": 2450.0,
    "speed": 65.0,
    "throttle": 32.5,
    "load": 45.0,
    "coolant_temp": 92.0,
    "maf": 12.3,
    "health_score": 87,
    "risk_level": "Low"
  }
}
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

```
1. User registers with email + password
   → Password hashed with bcrypt (work factor 12)
   → User record stored in `users` table
   → JWT access token returned

2. User logs in with email + password
   → bcrypt.verify(password, stored_hash)
   → If valid: generate JWT access token + refresh token
   → Access token expires in 60 minutes
   → Refresh token expires in 7 days

3. Subsequent requests include:
   Authorization: Bearer <access_token>
   → Backend validates JWT signature + expiry
   → Extracts user_id from token payload

4. Token refresh:
   POST /api/auth/refresh with refresh_token
   → New access token issued
```

### 4.2 JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "<user_id>",
    "email": "user@example.com",
    "exp": 1712323200,
    "iat": 1712319600,
    "type": "access"
  }
}
```

### 4.3 Authorization Rules

| Resource | Owner | Admin | Unauthenticated |
|----------|-------|-------|-----------------|
| Own vehicle data | Full CRUD | Full CRUD | No access |
| Other user's data | No access | Read only | No access |
| DTC clear | Allowed (with confirm) | Allowed | No access |
| Report download | Own reports only | All reports | No access |
| User management | Own profile only | All users | No access |

### 4.4 Security Implementation

```python
# core/security.py

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [08 Frontend](08_frontend_and_dashboard.md) · [09 Database](09_database_and_storage.md) · [10 Data Pipeline](10_data_pipeline_and_streaming.md)*
