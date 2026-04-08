# 08 — Frontend & Dashboard

> **Project**: Intelligent Vehicle Health Monitoring and Predictive Maintenance System  
> **Scope**: Frontend Architecture, UI/UX Design, Dashboard Components, State Management  
> **Demo Implementation**: ECU Guardian (React + TypeScript + Vite + Tailwind CSS v4)

> [!IMPORTANT]
> **Data model alignment note**: The dashboard is designed to display the **10 canonical PIDs from the KIT Automotive OBD-II Dataset** (doc [06](06_dataset_and_data_documentation.md)). The current demo simulator (`ecuSimulator.ts`) was built before the dataset was finalized and uses a slightly different field set. The canonical data contract documented here reflects the **production target** — the dataset PIDs that define the standard set every connected vehicle must support. The simulator will be updated to match this contract in a future sprint.

---

## 1. Frontend Architecture

### 1.1 Technology Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| React 19 | Component-based UI framework, declarative rendering | ^19.0.0 |
| TypeScript (~5.8) | Static typing, interfaces for all data models | ~5.8.2 |
| Vite 6 | Build tool and dev server (HMR, ESM-native) | ^6.2.0 |
| Tailwind CSS v4 | Utility-first styling via `@vitejs/plugin-react` integration | ^4.1.14 |
| Motion (Framer Motion) | Declarative animation library (`motion/react`) | ^12.x |
| Recharts | React-native charting library for time-series data | ^3.x |
| D3.js | Low-level SVG/data utilities underpinning custom gauges | ^7.x |
| Lucide React | React icon library (replaces icon fonts) | ^0.546.0 |
| Firebase Auth | Google Sign-In for user authentication | ^12.x |
| `clsx` / `tailwind-merge` | Dynamic class name utilities | Latest |
| `@google/genai` | Gemini API SDK for AI chat and suggestions | ^1.29.0 |

> **Runtime model**: The dashboard is a **Single Page Application (SPA)** served by Vite's dev server (port 3000) in development and compiled to static assets for production hosting.

### 1.2 Design Philosophy

- **React SPA with TypeScript**: All UI is driven by React functional components and typed props/state — no multi-page HTML files.
- **Component-based decomposition**: Each dashboard panel is an isolated, reusable component (`HUDGauge`, `LiveChart`, `TelemetryPanel`, etc.).
- **Type-safe data contracts**: All OBD-II telemetry, health status, and user profile data are defined as TypeScript interfaces in `src/types.ts`.
- **Animated HUD aesthetic**: `motion/react` drives all transitions — tab switches, gauge fills, alert pulses — for a live aeronautical instrument feel.
- **Dark automotive theme**: Deep charcoal/navy palette inspired by OLED instrument clusters; cyan/amber/red/green accent system for status encoding.
- **Dual-mode data source**: Dashboard toggles between a client-side ECU simulator (`MockOBDSimulator`) and a real OBD-II WebSocket feed without changing UI components.

### 1.3 File Structure

```
ECU-monitoring-main/
├── index.html                   # Vite entry point (SPA shell)
├── vite.config.ts               # Vite + React + Tailwind plugin config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies (React, Vite, Firebase, etc.)
├── .env.example                 # Firebase + Gemini API key template
├── firebase-applet-config.json  # Firebase project config
├── firestore.rules              # Firestore security rules
│
├── public/                      # Static assets (served as-is)
│
└── src/
    ├── main.tsx                 # React root — mounts <App /> into #root
    ├── App.tsx                  # Root component — renders <Dashboard />
    ├── index.css                # Global CSS: design tokens, HUD utilities, animations
    ├── types.ts                 # TypeScript interfaces (TelemetryData, HealthStatus, etc.)
    ├── firebase.ts              # Firebase Auth + Google provider initialization
    │
    ├── components/
    │   ├── Dashboard.tsx        # Main shell: sidebar nav, tab routing, auth state
    │   ├── HUDGauge.tsx         # Reusable SVG circular gauge with threshold colours
    │   ├── LiveChart.tsx        # Recharts-based rolling time-series sparkline
    │   ├── TelemetryPanel.tsx   # "Live Telemetry" tab — OBD-II PID data cards
    │   ├── HealthMonitor.tsx    # "Diagnostics & Health" tab — health score, RUL, faults
    │   ├── DiagnosticsPanel.tsx # "AI Assistant" tab — AI suggestions, driver profile
    │   ├── ChatInterface.tsx    # Floating Gemini AI chat panel
    │   ├── Gauges.tsx           # Additional gauge variants
    │   └── DriverAura.tsx       # Driver behaviour visual indicator
    │
    ├── services/
    │   ├── ecuSimulator.ts      # Client-side OBD-II data simulator (mock mode)
    │   └── geminiService.ts     # Gemini 2.0 Flash API calls for AI suggestions
    │
    └── logic/
        ├── driverBehavior.ts    # K-Means–inspired driver classification (Economical/Moderate/Harsh)
        ├── mlHealth.ts          # Vehicle health score computation algorithm
        └── mileage.ts           # MPG/L-100km calculation from VSS + MAF
```

### 1.4 Canonical Data Contract — `TelemetryData` Interface

The dashboard's core data type is `TelemetryData` (defined in `src/types.ts`). The **production target** aligns this 1:1 with the 10 sensor columns of the KIT Automotive OBD-II Dataset (doc [06](06_dataset_and_data_documentation.md)) plus a timestamp and DTC array:

```typescript
// src/types.ts — Production target (dataset-aligned)
export interface TelemetryData {
  // ── 10 Canonical KIT Dataset PIDs ──────────────────────────
  rpm:                number;  // PID 0x0C — Engine RPM (RPM)
  speed:              number;  // PID 0x0D — Vehicle Speed Sensor (km/h)
  coolantTemp:        number;  // PID 0x05 — Engine Coolant Temperature (°C)
  manifoldPressure:   number;  // PID 0x0B — Intake Manifold Absolute Pressure (kPa)
  intakeAirTemp:      number;  // PID 0x0F — Intake Air Temperature (°C)
  maf:                number;  // PID 0x10 — Mass Air Flow Rate (g/s)
  throttle:           number;  // PID 0x11 — Absolute Throttle Position (%)
  ambientTemp:        number;  // PID 0x46 — Ambient Air Temperature (°C)
  accelPedalD:        number;  // PID 0x49 — Accelerator Pedal Position D (%)
  accelPedalE:        number;  // PID 0x4A — Accelerator Pedal Position E (%)

  // ── Derived / Calculated Fields ─────────────────────────────
  mpgInstant:         number;  // 710.7 × speed(mph) / maf — Instantaneous fuel economy
  rpmDelta:           number;  // rpm[t] - rpm[t-1] — Acceleration/deceleration rate
  speedDelta:         number;  // speed[t] - speed[t-1] — Braking / acceleration events
  pedalImbalance:     number;  // |accelPedalD - accelPedalE| — Sensor health indicator

  // ── Session Metadata ─────────────────────────────────────────
  dtcs:               string[];  // Active Diagnostic Trouble Codes (e.g. ["P0300"])
  timestamp:          number;    // Unix ms timestamp of record
}
```

> [!NOTE]
> The demo simulator (`src/services/ecuSimulator.ts`) was created before the KIT dataset was selected. It uses a slightly different field set (e.g. `vss` instead of `speed`, `engineLoad` instead of `manifoldPressure`, and additional fields like `oilTemp`, `shortTermFuelTrim`, `o2Voltage` that are not in the dataset). These will be aligned in a future update. All documentation below describes the **canonical dataset-aligned target interface**, not the current demo simulator state.

### 1.5 Component Architecture

All views are rendered inside a single `<Dashboard />` component that manages global state and performs tab-based routing using React `useState`:

```tsx
// src/components/Dashboard.tsx (simplified)
type Tab = "overview" | "telemetry" | "diagnostics" | "assistant" | "maintenance";

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [telemetry, setTelemetry] = useState<TelemetryData>(simulateECUData());
  const [health, setHealth] = useState<HealthStatus>({ score: 95, ... });
  ...

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar navigation */}
      <aside> ... </aside>

      {/* Tab content with AnimatePresence transitions */}
      <main>
        <AnimatePresence mode="wait">
          {activeTab === "overview"     && <OverviewTab ... />}
          {activeTab === "telemetry"    && <TelemetryPanel ... />}
          {activeTab === "diagnostics"  && <HealthMonitor ... />}
          {activeTab === "assistant"    && <DiagnosticsPanel ... />}
          {activeTab === "maintenance"  && <MaintenanceTab ... />}
        </AnimatePresence>
      </main>

      {/* Floating chat panel */}
      <ChatInterface isOpen={isChatOpen} ... />
    </div>
  );
};
```

---

## 2. UI/UX Design

### 2.1 Design System

#### Colour Palette

Colours are defined as CSS custom properties in `src/index.css` and **also** registered as Tailwind theme tokens in the `@theme {}` block:

| CSS Variable | Tailwind Token | Hex | Usage |
|---|---|---|---|
| `--bg-deep` | `bg-deep` | `#040608` | Page background |
| `--bg-panel` | `bg-panel` | `#070C12` | Sidebar, top bar background |
| `--bg-card` | `bg-card` | `#0A1018` | Panel/card backgrounds |
| `--bg-elevated` | `bg-elevated` | `#0F1922` | Elevated surfaces |
| `--border` | — | `#1A2535` | Card borders, dividers |
| `--cyan` | `cyan` | `#00D4FF` | Primary accent (RPM gauge, links, active nav) |
| `--cyan-dim` | `cyan-dim` | `#00A0BF` | Muted cyan for borders |
| `--amber` | `amber` | `#FFB800` | Warning states, temperature gauge |
| `--red` | `red` | `#FF3333` | Critical states, fault codes, alerts |
| `--green` | `green` | `#00FF88` | Healthy/ECO states, efficiency metrics |
| `--purple` | `purple` | `#9B5DE5` | Speed gauge, driver profile, AI elements |
| `--text-primary` | — | `#E8F4FF` | Primary text |
| `--text-secondary` | — | `#6B8CAE` | Labels, subtitles |
| `--text-muted` | — | `#344D63` | Dim labels, placeholder text |

#### Typography

Four Google Fonts are loaded via `@import` in `index.css`:

| Font Family | CSS Variable | Usage |
|---|---|---|
| Rajdhani (600, uppercase) | `--font-hud` / `.hud-label` | PID labels, status badges, nav items |
| Share Tech Mono | `--font-mono` / `.hud-value` | Numeric readouts, monospace data |
| Barlow Condensed (700) | `--font-display` / `.hud-display` | Large value displays, section titles |
| Barlow (300–600) | `--font-body` | Body text, descriptions |

#### Spacing System

Tailwind's default spacing scale is used with panel-level padding set inline or via utility classes (e.g., `p-5`, `px-6`, `py-3`, `gap-4`).

### 2.2 Animation & Interaction

Animations are implemented via `motion/react` (Framer Motion) and CSS `@keyframes`:

| Element | Implementation | Duration | Purpose |
|---|---|---|---|
| Tab content transitions | `<AnimatePresence>` + `motion.div` `initial/animate/exit` | 200ms | Smooth cross-fade + x-slide between tabs |
| Login screen entrance | `motion.div` `y: 30 → 0, opacity: 0 → 1` | 600ms ease-out | Premium first-impression |
| Ambient HUD orbs | `motion.div` scale + opacity loop | 6–8s infinite | Atmospheric UI depth |
| Scan line animation | `motion.div` translateY `−5% → 105%` | 5s linear loop | Radar/HUD feel |
| Gauge fills | `motion.div` `animate={{ width }}` | 400ms cubic-bezier | Smooth meter fill updates |
| Status dot pulse | `motion.div` opacity `1 → 0.4 → 1` | 1–1.5s infinite | Live data indicator |
| Alert blink | `@keyframes blink-alert` CSS | 1s infinite | Critical fault code visibility |
| Alert flash | `@keyframes alert-flash` CSS | 1.5s infinite | Red background pulse for fault panels |
| Scan line overlay | `@keyframes scan-line` + `.animate-scan` | 4s linear | HUD scanline effect |

### 2.3 Responsive Layout

The dashboard is designed primarily for **desktop use** (1920×1080 OLED/monitor), reflecting the automotive HUD aesthetic. Layout uses CSS Flexbox:

| Region | CSS | Width |
|---|---|---|
| Left sidebar | `flex-col w-56` | 224px fixed |
| Main content | `flex-1 flex-col overflow-hidden` | Remaining width |
| Overview grid | `grid-cols-12 grid-rows-6` | 12-column CSS grid |

Mobile responsiveness is not the primary focus in the current demo; a full responsive adaptation is planned for the production build.

---

## 3. Dashboard Components

### 3.1 Login Screen

**Trigger**: Shown when `onAuthStateChanged` returns `null` (no authenticated user).

**Elements**:
- Animated background orbs and scan-line (Motion)
- Corner-bracket HUD frame (`.corner-bracket` CSS class)
- "ECU GUARDIAN" heading + feature pills (Real-Time OBD-II, ML Predictions, Driver AI, Fleet Ready)
- "INITIALIZE SESSION" button → `signInWithPopup(auth, googleProvider)` (Firebase Auth)
- Animated error state for failed login

### 3.2 Overview Tab (`activeTab === "overview"`)

**Purpose**: Single-screen HUD showing all critical live metrics — no scrolling required.

**Layout**: `grid-cols-12 grid-rows-6` — 12-column, 6-row CSS grid, zero gap.

| Panel | Grid Area | Component | Dataset Field(s) | PID |
|---|---|---|---|---|
| Engine RPM | col 1–3, row 1–3 | `<HUDGauge>` (0–8000 RPM, cyan) | `telemetry.rpm` | 0x0C |
| Vehicle Speed | col 4–6, row 1–3 | `<HUDGauge>` (0–255 km/h, purple) | `telemetry.speed` | 0x0D |
| Coolant Temp | col 7–9, row 1–3 | `<HUDGauge>` (0–130°C, amber) | `telemetry.coolantTemp` | 0x05 |
| Vehicle Health | col 10–12, row 1–3 | Health score panel + subsystem bars | `health.score`, `health.faults` | — |
| Fuel Efficiency | col 1–4, row 4–6 | MPG display + `<LiveChart>` + throttle/accel stats | `telemetry.mpgInstant` (derived from `speed` + `maf`) | 0x0D + 0x10 |
| Driver Profile | col 5–8, row 4–6 | Behaviour badge + throttle/RPM bars + `<LiveChart>` | `behavior` (Economical/Moderate/Harsh), `telemetry.throttle`, `telemetry.accelPedalD` | 0x11 + 0x49 |
| Fault Codes | col 9–12, row 4–6 | DTC list or "ALL SYSTEMS NOMINAL" | `telemetry.dtcs[]` | Mode 03/07 |

**Subsystem mini-bars** inside the Health panel are driven by:
- **ENGINE**: coolant temperature deviation from normal range (0x05)
- **FUEL SYS**: MAF sensor health and throttle-MAF correlation (0x10 + 0x11)
- **INTAKE**: intake air temperature and manifold pressure (0x0F + 0x0B)
- **OVERALL**: composite `health.score`

### 3.3 HUDGauge Component (`src/components/HUDGauge.tsx`)

**Purpose**: Reusable SVG circular gauge with animated fill and threshold colour logic.

**Props**:
```tsx
interface HUDGaugeProps {
  value: number;
  max: number;
  color: string;      // CSS variable, e.g. "var(--cyan)"
  unit: string;       // Display unit, e.g. "RPM"
  warning?: number;   // Threshold at which colour shifts to amber
  critical?: number;  // Threshold at which colour shifts to red
  size?: number;      // Diameter in px (default 180)
}
```

**Implementation**: SVG `<circle>` with `strokeDasharray` / `strokeDashoffset` calculates fill arc. `motion.div` wraps numeric label for smooth number transitions.

### 3.4 LiveChart Component (`src/components/LiveChart.tsx`)

**Purpose**: Rolling time-series sparkline for any scalar telemetry value.

**Library**: Recharts `<AreaChart>` / `<LineChart>`

**Props**:
```tsx
interface LiveChartProps {
  data: { t: number; v: number }[];   // time index + value pairs
  color: string;                       // stroke colour
  label: string;                       // Y-axis label
  maxPoints?: number;                  // Rolling window size (default 60)
  height?: number;                     // Chart height in px
}
```

Data is sliced to `maxPoints` most recent entries before rendering. No axes rendered for compact sparkline mode; full axes shown when embedded in telemetry panels.

### 3.5 Telemetry Tab (`activeTab === "telemetry"`)

Renders `<TelemetryPanel telemetry={telemetry} history={history} />`.

Displays all dataset-aligned OBD-II PIDs in a scrollable card grid with `<LiveChart>` sparklines. The 10 displayed parameters map exactly to the 10 sensor columns of the KIT Automotive OBD-II Dataset (doc [06](06_dataset_and_data_documentation.md)):

#### Primary Dataset PIDs (10 canonical columns)

| Parameter | Dataset Column | PID | Unit | Normal Range | Chart Colour |
|---|---|---|---|---|---|
| Engine RPM | `rpm` | 0x0C | RPM | 600–4,000 (driving) | Cyan |
| Vehicle Speed | `speed` | 0x0D | km/h | 0–120 | Purple |
| Engine Coolant Temp | `coolant_temp` | 0x05 | °C | 85–100 | Amber |
| Intake Manifold Pressure | `manifold_pressure` | 0x0B | kPa | 30–100 | Green |
| Intake Air Temperature | `intake_temp` | 0x0F | °C | 15–45 | Green |
| MAF (Mass Air Flow) | `maf` | 0x10 | g/s | 2–25 | Purple |
| Throttle Position | `throttle` | 0x11 | % | 0–80 (normal) | Amber |
| Ambient Air Temperature | `ambient_temp` | 0x46 | °C | −10 to 45 | Cyan |
| Accelerator Pedal Position D | `accel_pedal_d` | 0x49 | % | 0–100 | Cyan |
| Accelerator Pedal Position E | `accel_pedal_e` | 0x4A | % | 0–100 | Cyan |

#### Derived Metrics (calculated client-side)

| Derived Parameter | Calculation | Unit | Purpose |
|---|---|---|---|
| Instant Fuel Economy | `710.7 × speed(mph) / maf` | MPG | Efficiency display |
| RPM Delta | `rpm[t] − rpm[t−1]` | RPM/s | Acceleration detection |
| Speed Delta | `speed[t] − speed[t−1]` | km/h/s | Braking event detection |
| Pedal Imbalance | `|accelPedalD − accelPedalE|` | % | Sensor health indicator |
| Gear Proxy | `rpm / speed` (when speed > 5) | RPM/km/h | Estimated gear position |

### 3.6 Diagnostics & Health Tab (`activeTab === "diagnostics"`)

Renders `<HealthMonitor health={health} telemetry={telemetry} history={history} />`.

**Panels**:

| Section | Content | Dataset Field(s) Used |
|---|---|---|
| Health Score | Large numeric `health.score` (0–100) with colour-coded badge: Healthy / Warning / Critical | `coolantTemp` (0x05), `maf` (0x10), `manifoldPressure` (0x0B) |
| ENGINE bar | Thermal health — deviation of `coolantTemp` from 85–100°C normal band | `coolantTemp` (0x05) |
| FUEL SYS bar | MAF and throttle correlation health | `maf` (0x10), `throttle` (0x11) |
| INTAKE bar | Intake air temp deviation from ambient baseline | `intakeAirTemp` (0x0F), `ambientTemp` (0x46) |
| PEDAL HEALTH bar | Sensor D / E imbalance indicator (`|accelPedalD − accelPedalE|`) | `accelPedalD` (0x49), `accelPedalE` (0x4A) |
| Predictions | `health.predictions[]` — ML-derived maintenance forecasts | All parameters |
| Active Faults | `health.faults[]` — fault reason strings derived from ML analysis | All parameters |
| DTC Monitor | `telemetry.dtcs[]` — P-code list with plain-language descriptions | OBD-II Mode 03/07 |

**`HealthStatus` interface**:
```typescript
export interface HealthStatus {
  score: number;             // 0–100 composite vehicle health
  status: "Healthy" | "Warning" | "Critical";
  predictions: string[];    // e.g. ["Coolant system pressure dropping"]
  faults: string[];         // e.g. ["Coolant temperature threshold exceeded"]
}
```

### 3.7 AI Assistant Tab (`activeTab === "assistant"`)

Renders `<DiagnosticsPanel telemetry={telemetry} health={health} behavior={behavior} aiSuggestion={aiSuggestion} />`.

Displays Gemini-generated AI suggestion text, last updated every 30 seconds or immediately on a Critical health state transition. The suggestion is fetched via `getAISuggestions()` in `src/services/geminiService.ts`, which calls the `@google/genai` SDK.

### 3.8 Maintenance Tab (`activeTab === "maintenance"`)

Renders `<MaintenanceTab user={user} health={health} />`.

Displays a static + ML-augmented maintenance schedule:

| Item | Priority | Status |
|---|---|---|
| Brake Inspection | High (red) | Urgent |
| Oil Change | Medium (amber) | Upcoming |
| Tire Rotation | Medium (amber) | Upcoming |
| Air Filter | Low (green) | OK |
| Spark Plugs | Low (green) | OK |

`health.predictions[]` is surfaced at the top as "AI PREDICTIONS" when non-empty.

### 3.9 AI Chat Interface (`<ChatInterface />`)

Floating drawer panel toggled by the "AI CHAT" button in the top bar.

- Conversation history stored in component state as `ChatMessage[]`
- Messages sent to Gemini 2.0 Flash with telemetry context injected into the system prompt
- Role-based rendering: `user` messages right-aligned (cyan border), `model` messages left-aligned (panel style)

---

## 4. State Management

### 4.1 Architecture

State is managed with **React hooks** inside `<Dashboard />`, passed down via **props** to child components. No external state manager (Redux, Zustand, etc.) is used in the current demo.

```
Dashboard (root state owner)
   │
   ├── telemetry: TelemetryData          — current OBD-II snapshot
   ├── history: TelemetryData[]          — rolling 120-record buffer
   ├── behavior: DriverBehavior          — Economical | Moderate | Harsh
   ├── health: HealthStatus             — score, status, predictions, faults
   ├── mileage: number                  — instant MPG
   ├── user: FirebaseUser | null        — Firebase Auth state
   ├── activeTab: Tab                   — current tab
   ├── aiSuggestion: string             — Gemini suggestion text
   ├── isChatOpen: boolean              — chat panel visibility
   ├── isLive: boolean                  — mock vs real OBD toggle
   └── isConnected: boolean             — real OBD connection status
```

### 4.2 Update Loop Frequencies

| Loop | Interval | Logic | Rationale |
|---|---|---|---|
| **Telemetry** | 500ms (2 Hz) | `simulateECUData(prev)` → `setTelemetry` | Smooth UI updates without excessive re-renders |
| **Trip distance** | 500ms (derived) | `totalDistance += vss / 3600` | Accumulated via telemetry loop |
| **Trip timer** | 1000ms (1 Hz) | `setTripTime(elapsed seconds)` | Separate `setInterval` for clock |
| **AI suggestion** | 30 000ms (0.033 Hz) | `getAISuggestions()` | Throttled to avoid excessive Gemini API calls; also fires on Critical state change |
| **Logic recompute** | Every telemetry update | `classifyDriverBehavior`, `analyzeVehicleHealth`, `calculateMileage` | Derived from telemetry via `useEffect([telemetry])` |

### 4.3 Data Flow

```typescript
// 1. Telemetry loop (mock mode)
// NOTE: simulateECUData() is a placeholder that generates the 10 dataset-aligned PIDs
// (rpm, speed, coolantTemp, manifoldPressure, intakeAirTemp, maf, throttle,
//  ambientTemp, accelPedalD, accelPedalE) plus derived metrics.
// In production this interval is replaced by a WebSocket subscription.
setInterval(() => {
  setTelemetry((prev) => {
    const next = simulateECUData(prev);             // src/services/ecuSimulator.ts
    setHistory((h) => [...h.slice(-120), next]);    // rolling 120-record buffer
    setTotalDistance((d) => d + next.speed / 3600); // km accumulation (speed in km/h)
    return next;
  });
}, 500);

// 2. Logic layer — runs on every telemetry update
// All three functions consume only the 10 canonical dataset fields:
useEffect(() => {
  // classifyDriverBehavior: uses rpm, speed, throttle, accelPedalD → K-Means cluster
  const newBehavior = classifyDriverBehavior(telemetry);   // src/logic/driverBehavior.ts

  // analyzeVehicleHealth: uses coolantTemp, maf, manifoldPressure, intakeAirTemp,
  //   accelPedalD, accelPedalE, history → health score + predictions
  const newHealth   = analyzeVehicleHealth(telemetry, history); // src/logic/mlHealth.ts

  // calculateMileage: MPG = 710.7 × speed(mph) / maf
  const newMileage  = calculateMileage(telemetry);         // src/logic/mileage.ts

  setBehavior(newBehavior);
  setHealth(newHealth);
  setMileage(newMileage);
}, [telemetry]);
```

> [!NOTE]
> **Why only these 10 fields?** The KIT OBD-II Dataset (Seat Leon, 2017–2018, 81 trips) defines the standard PID set that every supported vehicle must expose. By targeting only these PIDs, the system works on any post-1996 OBD-II vehicle without vehicle-specific configuration. Additional PIDs (e.g. fuel trim, O2 voltage) can be overlaid when supported but are not required for core ML functionality.

### 4.4 History Buffer

`history` is a `TelemetryData[]` array capped at 120 records (~60 seconds at 2 Hz). It is passed to `<LiveChart>` and `analyzeVehicleHealth()` for trend analysis.

```typescript
setHistory((h) => [...h.slice(-120), next]);
```

### 4.5 Production State Management (Planned)

For a production backend-connected deployment, state transitions from client-side simulation to real-time API consumption:

| Aspect | Current (Demo) | Production |
|---|---|---|
| Data Source | `simulateECUData()` (client-side) | WebSocket `ws://server/ws/vehicle/{id}` |
| ML Inference | `analyzeVehicleHealth()` (client-side logic) | Server-side FastAPI (results pushed via WebSocket) |
| History | React `useState` array (lost on reload) | Database queries via REST API endpoints |
| Authentication | Firebase Auth (Google Sign-In) | Firebase Auth → server JWT validation |
| Multi-vehicle | Single simulated vehicle | Vehicle selector → vehicle-scoped API calls |
| Chat context | Local telemetry state injected into Gemini prompt | Server-enriched context with full session history |

**Migration path**: Replace the `simulateECUData` interval with a `useWebSocket` hook that connects to the backend. All child components remain unchanged — they only consume `telemetry` and `health` props regardless of data origin.

---

## 5. CSS Architecture

### 5.1 Global Stylesheets

`src/index.css` is the single global stylesheet, it:

1. **Imports Google Fonts** — Rajdhani, Share Tech Mono, Barlow Condensed, Barlow
2. **Imports Tailwind** — `@import "tailwindcss"` (Tailwind v4 syntax)
3. **Registers custom theme tokens** — `@theme { ... }` block maps CSS variables to Tailwind classes
4. **Defines design tokens** — `--cyan`, `--amber`, `--red`, etc. via `:root { ... }`
5. **Defines utility CSS classes** — HUD-specific classes not expressible as Tailwind utilities

### 5.2 Key CSS Classes

| Class | Purpose | Key Properties |
|---|---|---|
| `.panel` | Card/panel container | `background: var(--bg-card)`, `border: 1px solid var(--border)`, top gradient highlight `::before` |
| `.panel-amber` / `.panel-red` / `.panel-green` | Colour-variant panels | Override `::before` gradient colour |
| `.corner-bracket` | HUD frame brackets | `::before`/`::after` pseudo-elements with 12px L-shaped borders |
| `.hud-label` | Status label text | Rajdhani 600, uppercase, 0.15em letter-spacing, 0.65rem |
| `.hud-value` | Numeric readout text | Share Tech Mono, `var(--text-primary)` |
| `.hud-display` | Large display text | Barlow Condensed 700, 0.05em letter-spacing |
| `.btn-hud` | HUD-style button | Rajdhani 700, uppercase, border, shimmer `::before` hover effect |
| `.btn-cyan` / `.btn-amber` / `.btn-red` | Colour-variant buttons | Coloured border + background + hover glow |
| `.nav-item` | Sidebar nav button | Rajdhani 600, uppercase, active left-border indicator |
| `.meter-track` | Progress bar background | `rgba(255,255,255,0.04)` + border |
| `.meter-fill` | Progress bar fill | Width transition, white-dot leading edge (`::after`) |
| `.glow-cyan` / `.glow-amber` / etc. | Box-shadow glow | Coloured drop shadows |
| `.text-glow-*` | Text glow effect | `text-shadow` with colour |
| `.grid-bg` | Grid background texture | `repeating-linear-gradient` cyan cross-hatch |
| `.alert-flash` | Critical alert background | `@keyframes alert-flash` red pulse |
| `.scanlines` | CRT scanline overlay | `repeating-linear-gradient` cyan scan stripes |
| `.scroll-area` | Styled scrollable container | Thin `var(--cyan-dim)` scrollbar |
| `.animate-blink` | Blinking element | `@keyframes blink-alert` 1s infinite |
| `.animate-scan` | Scanning line | `@keyframes scan-line` 4s linear |
| `.animate-data-tick` | Data activity pulse | `@keyframes data-tick` 2s ease |

### 5.3 Tailwind Integration

Tailwind v4 is loaded via `@vitejs/plugin-react` and `@tailwindcss/vite` plugin (configured in `vite.config.ts`). All layout, spacing, and grid utilities are Tailwind classes applied directly in JSX:

```tsx
// Example from Dashboard.tsx
<div className="flex h-screen overflow-hidden">
  <aside className="flex flex-col w-56 border-r relative z-20">
  ...
  <div className="h-full grid grid-cols-12 grid-rows-6 gap-0 p-0">
```

Custom token classes (e.g., `bg-deep`, `text-cyan`) are registered via the `@theme {}` block in `index.css` and are injected into Tailwind's token system.

---

## 6. Authentication

Firebase Authentication with Google Sign-In is implemented in `src/firebase.ts` and consumed in `<Dashboard />`:

```typescript
// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// src/components/Dashboard.tsx
const handleLogin = () => signInWithPopup(auth, googleProvider);
const handleLogout = () => signOut(auth);

useEffect(() => {
  return onAuthStateChanged(auth, (u) => {
    setUser(u);
    setIsAuthReady(true);
  });
}, []);
```

The login screen is rendered when `user === null` and `isAuthReady === true`. Until `isAuthReady` is true, nothing is rendered (avoids flash of login screen on page refresh).

---

## 7. AI Integration (Gemini)

The `src/services/geminiService.ts` module uses `@google/genai` to call Gemini 2.0 Flash:

```typescript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getAISuggestions(
  telemetry: TelemetryData,
  behavior: DriverBehavior,
  health: HealthStatus
): Promise<string> {
  const prompt = buildPromptWithContext(telemetry, behavior, health);
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  return response.text ?? "No suggestion available.";
}
```

**Throttling**: AI suggestions are only requested if ≥30 seconds have elapsed since the last call, or if `health.status` transitions to `"Critical"` unexpectedly (see `lastAiUpdate` ref in `Dashboard.tsx`).

---

*Cross-references: [02 System Architecture](02_system_architecture_and_design.md) · [07 Backend & API](07_backend_and_api_reference.md) · [11 Monitoring & Security](11_monitoring_logging_and_security.md)*
