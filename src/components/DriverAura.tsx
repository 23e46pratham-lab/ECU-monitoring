import React from "react";
import { motion } from "motion/react";
import { DriverBehavior } from "../types";

interface DriverAuraProps {
  behavior: DriverBehavior;
}

export const DriverAura: React.FC<DriverAuraProps> = ({ behavior }) => {
  const colors = {
    Economical: "rgba(16, 185, 129, 0.05)", // Emerald
    Moderate: "rgba(245, 158, 11, 0.05)", // Amber
    Harsh: "rgba(239, 68, 68, 0.05)", // Red
  };

  const glowColors = {
    Economical: "#10B981",
    Moderate: "#F59E0B",
    Harsh: "#EF4444",
  };

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[-1]"
      animate={{
        backgroundColor: colors[behavior],
        boxShadow: `inset 0 0 150px ${glowColors[behavior]}11`,
      }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#F8FAFC_100%)]" />
      
      {/* Animated Mesh Gradient Simulation */}
      <motion.div
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-10"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${glowColors[behavior]} 0%, transparent 50%),
                       radial-gradient(circle at 70% 70%, ${glowColors[behavior]} 0%, transparent 50%)`,
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: behavior === "Harsh" ? 10 : 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};
