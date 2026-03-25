import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Gauge, 
  Fuel, 
  AlertCircle, 
  User, 
  LogOut, 
  Settings, 
  Bell,
  Thermometer,
  Wind,
  Droplets,
  Zap,
  Sparkles,
  Loader2
} from "lucide-react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { TelemetryData, DriverBehavior, HealthStatus } from "../types";
import { simulateECUData } from "../services/ecuSimulator";
import { classifyDriverBehavior } from "../logic/driverBehavior";
import { analyzeVehicleHealth } from "../logic/mlHealth";
import { calculateMileage } from "../logic/mileage";
import { getAISuggestions } from "../services/geminiService";
import { CircularGauge, LinearGauge } from "./Gauges";
import { DriverAura } from "./DriverAura";
import { HealthMonitor } from "./HealthMonitor";
import { ChatInterface } from "./ChatInterface";
import { cn } from "../lib/utils";

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>(simulateECUData());
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [behavior, setBehavior] = useState<DriverBehavior>("Moderate");
  const [health, setHealth] = useState<HealthStatus>({ score: 100, status: "Healthy", predictions: [], faults: [] });
  const [mileage, setMileage] = useState<number>(0);
  const [aiSuggestion, setAiSuggestion] = useState<string>("Analyzing driving patterns...");
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const lastAiUpdate = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time telemetry loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const next = simulateECUData(prev);
        setHistory((h) => [...h.slice(-50), next]);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Logic updates
  useEffect(() => {
    const newBehavior = classifyDriverBehavior(telemetry);
    const newHealth = analyzeVehicleHealth(telemetry, history);
    const newMileage = calculateMileage(telemetry);

    setBehavior(newBehavior);
    setHealth(newHealth);
    setMileage(newMileage);

    // AI Suggestions every 30 seconds or on major changes
    const now = Date.now();
    if (now - lastAiUpdate.current > 30000 || (newHealth.status === "Critical" && health.status !== "Critical")) {
      lastAiUpdate.current = now;
      getAISuggestions(telemetry, newBehavior, newHealth).then(setAiSuggestion);
    }
  }, [telemetry]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === "auth/cancelled-popup-request") {
        setLoginError("A login request is already in progress. Please wait.");
      } else if (error.code === "auth/popup-closed-by-user") {
        setLoginError("Login window was closed. Please try again.");
      } else {
        setLoginError("Failed to connect. Please check your connection.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (!isAuthReady) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
        <DriverAura behavior="Moderate" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A2235]/80 backdrop-blur-xl border border-[#2D3748] p-10 rounded-[32px] max-w-md w-full text-center space-y-8 shadow-2xl"
        >
          <div className="w-20 h-20 bg-[#00E5FF]/10 rounded-full flex items-center justify-center mx-auto border border-[#00E5FF]/30">
            <Activity color="#00E5FF" size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Smart ECU</h1>
            <p className="text-gray-400">Vehicle Telemetry & Predictive Maintenance</p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <User size={20} />
            )}
            {isLoggingIn ? "Connecting..." : "Connect with Google"}
          </button>
          
          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#FF003C]/10 border border-[#FF003C]/30 p-3 rounded-xl text-xs text-[#FF003C] font-medium"
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Secure OBD-II Cloud Sync</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 pb-24 font-sans selection:bg-[#00E5FF]/30">
      <DriverAura behavior={behavior} />
      
      {/* Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00E5FF]/10 rounded-xl flex items-center justify-center border border-[#00E5FF]/30">
            <Activity color="#00E5FF" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Vehicle Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", 
                behavior === "Economical" ? "bg-[#00FF66]" : behavior === "Moderate" ? "bg-[#FFD700]" : "bg-[#FF003C]"
              )} />
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                Live Telemetry • {behavior} Mode
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-3 bg-[#1A2235] border border-[#2D3748] rounded-xl text-gray-400 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-3 bg-[#1A2235] border border-[#2D3748] p-1.5 pr-4 rounded-xl">
            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-lg" />
            <button onClick={handleLogout} className="text-gray-400 hover:text-[#FF003C] transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Primary Gauges */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Gauges Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A2235]/60 backdrop-blur-xl border border-[#2D3748] p-8 rounded-[24px] flex flex-col items-center justify-center shadow-xl">
              <CircularGauge 
                value={telemetry.rpm} 
                max={7000} 
                label="Engine Speed" 
                unit="RPM" 
                color="#00E5FF" 
              />
            </div>
            <div className="bg-[#1A2235]/60 backdrop-blur-xl border border-[#2D3748] p-8 rounded-[24px] flex flex-col items-center justify-center shadow-xl">
              <CircularGauge 
                value={telemetry.vss} 
                max={240} 
                label="Vehicle Speed" 
                unit="KM/H" 
                color="#9D4EDD" 
              />
            </div>
          </div>

          {/* Secondary Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TelemetryCard icon={Fuel} label="Mileage" value={mileage} unit="MPG" color="#00FF66" />
            <TelemetryCard icon={Zap} label="Load" value={telemetry.engineLoad} unit="%" color="#FFD700" />
            <TelemetryCard icon={Thermometer} label="Coolant" value={telemetry.coolantTemp} unit="°C" color="#FF003C" />
            <TelemetryCard icon={Wind} label="MAF" value={telemetry.maf} unit="g/s" color="#00E5FF" />
          </div>

          {/* AI Suggestions Card */}
          <motion.div 
            layout
            className="bg-[#1A2235]/80 backdrop-blur-xl border border-[#9D4EDD]/30 p-6 rounded-[24px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={80} color="#9D4EDD" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#9D4EDD]/20 rounded-lg">
                <Sparkles size={20} color="#9D4EDD" />
              </div>
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">AI Copilot Suggestions</h3>
            </div>
            <p className="text-gray-300 leading-relaxed text-sm">
              {aiSuggestion}
            </p>
          </motion.div>

          {/* Detailed Stats */}
          <div className="bg-[#1A2235]/40 border border-[#2D3748] p-6 rounded-[24px] grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <LinearGauge value={telemetry.throttle} max={100} label="Throttle Position" unit="%" color="#00E5FF" />
              <LinearGauge value={telemetry.oilTemp} max={150} label="Oil Temperature" unit="°C" color="#FFD700" />
            </div>
            <div className="space-y-4">
              <LinearGauge value={telemetry.shortTermFuelTrim + 50} max={100} label="Fuel Trim (ST)" unit="%" color="#9D4EDD" />
              <LinearGauge value={telemetry.o2Voltage * 100} max={100} label="O2 Sensor" unit="%" color="#00FF66" />
            </div>
          </div>
        </div>

        {/* Right Column: Health & Diagnostics */}
        <div className="lg:col-span-4 space-y-6">
          <HealthMonitor health={health} telemetry={telemetry} history={history} />
          
          {/* Quick Actions */}
          <div className="bg-[#1A2235]/40 border border-[#2D3748] p-6 rounded-[24px] space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-2">System Controls</h3>
            <button className="w-full bg-[#2D3748] hover:bg-[#3D4758] text-white py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-sm">
              <Settings size={18} />
              ECU Configuration
            </button>
            <button className="w-full bg-[#FF003C]/10 hover:bg-[#FF003C]/20 text-[#FF003C] py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-sm border border-[#FF003C]/20">
              <AlertCircle size={18} />
              Clear Fault Codes
            </button>
          </div>
        </div>

      </main>

      <ChatInterface />
    </div>
  );
};

interface TelemetryCardProps {
  icon: any;
  label: string;
  value: number | string;
  unit: string;
  color: string;
}

const TelemetryCard: React.FC<TelemetryCardProps> = ({ icon: Icon, label, value, unit, color }) => (
  <div className="bg-[#1A2235]/60 backdrop-blur-md border border-[#2D3748] p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg">
    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}11` }}>
      <Icon size={18} color={color} />
    </div>
    <div className="text-center">
      <div className="text-xl font-mono font-bold text-white">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label} ({unit})</div>
    </div>
  </div>
);
