"use client";

import { useState } from "react";
import { Copy, Check, Zap, ArrowRight, Clock, CheckSquare, Square } from "lucide-react";
import type { QuickWin } from "@/lib/types";

interface QuickWinCardProps {
  win: QuickWin;
  featured?: boolean;
  scanId?: string;
  index?: number;
}

// Small inline pill config — restrained, not loud
const IMPACT_CONFIG = {
  high: {
    label: "High impact",
    pill: "text-red-400/90 bg-red-500/8 border border-red-500/15",
    time: "~2 hr",
  },
  medium: {
    label: "Medium",
    pill: "text-amber-400/90 bg-amber-500/8 border border-amber-500/15",
    time: "~30 min",
  },
  low: {
    label: "Quick fix",
    pill: "text-emerald-400/90 bg-emerald-500/8 border border-emerald-500/15",
    time: "~5 min",
  },
} as const;

export function QuickWinCard({ win, featured = false, scanId, index = 0 }: QuickWinCardProps) {
  const [copied, setCopied] = useState(false);
  const storageKey = scanId ? `qw-done-${scanId}-${index}` : null;

  const [done, setDone] = useState(() => {
    if (!storageKey || typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(win.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDone = () => {
    const next = !done;
    setDone(next);
    if (storageKey) {
      try { next ? localStorage.setItem(storageKey, "1") : localStorage.removeItem(storageKey); }
      catch { /* ignore */ }
    }
  };

  const cfg = IMPACT_CONFIG[win.impact] ?? IMPACT_CONFIG.medium;

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 ${
        done ? "opacity-50" : "opacity-100"
      } ${
        featured
          ? "border-electric-500/30 bg-electric-500/4"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      {/* Meta row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {featured && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-electric-500 bg-electric-500/8 border border-electric-500/20 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5" />
              Quick Win
            </span>
          )}
          {/* Impact pill — small & inline */}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.pill}`}>
            {cfg.label}
          </span>
          {/* Time estimate */}
          <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
            <Clock className="w-2.5 h-2.5" />
            {cfg.time}
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">Layer {win.layer}</span>
        </div>

        {/* Mark done — quiet toggle */}
        <button
          onClick={toggleDone}
          className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 transition-colors ${
            done
              ? "text-emerald-400 bg-emerald-500/8"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          title={done ? "Unmark" : "Mark as done"}
        >
          {done ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{done ? "Done" : "Mark done"}</span>
        </button>
      </div>

      <h4 className={`text-sm font-semibold mb-1.5 leading-snug ${done ? "line-through text-[var(--muted-foreground)]" : ""}`}>
        {win.title}
      </h4>
      <p className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed">
        {win.description}
      </p>

      <div className="relative bg-[var(--background)] rounded-lg p-3 mb-3 border border-[var(--border)]">
        <pre className="text-xs text-[var(--muted-foreground)] overflow-x-auto whitespace-pre-wrap max-h-28 leading-relaxed">
          {win.copyText}
        </pre>
      </div>

      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
          copied
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-electric-500 hover:bg-electric-600 text-white"
        }`}
      >
        {copied ? (
          <><Check className="w-3.5 h-3.5" /> Copied</>
        ) : (
          <><Copy className="w-3.5 h-3.5" /> Copy & Go <ArrowRight className="w-3 h-3" /></>
        )}
      </button>
    </div>
  );
}
