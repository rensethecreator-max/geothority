"use client";

import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";

interface PublicReviewFlowProps {
  token: string;
  businessName: string;
  googleUrl: string;
  hasPriorResponse: boolean;
  brand?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    motif?: string | null;
    tone?: string | null;
  } | null;
}

export function PublicReviewFlow({ token, businessName, googleUrl, hasPriorResponse, brand }: PublicReviewFlowProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [allowQuote, setAllowQuote] = useState(false);
  const [submitted, setSubmitted] = useState(hasPriorResponse);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryColor = brand?.primaryColor || "#2563eb";
  const accentColor = brand?.accentColor || "#10b981";

  async function submitPrivateFeedback() {
    if (!score) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/review/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_feedback", score, feedbackText, allowQuote }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "We couldn’t save your feedback. Please try again.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn’t save your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function recordGoogleOpen() {
    void fetch(`/api/review/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open_google" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <main
      className="min-h-screen px-4 py-10 text-[var(--foreground)]"
      style={{ background: `radial-gradient(circle at top, ${primaryColor}18, transparent 34%), var(--background)` }}
    >
      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-[var(--card)]/95 p-6 shadow-2xl shadow-black/10 sm:p-8">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt={`${businessName} logo`} className="mx-auto mb-5 max-h-16 max-w-[220px] object-contain" />
          ) : (
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: primaryColor }}>
              <Star className="h-6 w-6" />
            </div>
          )}

          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Your experience matters</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">How was your experience with {businessName}?</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              You can share private feedback, write an honest public review, do both, or skip either option. Your rating never changes the choices shown here.
            </p>
          </div>

          {submitted ? (
            <div className="mt-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-center text-sm leading-6 text-emerald-100">
              Thank you for sharing your rating. {allowQuote && feedbackText.trim() ? "You gave the business permission to review your note as a possible quote; nothing is published automatically. " : ""}You can still share an honest review publicly if you choose.
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              <fieldset>
                <legend className="mb-3 text-sm font-medium">Private rating (optional)</legend>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScore(value)}
                      aria-label={`${value} out of 5 stars`}
                      aria-pressed={score === value}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        borderColor: score && value <= score ? accentColor : "rgba(148,163,184,0.35)",
                        background: score && value <= score ? `${accentColor}22` : "transparent",
                        color: score && value <= score ? accentColor : "var(--muted-foreground)",
                      }}
                    >
                      <Star className={`h-6 w-6 ${score && value <= score ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-medium" htmlFor="private-feedback">Private note (optional)</label>
              <textarea
                id="private-feedback"
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                maxLength={2000}
                placeholder="Tell the team anything you’d like them to know."
                className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:border-white/25"
              />
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/5 p-3 text-xs leading-5 text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={allowQuote}
                  onChange={(event) => setAllowQuote(event.target.checked)}
                  disabled={!feedbackText.trim()}
                  className="mt-1 h-4 w-4 accent-emerald-500"
                />
                <span>I give {businessName} permission to review my written note as a possible quote on its website or marketing materials. The business must approve it before use. Leaving this unchecked keeps your note private.</span>
              </label>
              {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
              <button
                type="button"
                disabled={!score || submitting}
                onClick={submitPrivateFeedback}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving feedback…" : "Send private feedback"}
              </button>
            </div>
          )}

          {googleUrl ? (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={recordGoogleOpen}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Write an honest Google review <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}

          <p className="mt-4 text-center text-xs leading-5 text-[var(--muted-foreground)]">
            A public review is optional. Please use your own words and share only what reflects your experience.
          </p>
        </section>
      </div>
    </main>
  );
}
