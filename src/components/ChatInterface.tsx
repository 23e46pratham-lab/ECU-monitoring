import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, X, Bot, User, Loader2, Minimize2 } from "lucide-react";
import { getChatResponse } from "../services/geminiService";
import { TelemetryData } from "../types";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryData;
}

type Message = { role: "user" | "model"; text: string; ts: number };

const QUICK_QUERIES = [
  "Why is my coolant temp high?",
  "What does my fuel trim mean?",
  "Explain my driving behavior score",
  "Should I be worried about my O2 sensor?",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose, telemetry }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "ECU Guardian AI online. I have full access to your vehicle's live telemetry. Ask me anything about your engine, sensors, or maintenance needs.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setIsTyping(true);

    try {
      const response = await getChatResponse(text, telemetry);
      setMessages((prev) => [...prev, { role: "model", text: response, ts: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "model",
        text: "ERR: Unable to process request. Check API connectivity.",
        ts: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 right-0 bottom-0 w-96 flex flex-col z-[100]"
          style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center"
                style={{ border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.08)" }}>
                <Bot size={16} style={{ color: "var(--cyan)" }} />
              </div>
              <div>
                <div className="hud-display text-sm font-bold" style={{ color: "var(--cyan)" }}>AI DIAGNOSTIC CHAT</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-data-tick" style={{ background: "var(--green)" }} />
                  <span className="hud-label text-[9px]" style={{ color: "var(--green)" }}>ONLINE · TELEMETRY LINKED</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onClose} className="p-1.5 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Live telemetry strip */}
          <div className="px-3 py-2 border-b flex items-center gap-3 overflow-x-auto"
            style={{ borderColor: "var(--border)", background: "rgba(0,212,255,0.03)" }}>
            {[
              { label: "RPM", val: telemetry.rpm.toLocaleString(), color: "var(--cyan)" },
              { label: "SPD", val: `${telemetry.vss}km/h`, color: "var(--purple)" },
              { label: "TEMP", val: `${telemetry.coolantTemp}°C`, color: telemetry.coolantTemp > 100 ? "var(--red)" : "var(--amber)" },
              { label: "LOAD", val: `${telemetry.engineLoad}%`, color: "var(--amber)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-1 shrink-0">
                <span className="hud-label text-[9px]">{label}</span>
                <span style={{ fontFamily: "Share Tech Mono", fontSize: 11, color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scroll-area px-3 py-4 space-y-3">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-1"
                  style={{
                    border: `1px solid ${msg.role === "user" ? "rgba(155,93,229,0.4)" : "rgba(0,212,255,0.4)"}`,
                    background: msg.role === "user" ? "rgba(155,93,229,0.08)" : "rgba(0,212,255,0.08)",
                  }}>
                  {msg.role === "user"
                    ? <User size={12} style={{ color: "var(--purple)" }} />
                    : <Bot size={12} style={{ color: "var(--cyan)" }} />}
                </div>
                <div className="max-w-[80%]">
                  <div className="px-3 py-2.5 text-sm leading-relaxed"
                    style={{
                      background: msg.role === "user" ? "rgba(155,93,229,0.08)" : "rgba(0,212,255,0.05)",
                      border: `1px solid ${msg.role === "user" ? "rgba(155,93,229,0.25)" : "rgba(0,212,255,0.2)"}`,
                      color: "var(--text-secondary)",
                      fontFamily: "Barlow, sans-serif",
                      borderLeft: `2px solid ${msg.role === "user" ? "var(--purple)" : "var(--cyan)"}`,
                    }}>
                    {msg.text}
                  </div>
                  <div className="hud-label text-[8px] mt-1 px-1" style={{ color: "var(--text-muted)" }}>
                    {formatTime(msg.ts)}
                  </div>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                <div className="w-6 h-6 flex items-center justify-center"
                  style={{ border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.08)" }}>
                  <Bot size={12} style={{ color: "var(--cyan)" }} />
                </div>
                <div className="px-3 py-2.5 flex items-center gap-2"
                  style={{ border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.05)", borderLeft: "2px solid var(--cyan)" }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: "var(--cyan)" }} />
                  <span className="hud-label text-[10px]" style={{ color: "var(--text-muted)" }}>ANALYZING TELEMETRY...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick queries */}
          <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="hud-label text-[9px] mb-2" style={{ color: "var(--text-muted)" }}>QUICK QUERIES</div>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_QUERIES.map((q) => (
                <button key={q} onClick={() => sendMessage(q)} disabled={isTyping}
                  className="text-left px-2 py-1.5 text-[10px] transition-all disabled:opacity-50 hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "rgba(0,0,0,0.3)", fontFamily: "Barlow, sans-serif" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Query the AI diagnostic engine..."
                className="hud-input flex-1 px-3 py-2 text-sm rounded-none"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="btn-hud btn-cyan px-3 py-2 disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
