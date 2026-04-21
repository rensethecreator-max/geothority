"use client";

import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Plain text OR rich content */
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  iconClassName?: string;
  /** Delay in ms before showing (default 200) - kept for API compat */
  delayDuration?: number;
  maxWidth?: string;
}

/**
 * A small ⓘ icon that shows a rich tooltip on hover (desktop) or tap (mobile).
 * Wraps in its own TooltipProvider so it's self-contained.
 */
export function InfoTooltip({
  content,
  side = "top",
  className,
  iconClassName,
  delayDuration = 200,
  maxWidth = "320px",
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500",
              className
            )}
          >
            <Info className={cn("w-3.5 h-3.5", iconClassName)} />
            <span className="sr-only">More information</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} style={{ maxWidth }}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Layer Tooltip Content ────────────────────────────────────────────────────

interface LayerTooltipContentProps {
  what: string;
  why: string;
  how: string;
}

export function LayerTooltipContent({ what, why, how }: LayerTooltipContentProps) {
  return (
    <div className="space-y-2 leading-relaxed">
      <div>
        <span className="font-semibold text-white/80 uppercase tracking-wide text-[10px]">What</span>
        <p className="mt-0.5 text-white/90">{what}</p>
      </div>
      <div>
        <span className="font-semibold text-white/80 uppercase tracking-wide text-[10px]">Why it matters</span>
        <p className="mt-0.5 text-white/90">{why}</p>
      </div>
      <div>
        <span className="font-semibold text-white/80 uppercase tracking-wide text-[10px]">How we check</span>
        <p className="mt-0.5 text-white/90">{how}</p>
      </div>
    </div>
  );
}

// ─── Layer definitions ────────────────────────────────────────────────────────

export const LAYER_TOOLTIP_DATA: Record<
  number,
  { what: string; why: string; how: string }
> = {
  1: {
    what: "Your business name, address, and phone number across Google and directories",
    why: "Google checks if your info is the same everywhere. Inconsistencies confuse search engines and cost you rankings.",
    how: "We scan your Google Business Profile and 18+ directories to verify everything matches perfectly.",
  },
  2: {
    what: "Essential pages that prove you're a real, established local business",
    why: "Google and AI assistants need these pages to understand who you are, what you do, and where you serve.",
    how: "We check for About, Service Area, FAQ, and Team pages - the trust signals that separate professionals from fly-by-nights.",
  },
  3: {
    what: "Locally-optimized content targeting your specific cities and services",
    why: "Without city-specific pages, you're invisible for '[city] insurance agent' searches - the #1 way customers find you.",
    how: "We analyze your content for local relevance, keyword targeting, and geographic signals that Google needs to rank you locally.",
  },
  4: {
    what: "Your review profile - how many, how recent, and whether you respond",
    why: "Reviews are the #1 factor in Google Maps rankings. A competitor with more recent reviews will outrank you even with worse SEO.",
    how: "We track your review count, average rating, recency of reviews, and response rate compared to local competitors.",
  },
  5: {
    what: "Technical signals that help AI assistants recommend your business",
    why: "ChatGPT, Perplexity, Google AI, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere are replacing traditional search. Without proper schema and entity markup, AI won't know you exist.",
    how: "We check for structured data, FAQ schema, entity density, and the signals that get you cited in AI-powered answers.",
  },
};

/**
 * Convenience: InfoTooltip pre-loaded with a Trust Stack layer's What/Why/How.
 */
export function LayerInfoTooltip({
  layerNum,
  side = "top",
}: {
  layerNum: number;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const data = LAYER_TOOLTIP_DATA[layerNum];
  if (!data) return null;
  return (
    <InfoTooltip
      content={<LayerTooltipContent {...data} />}
      side={side}
      maxWidth="320px"
    />
  );
}
