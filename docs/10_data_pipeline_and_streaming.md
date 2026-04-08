# 10 — Data Pipeline & Streaming

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Streaming Architecture, MQTT Pipeline, Real-Time Processing

---

## 1. Streaming Architecture

### 1.1 Overview

The system uses a **publish-subscribe messaging pattern** via MQTT to decouple the data acquisition client (edge device near the vehicle) from the backend processing server. This architecture enables:

- **Asynchronous communication**: The acquisition client doesn't block waiting for backend processing.
- **Multi-consumer support**: Multiple backend services can subscribe to the same data stream.
- **Buffering**: The MQTT broker handles message queuing during temporary disconnections.
- **Scalability**: Additional vehicles simply publish to new topics; backend subscribes to all `vehicle/+/telemetry`.

### 1.2 End-to-End Streaming Flow

```
Vehicle ECU
    │
    │ CAN Bus (ISO 15765-4)
    ▼
ELM327 OBD-II Adapter
    │
    │ Bluetooth / Wi-Fi
    ▼
Acquisition Client (python-OBD)
    │
    │ Parse PIDs → JSON → MQTT Publish
    │ Topic: vehicle/{id}/telemetry
    │ QoS: 1 (At Least Once)
    ▼
MQTT Broker (Mosquitto)
    │
    │ Route to subscribers
    ├──────────────────────────────────────┐
    │                                      │
    ▼                                      ▼
Backend: Data Ingestion Service       Backend: Alert Service
    │                                      │
    │ Validate → Store → Process           │ Real-time threshold checks
    │                                      │
    ├──► PostgreSQL/TimescaleDB            ├──► Dashboard WebSocket
    │                                      │
    ├──► ML Inference Engine               ├──► Email/Push Notifications
    │       ├── Anomaly Detection          │
    │       ├── Health Score               │
    │       ├── Fuel Prediction            │
    │       └── Store Results              │
    │                                      │
    └──► WebSocket Push to Dashboard       │
```

### 1.3 Protocol Comparison: Why MQTT?

| Protocol | Overhead | Latency | IoT Suitability | Complexity | Choice |
|----------|----------|---------|----------------|-----------|--------|
| **MQTT** | Very low (2-byte header) | <100ms | Designed for IoT/constrained devices | Low | ✅ Selected |
| Kafka | High (batch-oriented) | Higher (batching delay) | Overkill for single-vehicle prototype | High | ❌ |
| RabbitMQ | Medium (AMQP protocol) | Low | Good but heavier than MQTT | Medium | ❌ |
| HTTP Polling | High (full HTTP headers) | 1-5 seconds | Poor (wasteful for continuous streams) | Low | ❌ |
| WebSocket Direct | Low | Very Low | Requires persistent connection management | Medium | Used for dashboard only |

MQTT is the ideal choice for vehicle telemetry because:
- Designed for unreliable networks (cellular, Wi-Fi in moving vehicles).
- Extremely lightweight (minimum 2-byte fixed header).
- Built-in QoS levels for message delivery guarantees.
- Built-in Last Will and Testament (LWT) for disconnect detection.
- Supports retained messages (latest sensor snapshot always available).

---

## 2. MQTT Pipeline Design

### 2.1 Broker Configuration

**Broker**: Eclipse Mosquitto 2.x

```
# mosquitto.conf

# Listener for unencrypted connections (development)
listener 1883
protocol mqtt

# Listener for TLS connections (production)
listener 8883
protocol mqtt
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key

# WebSocket listener (for browser-based MQTT clients if needed)
listener 9001
protocol websockets

# Authentication
allow_anonymous false
password_file /etc/mosquitto/passwd

# Persistence (retain messages across broker restarts)
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type all

# Message limits
max_packet_size 10240    # 10 KB max per message
max_queued_messages 1000 # Queue up to 1000 messages per client
```

### 2.2 Topic Hierarchy

```
vehicle/
├── {vehicle_id}/
│   ├── telemetry        # Sensor data stream (1 Hz)
│   ├── dtc              # DTC scan results
│   ├── status           # Connection status (connected/disconnected)
│   ├── command           # Backend → client commands (scan DTC, etc.)
│   └── alerts           # ML-generated alerts
│
├── fleet/
│   └── summary          # Aggregated fleet health (future)
│
└── system/
    └── health           # Broker/system health metrics
```

### 2.3 QoS Levels

| Topic | QoS | Rationale |
|-------|-----|-----------|
| `vehicle/{id}/telemetry` | **1 (At Least Once)** | Acceptable to receive duplicate sensor readings; must not lose data |
| `vehicle/{id}/dtc` | **1** | DTC results must be delivered |
| `vehicle/{id}/status` | **1** | Connection status changes must be delivered |
| `vehicle/{id}/command` | **2 (Exactly Once)** | Commands like "Clear DTCs" must execute exactly once |
| `vehicle/{id}/alerts` | **1** | Alerts must reach dashboard; duplicates filtered by alert_id |

### 2.4 Message Format: Telemetry

```json
{
  "v": 1,
  "ts": "2026-04-05T12:00:00.123Z",
  "sid": "550e8400-e29b-41d4-a716-446655440000",
  "vid": "VH-001",
  "seq": 12345,
  "d": {
    "rpm": 2450.0,
    "spd": 65.0,
    "clt": 92.0,
    "map": 95.0,
    "iat": 28.0,
    "maf": 12.3,
    "tps": 32.5,
    "aat": 30.0,
    "apd": 35.0,
    "ape": 33.0
  }
}
```

**Field abbreviations** (to minimize payload size):

| Full Name | Abbreviation | Bytes Saved |
|-----------|-------------|-------------|
| version | v | — (control field) |
| timestamp | ts | 5 bytes |
| session_id | sid | 5 bytes |
| vehicle_id | vid | 7 bytes |
| sequence | seq | 4 bytes |
| data | d | 2 bytes |
| rpm | rpm | 0 |
| speed | spd | 2 bytes |
| coolant_temp | clt | 8 bytes |
| manifold_pressure | map | 14 bytes |
| intake_temp | iat | 7 bytes |
| maf | maf | 0 |
| throttle | tps | 4 bytes |
| ambient_temp | aat | 8 bytes |
| accel_pedal_d | apd | 13 bytes |
| accel_pedal_e | ape | 13 bytes |

**Estimated payload size**: ~250 bytes per message (vs ~400 bytes with full names).

At 1 Hz → **250 bytes/second** → **900 KB/hour** → **21.6 MB/day** per vehicle.

### 2.5 Last Will and Testament (LWT)

```python
# Acquisition client: set LWT on connect
mqtt_client.will_set(
    topic=f"vehicle/{vehicle_id}/status",
    payload=json.dumps({
        "vid": vehicle_id,
        "status": "disconnected",
        "ts": None  # Broker adds timestamp
    }),
    qos=1,
    retain=True
)

# On successful connection:
mqtt_client.publish(
    topic=f"vehicle/{vehicle_id}/status",
    payload=json.dumps({
        "vid": vehicle_id,
        "status": "connected",
        "ts": datetime.utcnow().isoformat()
    }),
    qos=1,
    retain=True
)
```

If the acquisition client disconnects unexpectedly, the broker automatically publishes the LWT message, allowing the backend and dashboard to update the connection status instantly.

---

## 3. Real-Time Processing Pipeline

### 3.1 Backend MQTT Consumer

```python
# services/acquisition.py

import asyncio
import json
from aiomqtt import Client as MQTTClient

class TelemetryConsumer:
    def __init__(self, broker_host, db, ml_engine, alert_engine, ws_manager):
        self.broker_host = broker_host
        self.db = db
        self.ml = ml_engine
        self.alerts = alert_engine
        self.ws = ws_manager
        self.buffer = {}  # Per-vehicle history buffer
    
    async def start(self):
        async with MQTTClient(self.broker_host) as client:
            await client.subscribe("vehicle/+/telemetry", qos=1)
            await client.subscribe("vehicle/+/status", qos=1)
            await client.subscribe("vehicle/+/dtc", qos=1)
            
            async for message in client.messages:
                topic_parts = message.topic.value.split("/")
                vehicle_id = topic_parts[1]
                msg_type = topic_parts[2]
                
                payload = json.loads(message.payload)
                
                if msg_type == "telemetry":
                    await self.process_telemetry(vehicle_id, payload)
                elif msg_type == "status":
                    await self.process_status(vehicle_id, payload)
                elif msg_type == "dtc":
                    await self.process_dtc(vehicle_id, payload)
    
    async def process_telemetry(self, vehicle_id, payload):
        """Full processing pipeline for each telemetry record."""
        
        # 1. VALIDATE
        is_valid, errors = validate_record(payload["d"])
        if not is_valid:
            logger.warning(f"Invalid record from {vehicle_id}: {errors}")
            return
        
        # 2. STORE raw data
        await self.db.insert_sensor_data(vehicle_id, payload)
        
        # 3. UPDATE history buffer
        if vehicle_id not in self.buffer:
            self.buffer[vehicle_id] = RollingBuffer(size=300)  # 5 min @ 1Hz
        self.buffer[vehicle_id].append(payload["d"])
        
        # 4. ML INFERENCE (async to not block ingestion)
        if self.buffer[vehicle_id].is_ready():
            asyncio.create_task(
                self.run_inference(vehicle_id, payload["d"])
            )
        
        # 5. PUSH to WebSocket subscribers
        await self.ws.broadcast(vehicle_id, {
            "type": "telemetry",
            "data": payload["d"]
        })
    
    async def run_inference(self, vehicle_id, current_data):
        """Run all ML models and process results."""
        history = self.buffer[vehicle_id].get_dataframe()
        
        # Anomaly detection
        anomaly = self.ml.detect_anomaly(current_data, history)
        
        # Health score
        health = self.ml.compute_health_score(current_data, anomaly)
        
        # Fuel efficiency
        fuel = self.ml.predict_fuel(current_data)
        
        # Store results
        await self.db.insert_health_score(vehicle_id, health)
        
        # Evaluate alerts
        alerts = self.alerts.evaluate(health, anomaly)
        for alert in alerts:
            await self.db.insert_alert(vehicle_id, alert)
            await self.ws.broadcast(vehicle_id, {
                "type": "alert",
                "data": alert.to_dict()
            })
        
        # Push ML results to dashboard
        await self.ws.broadcast(vehicle_id, {
            "type": "ml_update",
            "data": {
                "health": health.to_dict(),
                "anomaly": anomaly.to_dict(),
                "fuel": fuel.to_dict()
            }
        })
```

### 3.2 Rolling Buffer Implementation

```python
class RollingBuffer:
    """Maintains a fixed-size rolling window of sensor readings."""
    
    def __init__(self, size=300):
        self.size = size
        self.data = []
    
    def append(self, record):
        self.data.append(record)
        if len(self.data) > self.size:
            self.data.pop(0)
    
    def is_ready(self):
        """Minimum 60 records needed for rolling features."""
        return len(self.data) >= 60
    
    def get_dataframe(self):
        return pd.DataFrame(self.data)
    
    def get_latest(self, n=1):
        return self.data[-n:]
```

### 3.3 Processing Throughput

| Stage | Processing Time | Bottleneck |
|-------|----------------|------------|
| MQTT receive | <1ms | Network |
| JSON parse | <1ms | CPU |
| Validation | <1ms | CPU |
| DB insert (sensor_data) | ~5ms | I/O (database) |
| Buffer update | <1ms | Memory |
| ML inference (all models) | ~500ms | CPU (ML) |
| Alert evaluation | <5ms | CPU |
| WebSocket broadcast | <1ms | Network |
| **Total per record** | **~510ms** | ML inference |

At 1 Hz per vehicle, the backend can handle **~100 simultaneous vehicles** on a 4-core server before ML inference becomes the bottleneck. Solutions for scaling beyond this:
- Batch ML inference (process every 5th record instead of every record).
- Offload ML to GPU or dedicated inference service.
- Horizontal scaling with multiple backend instances and shared MQTT broker.

### 3.4 Backpressure Handling

If the backend falls behind (processing slower than incoming data):

1. **MQTT broker queues messages** (up to `max_queued_messages = 1000` per client).
2. If queue overflows, broker drops oldest messages (QoS 1 allows this).
3. Backend logs warning: "Processing backpressure detected. Queue depth: N".
4. Auto-scaling or batch processing triggered for sustained backpressure.
5. Dashboard shows "Data Delay" indicator if live data is >5 seconds old.

### 3.5 Offline-to-Online Sync

When a vehicle reconnects after being offline:

```
Acquisition Client (reconnected)
    │
    ├── 1. Publish retained status: "connected"
    │
    ├── 2. Publish buffered records from local SQLite
    │       - Add "buffered: true" flag to each record
    │       - Throttle: max 50 records/second (avoid overwhelming backend)
    │       - Maintain chronological order
    │
    ├── 3. Backend detects gap in timestamps
    │       - Flags buffered period in session metadata
    │       - Runs batch ML inference on buffered data
    │
    └── 4. Resume normal 1 Hz streaming
```

---

## 4. WebSocket Management

### 4.1 Server-Side WebSocket Handler

```python
# websocket/live_feed.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class ConnectionManager:
    """Manages WebSocket connections per vehicle."""
    
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, vehicle_id: str, websocket: WebSocket):
        await websocket.accept()
        if vehicle_id not in self.connections:
            self.connections[vehicle_id] = set()
        self.connections[vehicle_id].add(websocket)
    
    def disconnect(self, vehicle_id: str, websocket: WebSocket):
        self.connections[vehicle_id].discard(websocket)
        if not self.connections[vehicle_id]:
            del self.connections[vehicle_id]
    
    async def broadcast(self, vehicle_id: str, data: dict):
        """Send data to all dashboard connections for a vehicle."""
        if vehicle_id not in self.connections:
            return
        disconnected = set()
        for ws in self.connections[vehicle_id]:
            try:
                await ws.send_json(data)
            except:
                disconnected.add(ws)
        for ws in disconnected:
            self.connections[vehicle_id].discard(ws)

# FastAPI WebSocket endpoint
@app.websocket("/ws/vehicle/{vehicle_id}")
async def websocket_endpoint(websocket: WebSocket, vehicle_id: str):
    await manager.connect(vehicle_id, websocket)
    try:
        while True:
            # Keep connection alive; client can send commands
            data = await websocket.receive_text()
            # Handle client messages (e.g., request DTC scan)
    except WebSocketDisconnect:
        manager.disconnect(vehicle_id, websocket)
```

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [03 OBD & Data Acquisition](03_obd_and_data_acquisition.md) · [07 Backend & API](07_backend_and_api_reference.md) · [09 Database](09_database_and_storage.md)*
