"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X, ArrowRight, Star } from "lucide-react";

const DISMISS_KEY = "reputation_engine_banner_dismissed";

interface ReputationEngineBannerProps {
  /** Raw review health score 0-100 (from layer_scores.layer4) */
  reviewHealthScore: number;
  /** Actual star rating 0-5 if available (e.g. from GBP audit) */
  reviewScore?: number;
  /** Total review count if available */
  reviewCount?: number;
  onDismiss?: () => void;
}

export function ReputationEngineBanner({
  reviewHealthScore,
  reviewScore,
  reviewCount,
  onDismiss,
}: ReputationEngineBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY) === "true";
    setDismissed(isDismissed);
  }, []);

  const displayScore = reviewScore ?? (reviewHealthScore / 100) * 5;
  const lowScore = displayScore < 4.5;
  const lowCount = reviewCount !== undefined && reviewCount < 10;
  const shouldShow = lowScore || lowCount;

  if (!shouldShow || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
    onDismiss?.();
  }

  const starDisplay = displayScore.toFixed(1);
  const countDisplay = reviewCount !== undefined ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "limited review volume";

  return (
    <div className="relative border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-r-xl p-5 pr-12 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-amber-500/60 hover:text-amber-500 transition-colors"
        aria-label="Dismiss reputation engine banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Your Google rating: {starDisplay} stars ({countDisplay})
            </p>
          </div>

          <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">
            Review momentum affects trust and click-through, especially when competitors are collecting fresh feedback more consistently.
          </p>

          <p className="text-sm text-amber-600 dark:text-amber-500">
            <span className="font-bold text-amber-700 dark:text-amber-300">
              Reputation Engine
            </span>{" "}
            helps automate review requests, route private feedback, and keep your follow-up process consistent inside Geothority.
          </p>
        </div>

        <Link
          href="/reputation"
          className="flex-shrink-0 flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          Open Reputation Engine
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
