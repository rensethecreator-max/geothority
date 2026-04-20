"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Settings } from "lucide-react";
import Link from "next/link";

interface KeyStatus {
  key: string;
  configured: boolean;
  required: boolean;
  impact: string;
  category: "critical" | "recommended" | "optional";
}

export function SetupChecklist() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/diagnostics/keys")
      .then((r) => r.json())
      .then((data) => {
        setKeys(data.keys ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || keys.length === 0) return null;

  const criticalMissing = keys.filter((k) => !k.configured && k.category === "critical");
  const recommendedMissing = keys.filter((k) => !k.configured && k.category === "recommended");

  // Only show if there are missing keys
  if (criticalMissing.length === 0 && recommendedMissing.length === 0) return null;

  const visibleKeys = expanded
    ? [...criticalMissing, ...recommendedMissing]
    : criticalMissing.slice(0, 3);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">
            {criticalMissing.length > 0
              ? `${criticalMissing.length} critical API key${criticalMissing.length > 1 ? "s" : ""} missing`
              : `${recommendedMissing.length} recommended key${recommendedMissing.length > 1 ? "s" : ""} not configured`}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Some features will show simulated or limited results until these are configured.
          </p>

          <div className="space-y-2">
            {visibleKeys.map((k) => (
              <div key={k.key} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${k.category === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
                <span className="font-medium">{k.key}</span>
                <span className="text-[var(--muted-foreground)]">— {k.impact}</span>
              </div>
            ))}
          </div>

          {!expanded && (criticalMissing.length > 3 || recommendedMissing.length > 0) && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-xs text-electric-500 hover:underline flex items-center gap-1"
            >
              Show all missing keys
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-2 text-xs text-electric-500 hover:underline flex items-center gap-1"
            >
              Show less
              <ChevronUp className="w-3 h-3" />
            </button>
          )}

          <div className="mt-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-electric-500 hover:underline"
            >
              <Settings className="w-3 h-3" />
              Configure in Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
