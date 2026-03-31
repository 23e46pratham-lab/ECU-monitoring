import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HealthStatus, TelemetryData } from "../types";
import {
  AlertTriangle, CheckCircle, Activity, Zap, Brain,
  Loader2, X, Shield, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { performDeepAnalysis } from "../services/geminiService";
import { LiveChart } from "./LiveChart";

interface HealthMonitorProps {
  health: HealthStatus;
  telemetry: TelemetryData;
  history: TelemetryData[];
}

// ─── SYSTEM STATUS ITEM ───────────────────────────────────────
const SystemItem: React.FC<{
  label: string; status: "ok" | "warning" | "critical"; detail: string;
}> = ({ label, status, detail }) => {
  const color = status === "ok" ? "var(--green)" : status === "warning" ? "var(--amber)" : "var(--red)";
  const Icon = status === "ok" ? CheckCircle : status === "warning" ? Activity : AlertTriangle;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
      <Icon size={14} style={{ color }} className={status === "critical" ? "animate-blink" : ""} />
      <div className="flex-1">
        <div className="hud-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>{label}</div>
        <div className="hud-label text-[10px]" style={{ color: "var(--text-muted)" }}>{detail}</div>
      </div>
      <span className="hud-label text-[10px] px-2 py-0.5"
        style={{ border: `1px solid ${color}44`, color, background: `${color}08` }}>
        {status.toUpperCase()}
      </span>
    </div>
  );
};

// ─── TREND INDICATOR ──────────────────────────────────────────
const TrendIndicator: React.FC<{ current: number; prev: number; label: string; unit: string; color: string }> =
  ({ current, prev, label, unit, color }) => {
    const diff = current - prev;
    const TrendIcon = diff > 0.5 ? TrendingUp : diff < -0.5 ? TrendingDown : Minus;
    const tColor = diff > 0.5 ? "var(--red)" : diff < -0.5 ? "var(--green)" : "var(--text-muted)";
    return (
      <div className="p-3" style={{ border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
        <div className="hud-label text-[9px] mb-1">{label}</div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-bold" style={{ fontFamily: "Share Tech Mono", color }}>{current.toFixed(0)}<span className="text-xs ml-0.5" style={{ color: "var(--text-muted)" }}>{unit}</span></span>
          <div className="flex items-center gap-1 mb-0.5">
            <TrendIcon size={11} style={{ color: tColor }} />
            <span className="hud-label text-[9px]" style={{ color: tColor }}>{Math.abs(diff).toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

// ─── MAIN COMPONENT ───────────────────────────────────────────
export const HealthMonitor: React.FC<HealthMonitorProps> = ({ health, telemetry, history }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);

  const statusColor = health.status === "Healthy" ? "var(--green)" : health.status === "Warning" ? "var(--amber)" : "var(--red)";
  const prev = history.slice(-20, -10);
  const avgPrev = (key: keyof typeof telemetry) =>
    prev.length > 0 ? prev.reduce((a, h) => a + Number(h[key]), 0) / prev.length : Number(telemetry[key]);

  const systems = [
    { label: "Engine Core", status: (telemetry.coolantTemp > 105 ? "critical" : telemetry.coolantTemp > 95 ? "warning" : "ok") as "ok" | "warning" | "critical", detail: `Coolant: ${telemetry.coolantTemp}°C · Oil: ${telemetry.oilTemp}°C` },
    { label: "Fuel System", status: (Math.abs(telemetry.shortTermFuelTrim) > 10 ? "critical" : Math.abs(telemetry.shortTermFuelTrim) > 7 ? "warning" : "ok") as "ok" | "warning" | "critical", detail: `STFT: ${telemetry.shortTermFuelTrim.toFixed(1)}% · LTFT: ${telemetry.longTermFuelTrim.toFixed(1)}%` },
    { label: "Oxygen Sensors", status: (telemetry.o2Voltage < 0.1 || telemetry.o2Voltage > 0.95 ? "warning" : "ok") as "ok" | "warning" | "critical", detail: `O2 voltage: ${telemetry.o2Voltage.toFixed(2)}V` },
    { label: "Air Intake", status: (telemetry.intakeAirTemp > 45 ? "warning" : "ok") as "ok" | "warning" | "critical", detail: `IAT: ${telemetry.intakeAirTemp}°C · MAF: ${telemetry.maf}g/s` },
    { label: "Drivetrain", status: (telemetry.rpm > 6000 ? "warning" : "ok") as "ok" | "warning" | "critical", detail: `RPM: ${telemetry.rpm} · Load: ${telemetry.engineLoad}%` },
    { label: "Fault Codes", status: (telemetry.dtcs.length > 0 ? "critical" : "ok") as "ok" | "warning" | "critical", detail: telemetry.dtcs.length > 0 ? telemetry.dtcs.join(", ") : "No active DTCs" },
  ];

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await performDeepAnalysis(telemetry, history);
      setDeepAnalysis(result);
    } catch (e) { console.error(e); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="h-full grid grid-cols-12 gap-0 overflow-hidden" style={{ background: "var(--bg-deep)" }}>

      {/* ── Left: System checklist */}
      <div className="col-span-4 border-r flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>SYSTEM HEALTH MATRIX</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area px-4">
          {systems.map((s) => <SystemItem key={s.label} {...s} />)}
        </div>

        {/* Deep analysis button */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={handleDeepAnalysis} disabled={isAnalyzing}
            className="btn-hud btn-cyan w-full py-3 flex items-center justify-center gap-2 text-xs disabled:opacity-50">
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            {isAnalyzing ? "DEEP SCAN RUNNING..." : "INITIATE DEEP ANALYSIS"}
          </button>
        </div>
      </div>

      {/* ── Center: Score + predictions */}
      <div className="col-span-5 border-r flex flex-col overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>ML HEALTH ASSESSMENT</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area p-5 space-y-5">
          {/* Score ring visualization */}
          <div className="flex items-center gap-6 p-5 panel" style={{ borderColor: `${statusColor}33` }}>
            <div className="relative">
              <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
                <motion.circle cx={60} cy={60} r={50} fill="none" stroke={statusColor} strokeWidth={8}
                  strokeDasharray={314} initial={{ strokeDashoffset: 314 }}
                  animate={{ strokeDashoffset: 314 - (314 * health.score) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 8px ${statusColor}88)` }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "rotate(0deg)" }}>
                <div className="hud-display text-3xl font-black" style={{ color: statusColor }}>{health.score}</div>
                <div className="hud-label text-[9px]">SCORE</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="hud-display text-xl font-bold mb-1" style={{ color: statusColor }}>{health.status.toUpperCase()}</div>
              <div className="hud-label text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>ML INTEGRITY RATING</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="hud-label">PREDICTIVE CONFIDENCE</span>
                  <span style={{ fontFamily: "Share Tech Mono", color: statusColor }}>87%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="hud-label">ANOMALIES DETECTED</span>
                  <span style={{ fontFamily: "Share Tech Mono", color: health.faults.length > 0 ? "var(--red)" : "var(--green)" }}>{health.faults.length}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="hud-label">ACTIVE PREDICTIONS</span>
                  <span style={{ fontFamily: "Share Tech Mono", color: "var(--cyan)" }}>{health.predictions.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Predictions */}
          <div>
            <div className="hud-label text-[10px] mb-2 flex items-center gap-2" style={{ color: "var(--purple)" }}>
              <Zap size={11} /> LSTM PREDICTIVE ALERTS
            </div>
            {health.predictions.length > 0 ? (
              <div className="space-y-2">
                {health.predictions.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-3" style={{ border: "1px solid rgba(155,93,229,0.3)", background: "rgba(155,93,229,0.05)", borderLeft: "3px solid var(--purple)" }}>
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{p}</div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center" style={{ border: "1px solid var(--border)" }}>
                <CheckCircle size={20} className="mx-auto mb-2" style={{ color: "var(--green)", opacity: 0.6 }} />
                <div className="hud-label text-[10px]" style={{ color: "var(--text-muted)" }}>NO PREDICTIVE ALERTS</div>
              </div>
            )}
          </div>

          {/* Faults */}
          {health.faults.length > 0 && (
            <div>
              <div className="hud-label text-[10px] mb-2 flex items-center gap-2" style={{ color: "var(--red)" }}>
                <AlertTriangle size={11} /> ACTIVE FAULT CODES
              </div>
              <div className="space-y-1">
                {health.faults.map((f, i) => (
                  <div key={i} className="p-2.5 alert-flash" style={{ border: "1px solid rgba(255,51,51,0.4)", borderLeft: "3px solid var(--red)" }}>
                    <div className="hud-display text-sm font-bold" style={{ color: "var(--red)" }}>{f}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score trend */}
          <div className="panel p-3" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>HEALTH SCORE TREND</div>
            <LiveChart
              data={history.map((h, i) => {
                const score = Math.max(0, 95 - (h.coolantTemp > 105 ? 20 : 0) - (Math.abs(h.shortTermFuelTrim) > 8 ? 15 : 0) - (h.dtcs.length * 10));
                return { t: i, v: score };
              })}
              color={statusColor} label="Health" height={60} maxPoints={80}
            />
          </div>
        </div>
      </div>

      {/* ── Right: Trend indicators */}
      <div className="col-span-3 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>PARAMETER TRENDS</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area p-3 grid grid-cols-1 gap-2 content-start">
          <TrendIndicator label="COOLANT TEMP" current={telemetry.coolantTemp} prev={avgPrev("coolantTemp")} unit="°C" color="var(--amber)" />
          <TrendIndicator label="OIL TEMP" current={telemetry.oilTemp} prev={avgPrev("oilTemp")} unit="°C" color="var(--amber)" />
          <TrendIndicator label="ENGINE RPM" current={telemetry.rpm} prev={avgPrev("rpm")} unit="rpm" color="var(--cyan)" />
          <TrendIndicator label="ENGINE LOAD" current={telemetry.engineLoad} prev={avgPrev("engineLoad")} unit="%" color="var(--amber)" />
          <TrendIndicator label="THROTTLE POS" current={telemetry.throttle} prev={avgPrev("throttle")} unit="%" color="var(--cyan)" />
          <TrendIndicator label="O2 VOLTAGE" current={telemetry.o2Voltage * 100} prev={avgPrev("o2Voltage") * 100} unit="%" color="var(--purple)" />

          {/* Random Forest status */}
          <div className="mt-2 p-3" style={{ border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
            <div className="hud-label text-[9px] mb-2" style={{ color: "var(--text-muted)" }}>RF CLASSIFIER</div>
            <div className="hud-display text-sm font-bold mb-1" style={{ color: statusColor }}>{health.status.toUpperCase()}</div>
            <div className="meter-track h-1 rounded-none">
              <div className="meter-fill" style={{ background: statusColor, width: `${health.score}%` }} />
            </div>
          </div>

          <div className="p-3" style={{ border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
            <div className="hud-label text-[9px] mb-2" style={{ color: "var(--text-muted)" }}>LSTM FORECASTER</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-data-tick" style={{ background: "var(--purple)" }} />
              <span className="text-xs" style={{ fontFamily: "Share Tech Mono", color: "var(--purple)" }}>ANALYZING PATTERNS</span>
            </div>
            <div className="mt-2 text-[10px]" style={{ color: "var(--text-muted)", fontFamily: "Barlow" }}>
              {health.predictions.length > 0 ? `${health.predictions.length} issues predicted` : "Patterns nominal"}
            </div>
          </div>
        </div>
      </div>

      {/* Deep Analysis Modal */}
      <AnimatePresence>
        {deepAnalysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-8"
            style={{ background: "rgba(4,6,8,0.92)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="panel corner-bracket w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden glow-cyan"
              style={{ borderColor: "rgba(0,212,255,0.3)" }}>
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
                <div className="flex items-center gap-3">
                  <Brain size={18} style={{ color: "var(--cyan)" }} />
                  <div>
                    <div className="hud-display text-base font-bold" style={{ color: "var(--cyan)" }}>DEEP SYSTEM ANALYSIS</div>
                    <div className="hud-label text-[9px]" style={{ color: "var(--text-muted)" }}>GEMINI 3.1 PRO · HIGH THINKING MODE</div>
                  </div>
                </div>
                <button onClick={() => setDeepAnalysis(null)} className="p-1.5 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scroll-area p-6 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-secondary)", fontFamily: "Barlow, sans-serif" }}>
                {deepAnalysis}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
