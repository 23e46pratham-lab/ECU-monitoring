import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface HUDGaugeProps {
  value: number;
  max: number;
  color: string;
  unit: string;
  warning?: number;
  critical?: number;
  size?: number;
}

export const HUDGauge: React.FC<HUDGaugeProps> = ({
  value, max, color, unit, warning, critical, size = 180,
}) => {
  const pct = Math.min(1, Math.max(0, value / max));
  
  // Gauge arc params: 220° sweep, starting from 250° (bottom-left)
  const startAngle = -220;
  const sweepAngle = 220;
  const r = (size / 2) * 0.72;
  const cx = size / 2;
  const cy = size / 2;

  const polarToCart = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const makeArc = (fromPct: number, toPct: number, radius: number) => {
    const from = startAngle + fromPct * sweepAngle;
    const to = startAngle + toPct * sweepAngle;
    const start = polarToCart(from, radius);
    const end = polarToCart(to, radius);
    const large = (toPct - fromPct) * sweepAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const isWarning = warning && value >= warning;
  const isCritical = critical && value >= critical;
  const activeColor = isCritical ? "var(--red)" : isWarning ? "var(--amber)" : color;

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);

  // Needle
  const needleAngle = startAngle + pct * sweepAngle;
  const needlePt = polarToCart(needleAngle, r * 0.82);
  const needleBase1 = polarToCart(needleAngle + 90, 5);
  const needleBase2 = polarToCart(needleAngle - 90, 5);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        {/* Outer ring decoration */}
        <circle cx={cx} cy={cy} r={size * 0.48} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 6" />

        {/* Background track */}
        <path d={makeArc(0, 1, r)} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="butt" />

        {/* Zone coloring: warning zone */}
        {warning && (
          <path d={makeArc(warning / max, critical ? critical / max : 1, r)} fill="none"
            stroke="rgba(255,184,0,0.2)" strokeWidth={10} strokeLinecap="butt" />
        )}
        {/* Critical zone */}
        {critical && (
          <path d={makeArc(critical / max, 1, r)} fill="none"
            stroke="rgba(255,51,51,0.2)" strokeWidth={10} strokeLinecap="butt" />
        )}

        {/* Active value arc */}
        <motion.path
          d={makeArc(0, pct, r)}
          fill="none" stroke={activeColor} strokeWidth={10} strokeLinecap="butt"
          initial={{ pathLength: 0 }} animate={{ pathLength: pct }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${activeColor}88)` }}
        />

        {/* Tick marks */}
        {ticks.map((t) => {
          const major = t % 0.2 < 0.01 || t > 0.99;
          const angle = startAngle + t * sweepAngle;
          const inner = polarToCart(angle, r - (major ? 12 : 7));
          const outer = polarToCart(angle, r);
          return (
            <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={major ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
              strokeWidth={major ? 1.5 : 0.8} />
          );
        })}

        {/* Needle */}
        <motion.polygon
          points={`${needlePt.x},${needlePt.y} ${needleBase1.x},${needleBase1.y} ${cx},${cy} ${needleBase2.x},${needleBase2.y}`}
          fill={activeColor} opacity={0.9}
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})` }}
          animate={{ rotate: 0 }}
        />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={6} fill="var(--bg-card)" stroke={activeColor} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={2} fill={activeColor} />
      </svg>

      {/* Value display */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none">
        <motion.div
          className="text-center"
          key={Math.round(value / 100)}
        >
          <div className="font-bold leading-none"
            style={{
              fontFamily: "Share Tech Mono, monospace",
              fontSize: size * 0.155,
              color: activeColor,
              textShadow: `0 0 15px ${activeColor}88`,
            }}>
            {Math.round(value).toLocaleString()}
          </div>
          <div className="hud-label" style={{ fontSize: size * 0.065, color: "var(--text-secondary)" }}>{unit}</div>
        </motion.div>
      </div>

      {/* Alert indicator */}
      {isCritical && (
        <div className="absolute top-2 right-2 animate-blink">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--red)", boxShadow: "0 0 6px var(--red)" }} />
        </div>
      )}
    </div>
  );
};
