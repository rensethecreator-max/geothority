"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface KeyInfo {
  key: string;
  configured: boolean;
  required: boolean;
  impact: string;
  category: "critical" | "recommended" | "optional";
}

export function ApiKeyGrid() {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
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

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-[var(--muted)]/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {keys.map((k) => (
        <div key={k.key} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 min-w-0">
            {k.configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : k.category === "critical" ? (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {k.key}
                {k.category === "critical" && !k.configured && (
                  <span className="ml-1 text-[10px] text-red-400 font-semibold">REQUIRED</span>
                )}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] truncate">{k.impact}</div>
            </div>
          </div>
          <span className={`text-xs font-medium flex-shrink-0 ml-2 ${k.configured ? "text-emerald-400" : "text-[var(--muted-foreground)]"}`}>
            {k.configured ? "✓" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
