# 03 — OBD-II & Data Acquisition

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: OBD-II Protocols, PIDs, Data Acquisition Pipeline, Edge Device Design, Simulation Environment

---

## 1. OBD-II Protocol Reference

### 1.1 Historical Context

On-Board Diagnostics (OBD) has evolved through several generations:

| Generation | Year | Key Characteristics |
|-----------|------|-------------------|
| OBD-I | 1980s | Proprietary, manufacturer-specific, inconsistent |
| OBD-II | 1996 (US mandate) | Standardized 16-pin DLC, unified PIDs, CAN bus |
| EOBD | 2001 (EU mandate) | European equivalent of OBD-II |
| OBD-III | Proposed | Remote telemetry for emissions compliance |

OBD-II became mandatory for all vehicles sold in the US from **January 1, 1996** and for petrol cars in the EU from **2001** (diesel from 2004). India mandated BS-IV compliance (includes OBD-II capability) from **April 2017** nationwide.

### 1.2 OBD-II Communication Protocols

The OBD-II standard supports five signaling protocols. A vehicle uses exactly one:

| Protocol | Standard | Speed | Common In |
|----------|----------|-------|-----------|
| **CAN** (Controller Area Network) | ISO 15765-4 | 250/500 kbps | Post-2008 vehicles (dominant) |
| ISO 9141-2 | ISO 9141-2 | 10.4 kbps | European vehicles (2000–2007) |
| KWP2000 (Keyword Protocol) | ISO 14230-4 | 10.4 kbps | European/Asian vehicles |
| SAE J1850 VPW | SAE J1850 | 10.4 kbps | GM vehicles |
| SAE J1850 PWM | SAE J1850 | 41.6 kbps | Ford vehicles |

**This system targets** ISO 15765-4 (CAN) as the primary protocol, which covers >95% of vehicles manufactured after 2008.

### 1.3 OBD-II Connector (DLC)

The Data Link Connector (DLC) conforms to **SAE J1962**:

| Pin | Function |
|-----|----------|
| 2 | SAE J1850 Bus+ |
| 4 | Chassis Ground |
| 5 | Signal Ground |
| 6 | CAN High (ISO 15765-4) |
| 7 | ISO 9141-2 / ISO 14230-4 K-Line |
| 10 | SAE J1850 Bus- |
| 14 | CAN Low (ISO 15765-4) |
| 15 | ISO 9141-2 / ISO 14230-4 L-Line |
| 16 | Battery Power (+12V) |

The DLC is typically located within 60 cm of the steering column, below the dashboard on the driver's side.

### 1.4 OBD-II Diagnostic Modes

| Mode | Service ID | Purpose | Used in This System |
|------|-----------|---------|-------------------|
| **Mode 01** | 0x01 | Show current (live) data | ✅ Primary — real-time sensor polling |
| Mode 02 | 0x02 | Show freeze frame data | ❌ Not used |
| **Mode 03** | 0x03 | Show stored Diagnostic Trouble Codes | ✅ DTC retrieval |
| Mode 04 | 0x04 | Clear DTCs and stored values | ⚠️ Only with explicit user confirmation |
| Mode 05 | 0x05 | Oxygen sensor test results | ❌ Not used |
| Mode 06 | 0x06 | On-board monitoring test results | ❌ Not used |
| **Mode 07** | 0x07 | Show pending DTCs | ✅ Pending DTC retrieval |
| Mode 08 | 0x08 | Control on-board systems | ❌ Never used (safety constraint) |
| Mode 09 | 0x09 | Vehicle information (VIN) | Optional — VIN retrieval |
| Mode 0A | 0x0A | Permanent DTCs | ❌ Not used |

---

## 2. Parameter IDs (PIDs) Used

### 2.1 Core PIDs from Dataset

The system's primary dataset (KIT Automotive OBD-II Dataset) contains 10 sensor columns, all from **Mode 01**:

| PID (Hex) | PID (Dec) | Parameter Name | Unit | Formula | Min | Max | Bytes |
|-----------|-----------|---------------|------|---------|-----|-----|-------|
| 0x05 | 5 | Engine Coolant Temperature | °C | `A - 40` | -40 | 215 | 1 |
| 0x0B | 11 | Intake Manifold Absolute Pressure | kPa | `A` | 0 | 255 | 1 |
| 0x0C | 12 | Engine RPM | RPM | `(256A + B) / 4` | 0 | 16,383.75 | 2 |
| 0x0D | 13 | Vehicle Speed Sensor | km/h | `A` | 0 | 255 | 1 |
| 0x0F | 15 | Intake Air Temperature | °C | `A - 40` | -40 | 215 | 1 |
| 0x10 | 16 | Air Flow Rate (MAF Sensor) | g/s | `(256A + B) / 100` | 0 | 655.35 | 2 |
| 0x11 | 17 | Absolute Throttle Position | % | `(100/255) × A` | 0 | 100 | 1 |
| 0x46 | 70 | Ambient Air Temperature | °C | `A - 40` | -40 | 215 | 1 |
| 0x49 | 73 | Accelerator Pedal Position D | % | `(100/255) × A` | 0 | 100 | 1 |
| 0x4A | 74 | Accelerator Pedal Position E | % | `(100/255) × A` | 0 | 100 | 1 |

### 2.2 Additional PIDs (Acquired via Live OBD-II)

Beyond the dataset columns, live acquisition may poll additional PIDs:

| PID | Parameter | Unit | Purpose |
|-----|-----------|------|---------|
| 0x04 | Calculated Engine Load | % | Engine stress monitoring |
| 0x06 | Short-term Fuel Trim (Bank 1) | % | Fuel system health |
| 0x07 | Long-term Fuel Trim (Bank 1) | % | Fuel system degradation |
| 0x0E | Timing Advance | ° before TDC | Engine timing health |
| 0x1F | Run Time Since Engine Start | seconds | Session duration |
| 0x2F | Fuel Tank Level Input | % | Fuel level (if available) |
| 0x42 | Control Module Voltage | V | Battery voltage |

### 2.3 PID Normal Operating Ranges

These ranges define "healthy" baselines for anomaly detection thresholds:

| Parameter | Normal Range | Warning Range | Critical Range |
|-----------|-------------|---------------|----------------|
| Engine Coolant Temp | 85–100 °C | 100–110 °C | >110 °C |
| Engine RPM (idle) | 600–1,000 RPM | — | >6,000 RPM (sustained) |
| Engine RPM (driving) | 1,000–4,000 RPM | 4,000–5,500 RPM | >5,500 RPM |
| Vehicle Speed | 0–120 km/h | 120–160 km/h | >160 km/h |
| Intake Air Temp | 15–45 °C | 45–60 °C | >60 °C |
| Throttle Position | 0–80% | — | 100% (sustained) |
| MAF | 2–25 g/s | — | >35 g/s (engine size dep.) |
| Intake Manifold Pressure | 30–100 kPa | — | — |
| Battery Voltage | 13.5–14.5 V | 12.8–13.5 V | <12.0 V |

---

## 3. Data Acquisition Pipeline

### 3.1 Pipeline Overview

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────┐
│ Vehicle  │    │   ELM327     │    │  python-OBD  │    │  MQTT Broker  │    │ Backend  │
│ ECU      │───►│   Adapter    │───►│  Client      │───►│  (Mosquitto)  │───►│ Server   │
└──────────┘    └──────────────┘    └──────────────┘    └───────────────┘    └──────────┘
  CAN Bus         BT/Wi-Fi           Parse + JSON         Pub/Sub             Validate +
  (ISO 15765-4)   (SPP/TCP)          Structured            Topic-based         Process
```

### 3.2 Step-by-Step Data Flow

**Step 1: ELM327 Initialization**
```
Host → ELM327: ATZ          (Reset)
ELM327 → Host: ELM327 v1.5
Host → ELM327: AT SP 0      (Set Protocol: Auto)
ELM327 → Host: OK
Host → ELM327: AT E0         (Echo Off)
ELM327 → Host: OK
Host → ELM327: AT L0         (Linefeed Off)
ELM327 → Host: OK
Host → ELM327: AT H0         (Headers Off, or H1 for multi-ECU)
ELM327 → Host: OK
```

**Step 2: PID Polling Loop**
```python
import obd

connection = obd.OBD("/dev/rfcomm0")  # or Bluetooth address

# Define polling list
pids = [
    obd.commands.RPM,
    obd.commands.SPEED,
    obd.commands.COOLANT_TEMP,
    obd.commands.THROTTLE_POS,
    obd.commands.MAF,
    obd.commands.INTAKE_TEMP,
    obd.commands.INTAKE_PRESSURE,
    obd.commands.AMBIANT_AIR_TEMP,           # PID 0x46
    obd.commands.ACCELERATOR_POS_D,          # PID 0x49
    obd.commands.ACCELERATOR_POS_E,          # PID 0x4A
]

while True:
    record = {"timestamp": datetime.utcnow().isoformat()}
    for pid in pids:
        response = connection.query(pid)
        if not response.is_null():
            record[pid.name] = response.value.magnitude
        else:
            record[pid.name] = None  # Graceful handling of unsupported PID
    
    # Publish to MQTT
    mqtt_client.publish(
        topic=f"vehicle/{vehicle_id}/telemetry",
        payload=json.dumps(record),
        qos=1
    )
    
    time.sleep(1.0)  # 1 Hz polling rate
```

**Step 3: Unsupported PID Handling**

Not all PIDs are supported by all vehicles. The system handles this gracefully:

```python
# On connection, discover supported PIDs
supported = connection.supported_commands

# Filter polling list to only supported PIDs
active_pids = [pid for pid in desired_pids if pid in supported]

# Log unsupported PIDs
unsupported = set(desired_pids) - set(active_pids)
for pid in unsupported:
    logger.warning(f"PID {pid.name} not supported by this vehicle. Skipping.")
```

**Step 4: Data Validation (Backend Side)**

```python
VALIDATION_RULES = {
    "rpm":          {"type": float, "min": 0,    "max": 16384},
    "speed":        {"type": float, "min": 0,    "max": 255},
    "coolant_temp": {"type": float, "min": -40,  "max": 215},
    "throttle":     {"type": float, "min": 0,    "max": 100},
    "maf":          {"type": float, "min": 0,    "max": 655.35},
    "intake_temp":  {"type": float, "min": -40,  "max": 215},
    "manifold_pressure": {"type": float, "min": 0, "max": 255},
    "ambient_temp": {"type": float, "min": -40,  "max": 215},
    "accel_pedal_d": {"type": float, "min": 0,   "max": 100},
    "accel_pedal_e": {"type": float, "min": 0,   "max": 100},
}

def validate_record(record: dict) -> tuple[bool, list]:
    errors = []
    for field, rules in VALIDATION_RULES.items():
        value = record.get(field)
        if value is None:
            continue  # Unsupported PID, acceptable
        if not isinstance(value, rules["type"]):
            errors.append(f"{field}: type error (expected {rules['type'].__name__})")
        elif value < rules["min"] or value > rules["max"]:
            errors.append(f"{field}: out of range [{rules['min']}, {rules['max']}], got {value}")
    return len(errors) == 0, errors
```

### 3.3 MQTT Topic Structure

| Topic Pattern | Direction | Payload | QoS |
|--------------|-----------|---------|-----|
| `vehicle/{id}/telemetry` | Client → Broker → Backend | JSON sensor record | 1 (At least once) |
| `vehicle/{id}/dtc` | Client → Broker → Backend | JSON DTC array | 1 |
| `vehicle/{id}/status` | Client → Broker → Backend | Connection status (connected/disconnected) | 1 |
| `vehicle/{id}/command` | Backend → Broker → Client | Commands (scan DTC, clear DTC) | 2 (Exactly once) |
| `vehicle/{id}/alerts` | Backend → Broker → Dashboard | Alert notifications | 1 |

### 3.4 MQTT Payload Schema

```json
{
  "timestamp": "2026-04-05T12:00:00.000Z",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_id": "VH-001",
  "sequence": 12345,
  "data": {
    "rpm": 2450.0,
    "speed": 65.0,
    "coolant_temp": 92.0,
    "manifold_pressure": 95.0,
    "intake_temp": 28.0,
    "maf": 12.3,
    "throttle": 32.5,
    "ambient_temp": 30.0,
    "accel_pedal_d": 35.0,
    "accel_pedal_e": 33.0
  }
}
```

---

## 4. Edge Device Design

### 4.1 Primary Configuration: Laptop/Desktop

For development and demonstration, the acquisition client runs on a laptop:

| Component | Detail |
|-----------|--------|
| Device | Developer laptop (Windows/Linux/macOS) |
| OBD-II Adapter | ELM327 Bluetooth 2.0+ or Wi-Fi |
| Runtime | Python ≥3.10 |
| Libraries | `python-OBD`, `paho-mqtt`, `json`, `time` |
| Connectivity | Wi-Fi (to MQTT broker) or localhost |

### 4.2 Alternative Configuration: Raspberry Pi (Future)

For always-connected in-vehicle deployment:

| Component | Detail |
|-----------|--------|
| Device | Raspberry Pi 4B (4GB RAM) |
| OS | Raspberry Pi OS Lite (headless) |
| OBD-II Adapter | ELM327 Bluetooth or USB-OBD cable |
| Power | 12V → 5V converter from OBD-II pin 16 or cigarette lighter |
| Connectivity | 4G LTE USB dongle or tethered to phone hotspot |
| Storage | microSD 32GB (local buffer when offline) |
| Software | Python acquisition client, runs as systemd service |

### 4.3 Offline Buffering Strategy

When internet connectivity is lost:

1. Acquisition client continues polling OBD-II at normal rate.
2. Records are buffered to a **local SQLite database** on the edge device.
3. Buffer rotation: oldest records overwritten when buffer exceeds configured size (default: 10,000 records ≈ 2.7 hours @ 1 Hz).
4. On connectivity restoration, buffered records are published to MQTT in chronological order with `buffered: true` flag.
5. Backend processes buffered records normally but timestamps them as delayed.

---

## 5. Simulation Environment Design

### 5.1 Why Simulation?

This project uses an OBD-II emulator during development instead of a physical vehicle because:
- Physical vehicle availability is limited during academic development.
- Emulators provide repeatable, controllable test conditions.
- Edge cases (overheating, sensor failure, anomalies) can be simulated on demand.
- No risk to actual vehicle electronics during testing.

### 5.2 Emulator Options

| Emulator | Type | Platform | OBD Protocol | Connects To |
|----------|------|----------|-------------|-------------|
| **ELM327 Emulator (OBDSim)** | Software | Linux/Windows | ELM327 AT commands over virtual serial port | `python-OBD` via virtual COM port |
| **OBD Auto Doctor Simulator** | Software | iOS/Android | Bluetooth | Mobile OBD apps |
| **NEXUS AI Mock Simulator** | Custom JavaScript | Browser | N/A (internal) | Dashboard directly (current prototype) |
| **freediag** | Software | Linux | Multiple protocols | python-OBD |

### 5.3 Current Prototype: JavaScript Mock OBD Simulator

The current implementation (`script.js`) includes a `MockOBDSimulator` class that generates realistic sensor data patterns:

```javascript
class MockOBDSimulator {
    constructor() {
        this.state = {
            rpm: 1000,
            speed: 0,
            throttle: 0,
            load: 20,
            coolant: 90,
            battery: 13.8,
            fuelEff: 8.5  // L/100km
        };
        this.target = { ...this.state };
        this.isAccelerating = false;
    }
    
    tick() {
        // Stochastic acceleration/deceleration cycling
        if (Math.random() > 0.95) {
            this.isAccelerating = !this.isAccelerating;
        }
        
        // Correlated parameter updates
        if (this.isAccelerating) {
            this.target.throttle = Math.min(this.target.throttle + 2, 85);
            this.target.rpm = Math.min(this.target.rpm + 60, 5500);
            this.target.speed = Math.min(this.target.speed + 0.8, 140);
            this.target.load = Math.min(this.target.load + 1.5, 95);
        }
        
        // Smooth transitions via linear interpolation
        this.state.rpm = lerp(this.state.rpm, this.target.rpm, 0.08);
        
        // Thermal model: high load → rising coolant temp
        if (this.state.load > 70) this.target.coolant += 0.02;
        else this.target.coolant = Math.max(this.target.coolant - 0.01, 88);
    }
}
```

**Key simulation features**:
- **Correlated parameters**: Throttle increase → RPM increase → Speed increase → Load increase (physically realistic).
- **Thermal dynamics**: Sustained high load raises coolant temperature; low load causes gradual cooling.
- **Stochastic transitions**: Random acceleration/deceleration cycling mimics real driving patterns.
- **Linear interpolation smoothing**: Prevents unrealistic sudden jumps in parameter values.
- **History tracking**: Rolling buffer of 100 data points for trend analysis.

### 5.4 Python-Based OBD-II Emulator (For Backend Testing)

For testing the full Python backend pipeline without a vehicle, a virtual serial port emulator can be configured:

```bash
# Linux: socat creates a virtual serial port pair
socat -d -d pty,raw,echo=0 pty,raw,echo=0
# Creates /dev/pts/3 and /dev/pts/4

# Run OBD emulator on one end
python obd_emulator.py --port /dev/pts/3

# Connect python-OBD to the other end
connection = obd.OBD("/dev/pts/4")
```

#### Emulator Response Table

The emulator responds to AT commands and PID queries like a real ELM327:

| Request | Response | Meaning |
|---------|----------|---------|
| `ATZ` | `ELM327 v1.5` | Reset |
| `AT SP 0` | `OK` | Auto protocol |
| `010C` | `41 0C 0B B8` | RPM = (0x0B × 256 + 0xB8) / 4 = 750 RPM |
| `010D` | `41 0D 3C` | Speed = 0x3C = 60 km/h |
| `0105` | `41 05 73` | Coolant = 0x73 - 40 = 75°C |
| `0111` | `41 11 33` | Throttle = (0x33/255) × 100 = 20% |
| `0110` | `41 10 01 F4` | MAF = (0x01 × 256 + 0xF4) / 100 = 5.0 g/s |

### 5.5 Scenario-Based Testing

The emulator supports predefined driving scenarios for comprehensive testing:

| Scenario | Duration | Description | Tests |
|----------|----------|-------------|-------|
| `cold_start` | 5 min | Engine warming from 20°C to 90°C, idle RPM stabilization | Thermal monitoring, idle detection |
| `city_driving` | 15 min | Stop-and-go traffic, 0–60 km/h, frequent braking | Driver behaviour classification, fuel efficiency |
| `highway_cruise` | 10 min | Steady 100–120 km/h, stable RPM ~2,500 | Baseline health score, ECO driving detection |
| `aggressive_driving` | 8 min | Rapid acceleration, high RPM (>5,000), hard braking | Anomaly detection, AGGRESSIVE classification |
| `overheat_event` | 5 min | Coolant temp rising to 110°C+ under sustained load | Thermal anomaly detection, critical alert generation |
| `sensor_dropout` | 3 min | Random PID values become null (simulating disconnection) | Graceful PID unavailability handling |
| `mixed_route` | 30 min | Combined city → highway → city with varied driving | Full pipeline integration test |

---

## 6. DTC (Diagnostic Trouble Code) Reference

### 6.1 DTC Code Structure

OBD-II DTCs follow SAE J2012 format: **1 letter + 4 digits**

```
P 0 3 0 0
│ │ │ │ │
│ │ │ └─┤── Specific fault number
│ │ └────── Subsystem (3 = Ignition)
│ └──────── 0 = SAE standard, 1 = Manufacturer specific
└────────── System category
```

| Prefix | System |
|--------|--------|
| P | Powertrain (engine + transmission) |
| B | Body (airbags, AC, etc.) |
| C | Chassis (ABS, stability) |
| U | Network / communication |

### 6.2 Common DTCs Relevant to Health Monitoring

| DTC | Description | Severity | System | Recommended Action |
|-----|------------|----------|--------|-------------------|
| P0300 | Random/Multiple Cylinder Misfire Detected | Critical | Ignition | Check spark plugs, ignition coils |
| P0171 | System Too Lean (Bank 1) | Warning | Fuel | Check for vacuum leaks, MAF sensor |
| P0172 | System Too Rich (Bank 1) | Warning | Fuel | Check fuel injectors, oxygen sensors |
| P0420 | Catalyst System Efficiency Below Threshold | Warning | Emission | Check catalytic converter |
| P0128 | Coolant Thermostat Below Regulating Temperature | Warning | Cooling | Replace thermostat |
| P0507 | Idle Air Control System RPM Higher Than Expected | Advisory | Idle | Clean IAC valve |
| P0101 | Mass Air Flow Circuit Range/Performance | Warning | Fuel | Clean or replace MAF sensor |
| P0113 | Intake Air Temperature Sensor Circuit High | Warning | Sensor | Check IAT sensor wiring |
| P0131 | O2 Sensor Circuit Low Voltage (Bank 1, Sensor 1) | Warning | Emission | Replace O2 sensor |
| P0700 | Transmission Control System Malfunction | Critical | Transmission | Professional diagnosis required |

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [04 ML Pipeline](04_ml_pipeline_overview.md) · [06 Dataset](06_dataset_and_data_documentation.md)*
