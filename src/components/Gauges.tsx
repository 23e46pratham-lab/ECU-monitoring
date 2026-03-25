import React from "react";
import { motion } from "motion/react";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
}

export const CircularGauge: React.FC<GaugeProps> = ({ value, max, label, unit, color }) => {
  const percentage = Math.min(100, (value / max) * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center w-48 h-48">
      <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 192 192">
        {/* Background Track */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="#E2E8F0"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress Bar */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-mono font-bold text-slate-900">
          {Math.round(value)}
        </span>
        <span className="text-xs text-slate-500 uppercase tracking-widest">{unit}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-600 uppercase">{label}</div>
    </div>
  );
};

export const LinearGauge: React.FC<GaugeProps> = ({ value, max, label, unit, color }) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
        <span>{label}</span>
        <span className="text-slate-700">{Math.round(value)} {unit}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        />
      </div>
    </div>
  );
};
