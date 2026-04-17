"use client";

import React from "react";
import { InfoTooltip } from "./info-tooltip";

/**
 * Homepage-specific tooltip: wraps InfoTooltip with the dark premium
 * styling and benefit-oriented copy the Geothority redesign demands.
 *
 * Usage: <GeoTooltip tip="Your benefit-oriented copy here" />
 */
export function GeoTooltip({
  tip,
  side = "top",
  className,
  iconClassName,
}: {
  tip: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  iconClassName?: string;
}) {
  return (
    <InfoTooltip
      content={
        <div className="text-[13px] leading-relaxed text-white/90">{tip}</div>
      }
      side={side}
      maxWidth="300px"
      delayDuration={180}
      className={className}
      iconClassName={iconClassName}
    />
  );
}
