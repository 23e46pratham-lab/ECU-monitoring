import { TelemetryData } from "../types";

/**
 * Calculates real-time mileage (MPG) using the stoichiometric formula.
 * Formula: MPG = (710.7 * VSS) / MAF
 */
export function calculateMileage(data: TelemetryData): number {
  const { vss, maf } = data;
  
  if (maf === 0) return 0;
  
  // MPG = (710.7 * VSS_mph) / MAF_gps
  // VSS is in km/h, convert to mph (1 km/h = 0.621371 mph)
  const vss_mph = vss * 0.621371;
  const mpg = (710.7 * vss_mph) / maf;
  
  return Number(mpg.toFixed(2));
}

/**
 * Converts MPG to L/100km if needed.
 */
export function mpgToL100km(mpg: number): number {
  if (mpg === 0) return 0;
  return Number((235.215 / mpg).toFixed(2));
}
