import React from "react";
import { motion } from "motion/react";
import { TelemetryData, HealthStatus, DriverBehavior } from "../types";
import { Sparkles, Zap, TrendingUp, AlertCircle, CheckCircle, Brain } from "lucide-react";

interface DiagnosticsPanelProps {
  telemetry: TelemetryData;
  health: HealthStatus;
  behavior: DriverBehavior;
  aiSuggestion: string;
}

// ─── SUGGESTION CARD ──────────────────────────────────────────
const SuggestionCard: React.FC<{ icon: any; title: string; content: string; color: string; delay?: number }> =
  ({ icon: Icon, title, content, color, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="p-4"
      style={{ border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, background: `${color}06` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="hud-label text-[10px]" style={{ color }}>{title}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "Barlow, sans-serif" }}>
        {content}
      </p>
    </motion.div>
  );

// ─── METRIC INSIGHT ───────────────────────────────────────────
const MetricInsight: React.FC<{ label: string; value: string | number; insight: string; status: "good" | "warn" | "bad" }> =
  ({ label, value, insight, status }) => {
    const color = status === "good" ? "var(--green)" : status === "warn" ? "var(--amber)" : "var(--red)";
    const Icon = status === "good" ? CheckCircle : status === "warn" ? AlertCircle : AlertCircle;
    return (
      <div className="flex items-start gap-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <Icon size={13} style={{ color, marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="hud-label text-[10px]">{label}</span>
            <span className="text-sm font-bold shrink-0" style={{ fontFamily: "Share Tech Mono", color }}>{value}</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{insight}</div>
        </div>
      </div>
    );
  };

// ─── MAIN ─────────────────────────────────────────────────────
export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ telemetry, health, behavior, aiSuggestion }) => {
  const bColor = behavior === "Economical" ? "var(--green)" : behavior === "Moderate" ? "var(--amber)" : "var(--red)";

  const insights = [
    {
      label: "ENGINE TEMP",
      value: `${telemetry.coolantTemp}°C`,
      insight: telemetry.coolantTemp > 100 ? "Above normal operating range — check cooling system" : "Normal operating temperature",
      status: telemetry.coolantTemp > 105 ? "bad" : telemetry.coolantTemp > 95 ? "warn" : "good",
    },
    {
      label: "FUEL EFFICIENCY",
      value: `${telemetry.shortTermFuelTrim.toFixed(1)}%`,
      insight: Math.abs(telemetry.shortTermFuelTrim) > 8 ? "High fuel trim — possible lean/rich condition" : "Fuel mixture within normal range",
      status: Math.abs(telemetry.shortTermFuelTrim) > 10 ? "bad" : Math.abs(telemetry.shortTermFuelTrim) > 7 ? "warn" : "good",
    },
    {
      label: "O2 SENSOR",
      value: `${telemetry.o2Voltage.toFixed(2)}V`,
      insight: "Oxygen sensor cycling normally between rich/lean phases",
      status: "good",
    },
    {
      label: "ENGINE LOAD",
      value: `${telemetry.engineLoad}%`,
      insight: telemetry.engineLoad > 85 ? "High load — reduce throttle input for longevity" : "Operating within normal load range",
      status: telemetry.engineLoad > 90 ? "bad" : telemetry.engineLoad > 75 ? "warn" : "good",
    },
    {
      label: "DRIVING STYLE",
      value: behavior,
      insight: behavior === "Harsh" ? "Aggressive inputs reduce fuel economy by 15-30%" : behavior === "Economical" ? "Excellent smooth driving technique" : "Moderate driving — small improvements possible",
      status: behavior === "Harsh" ? "bad" : behavior === "Economical" ? "good" : "warn",
    },
  ] as const;

  return (
    <div className="h-full grid grid-cols-12 gap-0 overflow-hidden" style={{ background: "var(--bg-deep)" }}>

      {/* ── Left: AI Suggestions */}
      <div className="col-span-5 border-r flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <Sparkles size={14} style={{ color: "var(--cyan)" }} />
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>AI COPILOT RECOMMENDATIONS</div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-data-tick" style={{ background: "var(--cyan)" }} />
            <span className="hud-label text-[9px]" style={{ color: "var(--text-muted)" }}>GEMINI FLASH</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-area p-5 space-y-4">
          {/* Main AI suggestion */}
          <div className="p-5" style={{ border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.04)", borderLeft: "3px solid var(--cyan)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} style={{ color: "var(--cyan)" }} />
              <span className="hud-label text-[10px]" style={{ color: "var(--cyan)" }}>REAL-TIME ANALYSIS</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "Barlow, sans-serif" }}>
              {aiSuggestion}
            </p>
          </div>

          {/* Contextual suggestions */}
          <SuggestionCard
            icon={TrendingUp} title="FUEL ECONOMY TIP" color="var(--green)" delay={0.1}
            content={behavior === "Harsh"
              ? "Reduce throttle inputs and anticipate stops earlier. Gradual acceleration from 0-60 can improve fuel efficiency by up to 30%."
              : "Your smooth driving technique is maximizing fuel efficiency. Maintain consistent speeds and use engine braking where possible."}
          />
          <SuggestionCard
            icon={Zap} title="ENGINE PERFORMANCE" color="var(--amber)" delay={0.2}
            content={`Current RPM of ${telemetry.rpm} with ${telemetry.engineLoad}% load. ${telemetry.rpm > 4000 ? "Consider shifting up to reduce engine stress and improve economy." : "RPM in efficient operating range."}`}
          />
          {health.predictions.length > 0 && (
            <SuggestionCard
              icon={AlertCircle} title="PREDICTIVE MAINTENANCE" color="var(--red)" delay={0.3}
              content={health.predictions[0]}
            />
          )}
          <SuggestionCard
            icon={CheckCircle} title="BEST PRACTICE" color="var(--purple)" delay={0.4}
            content="Schedule regular diagnostic scans every 5,000 km or when the check engine light activates. Early detection prevents 70% of major failures."
          />
        </div>
      </div>

      {/* ── Right: Insights table */}
      <div className="col-span-7 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="hud-label text-[11px]" style={{ color: "var(--cyan)" }}>SYSTEM INSIGHTS · LIVE ANALYSIS</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area">
          <div className="grid grid-cols-2 h-full">
            {/* Metrics */}
            <div className="border-r p-5" style={{ borderColor: "var(--border)" }}>
              <div className="hud-label text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>PARAMETER HEALTH</div>
              <div className="space-y-0">
                {insights.map((item) => (
                  <MetricInsight key={item.label} {...item} />
                ))}
              </div>
            </div>

            {/* Driver profile breakdown */}
            <div className="p-5">
              <div className="hud-label text-[10px] mb-4" style={{ color: "var(--text-muted)" }}>DRIVER PROFILE BREAKDOWN</div>
              <div className="mb-4 p-4" style={{ border: `1px solid ${bColor}33`, background: `${bColor}06` }}>
                <div className="hud-label text-[9px] mb-1">CURRENT CLASSIFICATION</div>
                <div className="hud-display text-3xl font-black" style={{ color: bColor }}>{behavior}</div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "SMOOTHNESS SCORE", val: behavior === "Economical" ? 92 : behavior === "Moderate" ? 68 : 31 },
                  { label: "BRAKING EFFICIENCY", val: telemetry.brakeSwitch ? 45 : 85 },
                  { label: "THROTTLE CONTROL", val: Math.max(0, 100 - telemetry.throttle) },
                  { label: "RPM MANAGEMENT", val: Math.max(0, 100 - (telemetry.rpm / 7000) * 100) },
                  { label: "OVERALL RATING", val: behavior === "Economical" ? 88 : behavior === "Moderate" ? 62 : 28 },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="hud-label text-[10px]">{label}</span>
                      <span style={{ fontFamily: "Share Tech Mono", fontSize: 11, color: val > 70 ? "var(--green)" : val > 40 ? "var(--amber)" : "var(--red)" }}>{val}%</span>
                    </div>
                    <div className="meter-track h-1.5 rounded-none">
                      <motion.div className="meter-fill"
                        style={{ background: val > 70 ? "var(--green)" : val > 40 ? "var(--amber)" : "var(--red)", width: `${val}%` }}
                        animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* ML model status */}
              <div className="mt-5 p-3" style={{ border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
                <div className="hud-label text-[9px] mb-2" style={{ color: "var(--text-muted)" }}>MODEL INFERENCE STATUS</div>
                <div className="space-y-1">
                  {[
                    { name: "K-MEANS CLUSTERING", status: "ACTIVE", color: "var(--green)" },
                    { name: "RANDOM FOREST CLF", status: "ACTIVE", color: "var(--green)" },
                    { name: "LSTM PREDICTOR", status: history.length < 10 ? "WARMING UP" : "ACTIVE", color: history.length < 10 ? "var(--amber)" : "var(--green)" },
                    { name: "GEMINI FLASH", status: "CONNECTED", color: "var(--cyan)" },
                  ].map(({ name, status, color }) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="hud-label text-[9px]">{name}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full animate-data-tick" style={{ background: color }} />
                        <span className="hud-label text-[9px]" style={{ color }}>{status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
