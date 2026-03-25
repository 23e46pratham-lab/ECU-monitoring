import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HealthStatus, TelemetryData } from "../types";
import { AlertTriangle, CheckCircle, Activity, Zap, Brain, Loader2, X } from "lucide-react";
import { performDeepAnalysis } from "../services/geminiService";

interface HealthMonitorProps {
  health: HealthStatus;
  telemetry: TelemetryData;
  history: TelemetryData[];
}

export const HealthMonitor: React.FC<HealthMonitorProps> = ({ health, telemetry, history }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);

  const statusColors = {
    Healthy: "#00FF66",
    Warning: "#FFD700",
    Critical: "#FF003C",
  };

  const StatusIcon = {
    Healthy: CheckCircle,
    Warning: Activity,
    Critical: AlertTriangle,
  }[health.status];

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await performDeepAnalysis(telemetry, history);
      setDeepAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-[#1A2235]/80 backdrop-blur-xl border border-[#2D3748] rounded-[20px] p-6 space-y-6 relative overflow-hidden">
      {/* Scanning Effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] bg-[#9D4EDD] z-10 opacity-50"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ boxShadow: "0 0 15px #9D4EDD" }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${statusColors[health.status]}22` }}
          >
            <StatusIcon size={24} color={statusColors[health.status]} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Vehicle Health</h3>
            <p className="text-xs text-gray-400 uppercase tracking-wider">ML-Based Monitoring</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold" style={{ color: statusColors[health.status] }}>
            {health.score}%
          </div>
          <p className="text-[10px] text-gray-400 uppercase">System Integrity</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Predictions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#9D4EDD] text-xs font-bold uppercase tracking-widest">
            <Zap size={14} />
            <span>AI Predictions</span>
          </div>
          <div className="space-y-2">
            {health.predictions.length > 0 ? (
              health.predictions.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#0B0F19] p-3 rounded-xl border-l-2 border-[#9D4EDD] text-sm text-gray-300"
                >
                  {p}
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No predictive alerts at this time.</p>
            )}
          </div>
        </div>

        {/* Deep Analysis Button */}
        <button
          onClick={handleDeepAnalysis}
          disabled={isAnalyzing}
          className="w-full py-3 bg-[#9D4EDD]/10 hover:bg-[#9D4EDD]/20 border border-[#9D4EDD]/30 rounded-xl flex items-center justify-center gap-2 text-[#9D4EDD] font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {isAnalyzing ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Brain size={16} />
          )}
          {isAnalyzing ? "Analyzing Engine Patterns..." : "Run Deep AI Analysis"}
        </button>

        {/* Faults */}
        <AnimatePresence>
          {health.faults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FF003C]/10 p-4 rounded-xl border border-[#FF003C]/30 space-y-2"
            >
              <div className="flex items-center gap-2 text-[#FF003C] text-xs font-bold uppercase">
                <AlertTriangle size={14} />
                <span>Active Faults Detected</span>
              </div>
              <ul className="space-y-1">
                {health.faults.map((f, i) => (
                  <li key={i} className="text-sm text-white font-medium">• {f}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deep Analysis Modal */}
      <AnimatePresence>
        {deepAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1A2235] border border-[#2D3748] w-full max-w-2xl max-h-[80vh] rounded-[32px] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#2D3748] flex items-center justify-between bg-[#9D4EDD]/10">
                <div className="flex items-center gap-3">
                  <Brain color="#9D4EDD" size={24} />
                  <h3 className="text-white font-bold text-lg">Deep System Analysis</h3>
                </div>
                <button onClick={() => setDeepAnalysis(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 text-gray-300 text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
                {deepAnalysis}
              </div>
              <div className="p-6 border-t border-[#2D3748] bg-[#0B0F19] text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Powered by Gemini 3.1 Pro • High Thinking Mode
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
