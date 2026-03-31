import React, { useMemo } from "react";

interface DataPoint { t: number; v: number; }

interface LiveChartProps {
  data: DataPoint[];
  color: string;
  label: string;
  maxPoints?: number;
  height?: number;
  showGrid?: boolean;
  unit?: string;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  data, color, label, maxPoints = 60, height = 80, showGrid = true, unit = "",
}) => {
  const pts = data.slice(-maxPoints);

  const { path, area, minV, maxV } = useMemo(() => {
    if (pts.length < 2) return { path: "", area: "", minV: 0, maxV: 0 };

    const minV = Math.min(...pts.map(p => p.v));
    const maxV = Math.max(...pts.map(p => p.v));
    const range = maxV - minV || 1;
    const w = 100; // percentage coords

    const points = pts.map((p, i) => ({
      x: (i / (maxPoints - 1)) * w,
      y: height - ((p.v - minV) / range) * (height * 0.8) - height * 0.1,
    }));

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { path, area, minV, maxV };
  }, [pts, height, maxPoints]);

  const lastVal = pts.length > 0 ? pts[pts.length - 1].v : 0;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%" height="100%"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        {/* Grid lines */}
        {showGrid && [0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} y1={height * g} x2={100} y2={height * g}
            stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        ))}

        {/* Area fill */}
        {pts.length > 1 && (
          <>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#grad-${label})`} />
            <path d={path} fill="none" stroke={color} strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />

            {/* Latest point dot */}
            {pts.length > 0 && (() => {
              const last = pts[pts.length - 1];
              const x = 100;
              const range = maxV - minV || 1;
              const y = height - ((last.v - minV) / range) * (height * 0.8) - height * 0.1;
              return (
                <circle cx={x} cy={y} r={2} fill={color}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
              );
            })()}
          </>
        )}
      </svg>

      {/* Value overlay */}
      <div className="absolute top-1 right-1 flex items-baseline gap-1">
        <span style={{ fontFamily: "Share Tech Mono", fontSize: 13, color, textShadow: `0 0 8px ${color}88` }}>
          {typeof lastVal === "number" ? lastVal.toFixed(1) : lastVal}
        </span>
        {unit && <span className="hud-label" style={{ fontSize: 9, color: "var(--text-muted)" }}>{unit}</span>}
      </div>

      {/* Min/max labels */}
      <div className="absolute bottom-0 left-0">
        <span className="hud-label" style={{ fontSize: 8, color: "var(--text-muted)" }}>{minV.toFixed(0)}</span>
      </div>
      <div className="absolute top-0 left-0">
        <span className="hud-label" style={{ fontSize: 8, color: "var(--text-muted)" }}>{maxV.toFixed(0)}</span>
      </div>
    </div>
  );
};


// ─── MULTI-LINE CHART ─────────────────────────────────────────
interface MultiDataPoint { t: number; [key: string]: number; }

interface MultiChartProps {
  data: MultiDataPoint[];
  series: { key: string; color: string; label: string }[];
  height?: number;
  maxPoints?: number;
}

export const MultiLineChart: React.FC<MultiChartProps> = ({ data, series, height = 120, maxPoints = 60 }) => {
  const pts = data.slice(-maxPoints);

  const allValues = pts.flatMap(p => series.map(s => p[s.key] ?? 0));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;

  const makePath = (key: string) => {
    if (pts.length < 2) return "";
    return pts.map((p, i) => {
      const x = (i / (maxPoints - 1)) * 100;
      const y = height - ((( p[key] ?? 0) - minV) / range) * (height * 0.85) - height * 0.05;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} y1={height * g} x2={100} y2={height * g}
            stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        ))}
        {series.map(s => (
          <path key={s.key} d={makePath(s.key)} fill="none" stroke={s.color} strokeWidth={1.5}
            style={{ filter: `drop-shadow(0 0 2px ${s.color}66)` }} />
        ))}
      </svg>
      <div className="absolute top-1 right-1 flex gap-3">
        {series.map(s => {
          const lastVal = pts.length > 0 ? pts[pts.length - 1][s.key] : 0;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className="w-2 h-0.5" style={{ background: s.color }} />
              <span style={{ fontFamily: "Share Tech Mono", fontSize: 10, color: s.color }}>
                {(lastVal ?? 0).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
