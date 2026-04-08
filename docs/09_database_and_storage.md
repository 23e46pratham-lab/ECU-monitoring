# 09 — Database & Storage

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Database Design, TimescaleDB Time-Series Storage, Schema Design, Indexing & Performance Optimization

---

## 1. Database Design

### 1.1 Dual-Database Strategy

The system uses a **hybrid relational + time-series** database approach:

| Database | Technology | Purpose | Data Type |
|----------|-----------|---------|-----------|
| **Relational** | PostgreSQL 14+ | User accounts, vehicle profiles, maintenance logs, alerts, DTCs, ML results | Structured records with relationships |
| **Time-Series** | TimescaleDB (PostgreSQL extension) | High-frequency OBD-II sensor data, health score history | Time-indexed continuous data |

**Why not separate databases?**  
TimescaleDB runs as a PostgreSQL extension, meaning both relational and time-series data live in the same database instance. This eliminates the need for cross-database joins or synchronization, simplifies deployment, and ensures transactional consistency.

### 1.2 Entity-Relationship Overview

```
users ─────────────── user_vehicles ──────────── vehicles
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                sessions       dtc_records      alerts
                                    │
                    ┌───────────────┼───────────────────────────────┐
                    │               │               │               │
              sensor_data    health_scores   driver_profiles   maintenance_predictions
              (hypertable)                                    maintenance_logs
```

### 1.3 Table Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| users → user_vehicles | 1:N | A user can own multiple vehicles |
| vehicles → user_vehicles | 1:N | A vehicle can be shared with multiple users (e.g., fleet) |
| vehicles → sessions | 1:N | A vehicle has many recording sessions |
| sessions → sensor_data | 1:N | A session contains many sensor readings |
| sessions → health_scores | 1:N | Multiple health evaluations per session |
| sessions → driver_profiles | 1:1 | One behaviour classification per session |
| vehicles → dtc_records | 1:N | A vehicle can have multiple DTCs |
| vehicles → alerts | 1:N | A vehicle can generate many alerts |
| vehicles → maintenance_predictions | 1:N | Multiple component predictions per vehicle |
| vehicles → maintenance_logs | 1:N | Historical maintenance actions |

---

## 2. TimescaleDB Time-Series Storage

### 2.1 Why TimescaleDB?

| Feature | Benefit for This System |
|---------|----------------------|
| **Hypertables** | Automatic time-based partitioning of sensor_data table; transparent to queries |
| **Compression** | Up to 95% compression of older data; critical for long-term storage of 1 Hz data |
| **Continuous Aggregates** | Pre-computed rollups (1-min, 5-min, 1-hour averages) for efficient historical queries |
| **Retention Policies** | Automatic deletion of raw data older than configurable period (e.g., 90 days) |
| **Full SQL** | No need to learn new query language; JOIN with relational tables seamlessly |
| **Index Optimisation** | B-tree + BRIN indexes on time column for fast range queries |

### 2.2 Hypertable Configuration

```sql
-- Create the sensor_data table
CREATE TABLE sensor_data (
    time                TIMESTAMPTZ NOT NULL,
    session_id          UUID NOT NULL,
    vehicle_id          UUID NOT NULL,
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

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- Add space partitioning by vehicle_id (for multi-vehicle deployments)
SELECT add_dimension('sensor_data', 'vehicle_id', number_partitions => 4);
```

### 2.3 Compression Configuration

```sql
-- Enable compression on sensor_data
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vehicle_id, session_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Automatically compress data older than 7 days
SELECT add_compression_policy('sensor_data', INTERVAL '7 days');
```

**Expected compression ratio**: ~10:1 to 20:1 for repetitive sensor data.

### 2.4 Continuous Aggregates

Pre-computed rollups for dashboard historical views:

```sql
-- 1-minute averages
CREATE MATERIALIZED VIEW sensor_data_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    vehicle_id,
    session_id,
    AVG(rpm) AS avg_rpm,
    AVG(speed) AS avg_speed,
    AVG(coolant_temp) AS avg_coolant_temp,
    AVG(throttle) AS avg_throttle,
    AVG(maf) AS avg_maf,
    MAX(rpm) AS max_rpm,
    MAX(speed) AS max_speed,
    MAX(coolant_temp) AS max_coolant_temp,
    MIN(coolant_temp) AS min_coolant_temp
FROM sensor_data
GROUP BY bucket, vehicle_id, session_id;

-- Refresh policy: update every 5 minutes
SELECT add_continuous_aggregate_policy('sensor_data_1min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes'
);

-- 1-hour averages (for long-term trends)
CREATE MATERIALIZED VIEW sensor_data_1hour
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    vehicle_id,
    AVG(rpm) AS avg_rpm,
    AVG(speed) AS avg_speed,
    AVG(coolant_temp) AS avg_coolant_temp,
    AVG(maf) AS avg_maf,
    AVG(throttle) AS avg_throttle,
    COUNT(*) AS record_count
FROM sensor_data
GROUP BY bucket, vehicle_id;
```

### 2.5 Data Retention Policy

```sql
-- Automatically drop raw data older than 90 days
-- (1-minute and 1-hour aggregates retained indefinitely)
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');
```

| Data Type | Retention | Storage Impact |
|-----------|-----------|---------------|
| Raw sensor_data (1 Hz) | 90 days | ~500 MB/vehicle/month (compressed) |
| 1-minute aggregates | Indefinite | ~15 MB/vehicle/month |
| 1-hour aggregates | Indefinite | ~0.5 MB/vehicle/month |
| Health scores | Indefinite | ~5 MB/vehicle/month |
| Alerts, DTCs | Indefinite | ~1 MB/vehicle/month |

---

## 3. Indexing & Performance Optimization

### 3.1 Indexes

```sql
-- sensor_data: Time is automatically indexed by hypertable
-- Additional indexes for common query patterns:

-- Fast lookup by vehicle_id + time range (most common dashboard query)
CREATE INDEX idx_sensor_vehicle_time ON sensor_data (vehicle_id, time DESC);

-- Fast session-level queries
CREATE INDEX idx_sensor_session ON sensor_data (session_id, time DESC);

-- sessions: vehicle lookup
CREATE INDEX idx_sessions_vehicle ON sessions (vehicle_id, start_time DESC);

-- alerts: active alerts per vehicle
CREATE INDEX idx_alerts_vehicle_active ON alerts (vehicle_id, created_at DESC)
    WHERE acknowledged = FALSE;

-- health_scores: latest per vehicle
CREATE INDEX idx_health_vehicle_time ON health_scores (vehicle_id, timestamp DESC);

-- dtc_records: active DTCs
CREATE INDEX idx_dtc_vehicle_active ON dtc_records (vehicle_id, first_detected DESC)
    WHERE cleared_at IS NULL;

-- users: email lookup (unique already creates index)
-- user_vehicles: composite PK already serves as index
```

### 3.2 Query Optimization Patterns

**Pattern 1: Get latest sensor snapshot**
```sql
-- Uses index: idx_sensor_vehicle_time
SELECT * FROM sensor_data
WHERE vehicle_id = $1
ORDER BY time DESC
LIMIT 1;
-- Expected: <5ms
```

**Pattern 2: Get historical data for chart (last 1 hour)**
```sql
-- Uses hypertable time-based chunking + index
SELECT time, rpm, speed, coolant_temp, throttle
FROM sensor_data
WHERE vehicle_id = $1
  AND time > NOW() - INTERVAL '1 hour'
ORDER BY time ASC;
-- Expected: <50ms for 3,600 rows
```

**Pattern 3: Get daily averages for last 30 days (uses continuous aggregate)**
```sql
SELECT bucket, avg_rpm, avg_speed, avg_coolant_temp
FROM sensor_data_1hour
WHERE vehicle_id = $1
  AND bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket ASC;
-- Expected: <10ms for ~720 rows
```

**Pattern 4: Get active alerts**
```sql
-- Uses partial index: idx_alerts_vehicle_active
SELECT * FROM alerts
WHERE vehicle_id = $1
  AND acknowledged = FALSE
ORDER BY created_at DESC;
-- Expected: <5ms
```

### 3.3 Connection Pool Configuration

```python
# Using SQLAlchemy async with asyncpg
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost:5432/vehicle_health",
    pool_size=20,           # Persistent connections
    max_overflow=10,        # Temporary overflow connections
    pool_timeout=30,        # Wait time for connection from pool
    pool_recycle=3600,      # Recycle connections every hour
    echo=False              # Disable SQL logging in production
)
```

### 3.4 Storage Size Estimates

| Component | Per Vehicle Per Month | 100 Vehicles Per Month |
|-----------|---------------------|----------------------|
| Raw sensor data (1 Hz, compressed) | ~50 MB | ~5 GB |
| Sensor data (uncompressed) | ~500 MB | ~50 GB |
| 1-minute aggregates | ~15 MB | ~1.5 GB |
| Health scores | ~5 MB | ~500 MB |
| Driver profiles | ~1 MB | ~100 MB |
| Alerts + DTCs | ~1 MB | ~100 MB |
| **Total (with compression)** | **~72 MB** | **~7.2 GB** |

---

## 4. Backup & Recovery

### 4.1 Backup Strategy

| Method | Frequency | Retention | Tool |
|--------|-----------|-----------|------|
| Logical backup (pg_dump) | Daily | 30 days | `pg_dump --format=custom` |
| WAL archiving (PITR) | Continuous | 7 days | PostgreSQL WAL archiving |
| Snapshot backup (cloud) | Weekly | 90 days | Cloud provider snapshots |

### 4.2 Recovery Procedures

```bash
# Restore from logical backup
pg_restore --dbname=vehicle_health --clean --if-exists backup_2026-04-05.dump

# Point-in-time recovery (to specific timestamp)
recovery_target_time = '2026-04-05 12:00:00+05:30'
```

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [06 Dataset](06_dataset_and_data_documentation.md) · [07 Backend & API](07_backend_and_api_reference.md)*
