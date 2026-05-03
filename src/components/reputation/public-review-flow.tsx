"use client";

import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";

interface ReviewTemplateView {
  id: string;
  categoryLabel: string;
  icon: string;
  filledText: string;
}

interface PublicReviewFlowProps {
  token: string;
  businessName: string;
  googleUrl: string;
  templates: ReviewTemplateView[];
  alreadyUsed: boolean;
}

export function PublicReviewFlow({ token, businessName, googleUrl, templates, alreadyUsed }: PublicReviewFlowProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [banner, setBanner] = useState(false);

  async function trackReviewAction(action: "open_google" | "use_template", templateId?: string) {
    try {
      await fetch(`/api/review/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, templateId }),
        keepalive: true,
      });
    } catch {
      // Non-blocking tracking only.
    }
  }

  function openGoogleReview() {
    void trackReviewAction("open_google");
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  }

  async function handleTemplateClick(template: ReviewTemplateView) {
    try {
      await navigator.clipboard.writeText(template.filledText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = template.filledText;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    void trackReviewAction("use_template", template.id);
    setCopiedId(template.id);
    setBanner(true);
    setTimeout(() => openGoogleReview(), 140);
    setTimeout(() => {
      setBanner(false);
      setCopiedId(null);
    }, 7000);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_35%),var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-2xl space-y-6">
        {banner ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-200">
            Review copied — Google Reviews is opening now. Paste and you’re done.
          </div>
        ) : null}

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <Star className="h-3.5 w-3.5" /> Quick review flow
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Help others find {businessName}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Pick a review that sounds like you. We’ll copy it and open Google so you can paste it in one step.
          </p>
        </div>

        {alreadyUsed ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            You’ve already used this review link once — thank you. You can still open Google and write your own if you’d like.
          </div>
        ) : null}

        <div className="space-y-4">
          {templates.map((template) => {
            const copied = copiedId === template.id;
            return (
              <div key={template.id} className={`rounded-3xl border bg-[var(--card)]/95 ${copied ? "border-emerald-500/30" : "border-white/10"}`}>
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{template.icon}</span>
                    <span>{template.categoryLabel}</span>
                  </div>
                  <div className="text-amber-400">★★★★★</div>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <p className="text-sm leading-7 text-[var(--foreground)]/90">“{template.filledText}”</p>
                  <button
                    onClick={() => handleTemplateClick(template)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                  >
                    <Star className="h-4 w-4" /> Use this review
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={openGoogleReview}
            className="inline-flex items-center gap-2 text-sm font-medium text-electric-500 hover:text-electric-400"
          >
            Prefer to write your own? Open Google Reviews <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
