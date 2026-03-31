import React from "react";
import { motion } from "motion/react";
import { TelemetryData } from "../types";
import { LiveChart, MultiLineChart } from "./LiveChart";
import { Thermometer, Wind, Zap, Droplets, Activity } from "lucide-react";
import { calculateMileage } from "../logic/mileage";

interface TelemetryPanelProps {
  telemetry: TelemetryData;
  history: TelemetryData[];
}

// ─── PARAM ROW ────────────────────────────────────────────────
const ParamRow: React.FC<{
  label: string; value: string | number; unit?: string;
  color: string; pct: number; alert?: boolean;
}> = ({ label, value, unit = "", color, pct, alert }) => (
  <div className={`px-4 py-2.5 border-b flex items-center gap-4 ${alert ? "alert-flash" : ""}`}
    style={{ borderColor: "var(--border)" }}>
    <div className="w-32 hud-label text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</div>
    <div className="w-20 text-right" style={{ fontFamily: "Share Tech Mono", fontSize: 13, color: alert ? "var(--red)" : color }}>
      {value}<span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>
    </div>
    <div className="flex-1 meter-track h-1.5 rounded-none">
      <motion.div className="meter-fill rounded-none"
        style={{ background: alert ? "var(--red)" : color, width: `${Math.min(100, pct)}%`, boxShadow: `0 0 6px ${alert ? "var(--red)" : color}66` }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.4 }} />
    </div>
  </div>
);

// ─── MINI CARD ────────────────────────────────────────────────
const MiniCard: React.FC<{ icon: any; label: string; value: string; sub?: string; color: string; chartData?: { t: number; v: number }[] }> =
  ({ icon: Icon, label, value, sub, color, chartData }) => (
    <div className="panel p-4 flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="hud-label text-[10px]">{label}</span>
        </div>
        {sub && <span className="hud-label text-[9px]" style={{ color: "var(--text-muted)" }}>{sub}</span>}
      </div>
      <div className="text-xl font-bold" style={{ fontFamily: "Share Tech Mono", color, textShadow: `0 0 10px ${color}66` }}>
        {value}
      </div>
      {chartData && (
        <div className="mt-1">
          <LiveChart data={chartData} color={color} label={label} height={36} showGrid={false} maxPoints={40} />
        </div>
      )}
    </div>
  );

// ─── PANEL ────────────────────────────────────────────────────
export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry, history }) => {
  const hist = (key: keyof TelemetryData) =>
    history.map((h, i) => ({ t: i, v: Number(h[key]) || 0 }));

  return (
    <div className="h-full grid grid-cols-12 gap-0 overflow-hidden" style={{ background: "var(--bg-deep)" }}>

      {/* ── Left: Param table */}
      <div className="col-span-4 border-r flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>LIVE OBD-II PARAMETERS</div>
          <div className="hud-label text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date(telemetry.timestamp).toLocaleTimeString()} · 2Hz REFRESH
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area">
          <ParamRow label="ENGINE RPM" value={telemetry.rpm} unit="rpm" color="var(--cyan)" pct={(telemetry.rpm / 7000) * 100} alert={telemetry.rpm > 6000} />
          <ParamRow label="VEHICLE SPEED" value={telemetry.vss} unit="km/h" color="var(--purple)" pct={(telemetry.vss / 240) * 100} />
          <ParamRow label="ENGINE LOAD" value={telemetry.engineLoad} unit="%" color="var(--amber)" pct={telemetry.engineLoad} alert={telemetry.engineLoad > 90} />
          <ParamRow label="THROTTLE POS" value={telemetry.throttle} unit="%" color="var(--cyan)" pct={telemetry.throttle} />
          <ParamRow label="COOLANT TEMP" value={telemetry.coolantTemp} unit="°C" color="var(--amber)" pct={(telemetry.coolantTemp / 130) * 100} alert={telemetry.coolantTemp > 105} />
          <ParamRow label="OIL TEMP" value={telemetry.oilTemp} unit="°C" color="var(--amber)" pct={(telemetry.oilTemp / 150) * 100} alert={telemetry.oilTemp > 115} />
          <ParamRow label="INTAKE AIR" value={telemetry.intakeAirTemp} unit="°C" color="var(--cyan)" pct={(telemetry.intakeAirTemp / 60) * 100} />
          <ParamRow label="MASS AIR FLOW" value={telemetry.maf} unit="g/s" color="var(--green)" pct={(telemetry.maf / 30) * 100} />
          <ParamRow label="O2 VOLTAGE" value={telemetry.o2Voltage.toFixed(2)} unit="V" color="var(--purple)" pct={(telemetry.o2Voltage / 1) * 100} />
          <ParamRow label="ST FUEL TRIM" value={`${telemetry.shortTermFuelTrim > 0 ? "+" : ""}${telemetry.shortTermFuelTrim.toFixed(1)}`} unit="%" color={Math.abs(telemetry.shortTermFuelTrim) > 10 ? "var(--red)" : "var(--green)"} pct={50 + telemetry.shortTermFuelTrim * 2.5} alert={Math.abs(telemetry.shortTermFuelTrim) > 10} />
          <ParamRow label="LT FUEL TRIM" value={`${telemetry.longTermFuelTrim > 0 ? "+" : ""}${telemetry.longTermFuelTrim.toFixed(1)}`} unit="%" color={Math.abs(telemetry.longTermFuelTrim) > 8 ? "var(--amber)" : "var(--green)"} pct={50 + telemetry.longTermFuelTrim * 2.5} />
          <ParamRow label="BRAKE SW" value={telemetry.brakeSwitch ? "ACTIVE" : "OFF"} color={telemetry.brakeSwitch ? "var(--red)" : "var(--green)"} pct={telemetry.brakeSwitch ? 100 : 0} />
          <ParamRow label="EFFICIENCY" value={calculateMileage(telemetry)} unit="MPG" color="var(--green)" pct={(calculateMileage(telemetry) / 60) * 100} />
        </div>
      </div>

      {/* ── Center: Charts */}
      <div className="col-span-5 border-r flex flex-col overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>REAL-TIME WAVEFORMS</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area p-4 space-y-4">
          {/* RPM + VSS combined */}
          <div className="panel p-3" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>RPM / SPEED CORRELATION</div>
            <MultiLineChart
              data={history.map((h, i) => ({ t: i, rpm: h.rpm / 70, spd: h.vss }))}
              series={[
                { key: "rpm", color: "var(--cyan)", label: "RPM÷70" },
                { key: "spd", color: "var(--purple)", label: "KM/H" },
              ]}
              height={90} maxPoints={60}
            />
          </div>

          {/* Temperature */}
          <div className="panel p-3" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>THERMAL MONITORING</div>
            <MultiLineChart
              data={history.map((h, i) => ({ t: i, cool: h.coolantTemp, oil: h.oilTemp, iat: h.intakeAirTemp }))}
              series={[
                { key: "cool", color: "var(--amber)", label: "COOLANT" },
                { key: "oil", color: "var(--red)", label: "OIL" },
                { key: "iat", color: "var(--cyan)", label: "IAT" },
              ]}
              height={90} maxPoints={60}
            />
          </div>

          {/* Fuel trim */}
          <div className="panel p-3" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>FUEL SYSTEM ANALYSIS</div>
            <MultiLineChart
              data={history.map((h, i) => ({ t: i, stft: h.shortTermFuelTrim, ltft: h.longTermFuelTrim, o2: h.o2Voltage * 10 }))}
              series={[
                { key: "stft", color: "var(--green)", label: "STFT" },
                { key: "ltft", color: "var(--purple)", label: "LTFT" },
                { key: "o2", color: "var(--amber)", label: "O2×10" },
              ]}
              height={90} maxPoints={60}
            />
          </div>

          {/* Throttle + Load */}
          <div className="panel p-3" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>ENGINE LOAD PROFILE</div>
            <MultiLineChart
              data={history.map((h, i) => ({ t: i, throttle: h.throttle, load: h.engineLoad, maf: h.maf * 3 }))}
              series={[
                { key: "throttle", color: "var(--cyan)", label: "THROTTLE" },
                { key: "load", color: "var(--amber)", label: "LOAD" },
                { key: "maf", color: "var(--green)", label: "MAF×3" },
              ]}
              height={90} maxPoints={60}
            />
          </div>
        </div>
      </div>

      {/* ── Right: Mini cards */}
      <div className="col-span-3 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>SENSOR SNAPSHOT</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area p-3 grid grid-cols-1 gap-2 content-start">
          <MiniCard icon={Activity} label="RPM" value={telemetry.rpm.toLocaleString()} sub="rpm"
            color="var(--cyan)" chartData={hist("rpm")} />
          <MiniCard icon={Zap} label="THROTTLE" value={`${telemetry.throttle}%`} color="var(--cyan)"
            chartData={hist("throttle")} />
          <MiniCard icon={Thermometer} label="COOLANT" value={`${telemetry.coolantTemp}°C`}
            color={telemetry.coolantTemp > 100 ? "var(--red)" : "var(--amber)"} chartData={hist("coolantTemp")} />
          <MiniCard icon={Thermometer} label="OIL TEMP" value={`${telemetry.oilTemp}°C`}
            color={telemetry.oilTemp > 110 ? "var(--red)" : "var(--amber)"} chartData={hist("oilTemp")} />
          <MiniCard icon={Wind} label="MAF" value={`${telemetry.maf}g/s`} color="var(--green)"
            chartData={hist("maf")} />
          <MiniCard icon={Droplets} label="O2 VOLT" value={`${telemetry.o2Voltage.toFixed(2)}V`}
            color="var(--purple)" chartData={hist("o2Voltage")} />

          {/* DTC status */}
          <div className="panel p-3 mt-1" style={{ borderColor: telemetry.dtcs.length > 0 ? "rgba(255,51,51,0.4)" : "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>FAULT CODES</div>
            {telemetry.dtcs.length === 0 ? (
              <div className="hud-label text-[10px]" style={{ color: "var(--green)" }}>ALL CLEAR · NO DTC</div>
            ) : (
              <div className="space-y-1">
                {telemetry.dtcs.map((c) => (
                  <div key={c} className="hud-display text-sm font-bold animate-blink" style={{ color: "var(--red)" }}>{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
