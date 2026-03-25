import React from "react";
import { motion } from "motion/react";
import { DriverBehavior } from "../types";

interface DriverAuraProps {
  behavior: DriverBehavior;
}

export const DriverAura: React.FC<DriverAuraProps> = ({ behavior }) => {
  const colors = {
    Economical: "rgba(0, 255, 102, 0.15)",
    Moderate: "rgba(255, 215, 0, 0.15)",
    Harsh: "rgba(255, 0, 60, 0.15)",
  };

  const glowColors = {
    Economical: "#00FF66",
    Moderate: "#FFD700",
    Harsh: "#FF003C",
  };

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[-1]"
      animate={{
        backgroundColor: colors[behavior],
        boxShadow: `inset 0 0 150px ${glowColors[behavior]}44`,
      }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0B0F19_100%)]" />
      
      {/* Animated Mesh Gradient Simulation */}
      <motion.div
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-20"
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
