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
  initialStatus?: string;
  brand?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    motif?: string | null;
    tone?: string | null;
  } | null;
}

export function PublicReviewFlow({ token, businessName, googleUrl, templates, alreadyUsed, initialStatus = "public_review_ready", brand }: PublicReviewFlowProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [banner, setBanner] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryColor = brand?.primaryColor || "#4f46e5";
  const accentColor = brand?.accentColor || primaryColor;

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

  async function submitFeedback() {
    if (!score) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/review/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_feedback", score, feedbackText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit feedback");
      setStatus(json.status || (score >= 4 ? "public_review_ready" : "feedback_received"));
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
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

  const isPublicReady = status === "public_review_ready";
  const isPrivateRecovery = status === "feedback_received";

  if (!isPublicReady) {
    return (
      <div
        className="min-h-screen px-4 py-10 text-[var(--foreground)]"
        style={{
          background: `radial-gradient(circle at top, ${primaryColor}18, transparent 34%), var(--background)`,
        }}
      >
        <div className="mx-auto max-w-xl space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[var(--card)]/95 p-6 text-center shadow-2xl shadow-black/10">
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt={`${businessName} logo`} className="mx-auto mb-5 max-h-16 max-w-[220px] object-contain" />
            ) : (
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ background: primaryColor }}>
                <Star className="h-7 w-7" />
              </div>
            )}
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Private feedback</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">How was your experience with {businessName}?</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Your answer starts privately. Happy customers can share on Google after this step, and unhappy customers can be heard before anything goes public.
            </p>

            {isPrivateRecovery ? (
              <div className="mt-7 space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-100">
                  Thanks for telling us. Your feedback was sent privately so the team can review it and follow up.
                </div>
                <button
                  type="button"
                  onClick={openGoogleReview}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/5"
                >
                  Still want to post publicly? Open Google Reviews <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScore(value)}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border transition"
                      style={{
                        borderColor: score && value <= score ? accentColor : "rgba(148,163,184,0.35)",
                        background: score && value <= score ? `${accentColor}22` : "transparent",
                        color: score && value <= score ? accentColor : "var(--muted-foreground)",
                      }}
                      aria-label={`${value} star rating`}
                    >
                      <Star className={`h-6 w-6 ${score && value <= score ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder={score && score < 4 ? "Tell us what went wrong so the team can make it right." : "Optional: what made the experience good?"}
                  className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none ring-0 placeholder:text-[var(--muted-foreground)] focus:border-white/25"
                />
                {error ? <div className="text-sm text-rose-300">{error}</div> : null}
                <button
                  type="button"
                  disabled={!score || submitting}
                  onClick={submitFeedback}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: primaryColor }}
                >
                  {submitting ? "Sending..." : score && score >= 4 ? "Continue" : "Send private feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
          {brand?.logoUrl ? <img src={brand.logoUrl} alt={`${businessName} logo`} className="mx-auto mb-5 max-h-14 max-w-[220px] object-contain" /> : null}
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
