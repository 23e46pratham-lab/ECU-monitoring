import { TelemetryData } from "../types";

export function simulateECUData(prevData?: TelemetryData): TelemetryData {
  const now = Date.now();
  
  // Base values
  let rpm = prevData ? prevData.rpm : 800;
  let vss = prevData ? prevData.vss : 0;
  let throttle = prevData ? prevData.throttle : 15;
  let brakeSwitch = prevData ? prevData.brakeSwitch : false;

  // Randomly simulate driving states: Idle, Accelerating, Cruising, Braking
  const rand = Math.random();
  
  if (rand < 0.05) { // Sudden change in state
    brakeSwitch = Math.random() < 0.3;
  }

  if (brakeSwitch) {
    vss = Math.max(0, vss - Math.random() * 5);
    rpm = Math.max(800, rpm - Math.random() * 200);
    throttle = Math.max(0, throttle - 5);
  } else {
    if (vss < 10) { // Starting or idling
      throttle = 15 + Math.random() * 10;
      vss += Math.random() * 2;
      rpm = 800 + vss * 50 + Math.random() * 100;
    } else if (vss > 120) { // High speed
      throttle = 40 + Math.random() * 20;
      vss -= Math.random() * 3;
      rpm = 3000 + Math.random() * 500;
    } else { // Normal driving
      const accel = (Math.random() - 0.4) * 4;
      vss = Math.max(0, vss + accel);
      throttle = Math.min(100, Math.max(0, throttle + accel * 2));
      rpm = 1000 + vss * 30 + (throttle * 10) + Math.random() * 100;
    }
  }

  // Other parameters
  const engineLoad = Math.min(100, (rpm / 7000) * 100 + (throttle / 2));
  const maf = (rpm * engineLoad) / 1000 + Math.random() * 5;
  const coolantTemp = 85 + Math.sin(now / 100000) * 5;
  const oilTemp = 90 + Math.sin(now / 120000) * 5;
  const intakeAirTemp = 25 + Math.random() * 5;
  const shortTermFuelTrim = (Math.random() - 0.5) * 10;
  const longTermFuelTrim = (Math.random() - 0.5) * 5;
  const o2Voltage = 0.1 + Math.random() * 0.8;

  // Simulate DTCs occasionally
  const dtcs: string[] = [];
  if (Math.random() < 0.001) dtcs.push("P0300"); // Random Misfire
  if (Math.random() < 0.001) dtcs.push("P0171"); // System Too Lean

  return {
    rpm: Math.round(rpm),
    vss: Math.round(vss),
    maf: Number(maf.toFixed(2)),
    throttle: Math.round(throttle),
    engineLoad: Math.round(engineLoad),
    coolantTemp: Math.round(coolantTemp),
    oilTemp: Math.round(oilTemp),
    intakeAirTemp: Math.round(intakeAirTemp),
    shortTermFuelTrim: Number(shortTermFuelTrim.toFixed(2)),
    longTermFuelTrim: Number(longTermFuelTrim.toFixed(2)),
    o2Voltage: Number(o2Voltage.toFixed(2)),
    brakeSwitch,
    dtcs,
    timestamp: now,
  };
}
