// DriverAura is no longer used as a background in the new HUD design.
// The ambient background effects are now built into the CSS grid layout.
// This file is kept for compatibility.

import React from "react";
import { DriverBehavior } from "../types";

interface DriverAuraProps {
  behavior: DriverBehavior;
}

export const DriverAura: React.FC<DriverAuraProps> = ({ behavior }) => {
  return null; // Replaced by CSS-based grid background
};
