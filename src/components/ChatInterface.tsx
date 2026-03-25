import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, X } from "lucide-react";
import { createDiagnosticChat } from "../services/geminiService";
import { ChatMessage } from "../types";

export const ChatInterface: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = createDiagnosticChat();
      }

      const response = await chatRef.current.sendMessage({ message: input });
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: response.text || "I'm sorry, I couldn't process that.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#9D4EDD] rounded-full flex items-center justify-center shadow-[0_0_20px_#9D4EDD] z-50"
      >
        <Bot color="white" size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-[#1A2235] border border-[#2D3748] rounded-[24px] shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#9D4EDD] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot color="white" size={24} />
                <div>
                  <h3 className="text-white font-bold text-sm">Diagnostic AI</h3>
                  <p className="text-[10px] text-purple-200 uppercase">Always Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="text-center mt-10 space-y-2">
                  <Bot className="mx-auto text-gray-500" size={40} />
                  <p className="text-gray-400 text-sm">How can I help with your vehicle today?</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-[#00E5FF] text-black rounded-tr-none"
                        : "bg-[#2D3748] text-white rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#2D3748] p-3 rounded-2xl rounded-tl-none">
                    <Loader2 className="animate-spin text-gray-400" size={18} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-[#0B0F19] border-t border-[#2D3748]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about DTCs, maintenance..."
                  className="flex-1 bg-[#1A2235] border border-[#2D3748] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#9D4EDD]"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-[#9D4EDD] p-2 rounded-xl text-white disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
