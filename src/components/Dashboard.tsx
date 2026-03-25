import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, Gauge, Fuel, AlertCircle, User, LogOut, Settings, Bell,
  Thermometer, Wind, Droplets, Zap, Sparkles, Loader2, Menu, ChevronLeft,
  LayoutDashboard, Wrench, MessageSquare
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

type Tab = 'overview' | 'telemetry' | 'diagnostics' | 'assistant' | 'settings';

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

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <DriverAura behavior="Moderate" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200 p-10 rounded-[32px] max-w-md w-full text-center space-y-8 shadow-2xl relative z-10"
        >
          <div className="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto border border-sky-500/30">
            <Activity className="text-sky-500" size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Smart ECU</h1>
            <p className="text-slate-500">Vehicle Telemetry & Predictive Maintenance</p>
          </div>
          
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-50"
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
                className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-500 font-medium"
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Secure OBD-II Cloud Sync</p>
        </motion.div>
      </div>
    );
  }

  const SidebarItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: Tab }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all",
        activeTab === id 
          ? "bg-sky-500/10 text-sky-600 border border-sky-500/30" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200 p-8 rounded-[24px] flex flex-col items-center justify-center shadow-xl">
                <CircularGauge value={telemetry.rpm} max={7000} label="Engine Speed" unit="RPM" color="#0EA5E9" />
              </div>
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200 p-8 rounded-[24px] flex flex-col items-center justify-center shadow-xl">
                <CircularGauge value={telemetry.vss} max={240} label="Vehicle Speed" unit="KM/H" color="#8B5CF6" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TelemetryCard icon={Fuel} label="Mileage" value={mileage} unit="MPG" color="#10B981" />
              <TelemetryCard 
                icon={Activity} 
                label="Behavior" 
                value={behavior} 
                unit="MODE" 
                color={behavior === "Economical" ? "#10B981" : behavior === "Moderate" ? "#F59E0B" : "#EF4444"} 
              />
            </div>
          </div>
        );
      case 'telemetry':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TelemetryCard icon={Zap} label="Load" value={telemetry.engineLoad} unit="%" color="#F59E0B" />
              <TelemetryCard icon={Thermometer} label="Coolant" value={telemetry.coolantTemp} unit="°C" color="#EF4444" />
              <TelemetryCard icon={Wind} label="MAF" value={telemetry.maf} unit="g/s" color="#0EA5E9" />
              <TelemetryCard icon={Droplets} label="Oil Temp" value={telemetry.oilTemp} unit="°C" color="#F59E0B" />
            </div>
            <div className="bg-white/40 border border-slate-200 p-6 rounded-[24px] grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
              <div className="space-y-4">
                <LinearGauge value={telemetry.throttle} max={100} label="Throttle Position" unit="%" color="#0EA5E9" />
                <LinearGauge value={telemetry.oilTemp} max={150} label="Oil Temperature" unit="°C" color="#F59E0B" />
              </div>
              <div className="space-y-4">
                <LinearGauge value={telemetry.shortTermFuelTrim + 50} max={100} label="Fuel Trim (ST)" unit="%" color="#8B5CF6" />
                <LinearGauge value={telemetry.o2Voltage * 100} max={100} label="O2 Sensor" unit="%" color="#10B981" />
              </div>
            </div>
          </div>
        );
      case 'diagnostics':
        return (
          <div className="space-y-6 max-w-3xl">
            <HealthMonitor health={health} telemetry={telemetry} history={history} />
          </div>
        );
      case 'assistant':
        return (
          <div className="space-y-6 max-w-3xl">
            <motion.div 
              layout
              className="bg-white/80 backdrop-blur-xl border border-violet-200 p-6 rounded-[24px] relative overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={80} className="text-violet-500" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Sparkles size={20} className="text-violet-600" />
                </div>
                <h3 className="text-slate-900 font-bold uppercase tracking-widest text-sm">AI Copilot Suggestions</h3>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                {aiSuggestion}
              </p>
            </motion.div>
            
            <div className="bg-white/40 border border-slate-200 p-6 rounded-[24px] shadow-sm">
              <h3 className="text-slate-900 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={16} className="text-sky-500" />
                Diagnostic Chat
              </h3>
              <p className="text-sm text-slate-500">
                Use the floating chat button in the bottom right corner of your screen to talk to the AI Diagnostic Assistant.
              </p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6 max-w-xl">
            <div className="bg-white/40 border border-slate-200 p-6 rounded-[24px] space-y-4 shadow-sm">
              <h3 className="text-slate-900 font-bold text-sm uppercase tracking-widest mb-2">System Controls</h3>
              <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-sm font-medium">
                <Settings size={18} />
                ECU Configuration
              </button>
              <button className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-sm border border-red-200 font-medium">
                <AlertCircle size={18} />
                Clear Fault Codes
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500/30 overflow-hidden">
      <DriverAura behavior={behavior} />
      
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarCollapsed ? 80 : 280 }}
        className="relative z-20 bg-white/80 backdrop-blur-2xl border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm"
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200 h-20">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/30 shrink-0">
                <Activity className="text-sky-500" size={20} />
              </div>
              <span className="font-bold tracking-tight whitespace-nowrap text-lg text-slate-900">Smart ECU</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors",
              isSidebarCollapsed ? "mx-auto" : ""
            )}
          >
            {isSidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Overview" id="overview" />
          <SidebarItem icon={Gauge} label="Live Telemetry" id="telemetry" />
          <SidebarItem icon={Wrench} label="Diagnostics" id="diagnostics" />
          <SidebarItem icon={Sparkles} label="AI Assistant" id="assistant" />
          <SidebarItem icon={Settings} label="Settings" id="settings" />
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className={cn("flex items-center gap-3", isSidebarCollapsed ? "justify-center" : "")}>
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-xl shrink-0 border border-slate-200" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-slate-900">{user.displayName}</div>
                <div className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user.email}</div>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200/50 bg-slate-50/50 backdrop-blur-sm h-20">
          <div>
            <h2 className="text-xl font-bold capitalize text-slate-900">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", 
                behavior === "Economical" ? "bg-emerald-500" : behavior === "Moderate" ? "bg-amber-500" : "bg-red-500"
              )} />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                {behavior} Mode Active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-sm">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

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
  <div className="bg-white/60 backdrop-blur-md border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-sm">
    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
      <Icon size={18} color={color} />
    </div>
    <div className="text-center">
      <div className="text-xl font-mono font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label} ({unit})</div>
    </div>
  </div>
);
