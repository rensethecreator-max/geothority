"use client";

import { useState } from "react";
import { Copy, Check, Zap, ArrowRight } from "lucide-react";
import type { QuickWin } from "@/lib/types";

interface QuickWinCardProps {
  win: QuickWin;
  featured?: boolean;
}

export function QuickWinCard({ win, featured = false }: QuickWinCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(win.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const impactColor = {
    high: "text-score-poor bg-score-poor/10",
    medium: "text-score-mid bg-score-mid/10",
    low: "text-score-good bg-score-good/10",
  }[win.impact];

  return (
    <div
      className={`rounded-xl border p-5 ${
        featured
          ? "border-electric-500/50 bg-electric-500/5"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {featured && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-electric-500/10 text-electric-500 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              Quick Win
            </div>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${impactColor}`}
          >
            {win.impact} impact
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            Layer {win.layer}
          </span>
        </div>
      </div>

      <h4 className="text-base font-semibold mb-2">{win.title}</h4>
      <p className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed">
        {win.description}
      </p>

      {/* Code block */}
      <div className="relative bg-[var(--background)] rounded-lg p-3 mb-3 border border-[var(--border)]">
        <pre className="text-xs text-[var(--muted-foreground)] overflow-x-auto whitespace-pre-wrap max-h-32">
          {win.copyText}
        </pre>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          copied
            ? "bg-score-good/10 text-score-good"
            : "bg-electric-500 hover:bg-electric-600 text-white"
        }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy & Go
            <ArrowRight className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
}
