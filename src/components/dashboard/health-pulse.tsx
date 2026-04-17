"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface HealthPulseProps {
  score: number;
  lastScanDate: string; // ISO string
}

export function HealthPulse({ score, lastScanDate }: HealthPulseProps) {
  const now = Date.now();
  const scanTime = new Date(lastScanDate).getTime();
  const daysSince = (now - scanTime) / (1000 * 60 * 60 * 24);
  const overdue = daysSince >= 7;

  // Tiny dot: green / amber / red
  const dotColor =
    score >= 70 ? "#10B981" :
    score >= 40 ? "#F59E0B" : "#EF4444";

  const statusLabel =
    score >= 70 ? "Healthy" :
    score >= 40 ? "Needs attention" : "Critical";

  const relativeTime = formatDistanceToNow(new Date(lastScanDate), { addSuffix: true });

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
      {/* Tiny breathing dot - barely visible unless you look */}
      <span
        className="relative inline-flex w-2 h-2 flex-shrink-0"
      >
        {/* Outer glow ring - very subtle */}
        <span
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            backgroundColor: dotColor,
            animation: "health-pulse 2.4s ease-in-out infinite",
          }}
        />
        {/* Solid inner dot */}
        <span
          className="relative inline-flex rounded-full w-2 h-2"
          style={{ backgroundColor: dotColor }}
        />
      </span>

      <span className="flex items-center gap-1">
        {statusLabel}
        <InfoTooltip
          content="Green = healthy (70+), Amber = needs attention (40-69), Red = critical (below 40)"
          side="top"
        />
      </span>
      <span className="text-[var(--muted-foreground)]/50">·</span>
      <span>
        {overdue ? (
          <Link
            href="/scan"
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Overdue - scan now
          </Link>
        ) : (
          <span>Scanned {relativeTime}</span>
        )}
      </span>
    </div>
  );
}
