export interface TelemetryData {
  rpm: number;
  vss: number; // Vehicle Speed Sensor (km/h)
  maf: number; // Mass Air Flow (g/s)
  throttle: number; // %
  engineLoad: number; // %
  coolantTemp: number; // °C
  oilTemp: number; // °C
  intakeAirTemp: number; // °C
  shortTermFuelTrim: number; // %
  longTermFuelTrim: number; // %
  o2Voltage: number; // V
  brakeSwitch: boolean;
  dtcs: string[]; // Diagnostic Trouble Codes
  timestamp: number;
}

export type DriverBehavior = "Economical" | "Moderate" | "Harsh";

export interface HealthStatus {
  score: number; // 0-100
  status: "Healthy" | "Warning" | "Critical";
  predictions: string[];
  faults: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  vehicleModel: string;
  createdAt: number;
}

export interface MaintenanceLog {
  id: string;
  uid: string;
  type: string;
  description: string;
  timestamp: number;
  status: "pending" | "completed";
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}
