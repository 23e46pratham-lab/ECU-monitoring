import { TelemetryData, DriverBehavior } from "../types";

/**
 * Simulates K-Means clustering for driver behavior classification.
 * In a real app, this would use a library or a pre-trained model.
 */
export function classifyDriverBehavior(data: TelemetryData): DriverBehavior {
  const { vss, rpm, throttle, brakeSwitch } = data;

  // Simple heuristic-based classification to simulate K-Means clusters
  // Harsh: High throttle, high RPM, or heavy braking at high speed
  if (throttle > 75 || rpm > 4500 || (brakeSwitch && vss > 80)) {
    return "Harsh";
  }

  // Economical: Low throttle, moderate RPM, steady speed
  if (throttle < 30 && rpm < 2500 && vss > 30 && vss < 90) {
    return "Economical";
  }

  // Moderate: Everything else
  return "Moderate";
}
