import { TelemetryData, HealthStatus } from "../types";

/**
 * Simulates ML-based health monitoring (Random Forest + LSTM).
 */
export function analyzeVehicleHealth(data: TelemetryData, history: TelemetryData[]): HealthStatus {
  const { coolantTemp, oilTemp, rpm, engineLoad, dtcs } = data;
  
  let score = 95;
  const predictions: string[] = [];
  const faults: string[] = [...dtcs];

  // Random Forest Simulation (Multivariate Fault Detection)
  if (coolantTemp > 105 || oilTemp > 115) {
    score -= 20;
    faults.push("Engine Overheating Detected");
  }

  if (rpm > 6000 && engineLoad > 90) {
    score -= 10;
    predictions.push("High engine stress detected. Potential wear on piston rings.");
  }

  // LSTM Simulation (Time-series forecasting)
  // We check the trend of fuel trims
  if (history.length > 10) {
    const recentTrims = history.slice(-10).map(d => Math.abs(d.shortTermFuelTrim));
    const avgTrim = recentTrims.reduce((a, b) => a + b, 0) / recentTrims.length;
    
    if (avgTrim > 8) {
      score -= 15;
      predictions.push("Fuel trim instability detected. Oxygen sensor failure predicted in 200 miles.");
    }
  }

  // Final status
  let status: "Healthy" | "Warning" | "Critical" = "Healthy";
  if (score < 60 || faults.length > 0) status = "Critical";
  else if (score < 85) status = "Warning";

  return {
    score: Math.max(0, score),
    status,
    predictions,
    faults,
  };
}
