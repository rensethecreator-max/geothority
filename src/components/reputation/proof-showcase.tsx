import { MessageSquareQuote, Sparkles, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReputationProofSummary } from "@/lib/reputation/types";

export function formatTriggerSource(triggerSource: string | null | undefined) {
  if (!triggerSource) return "Manual";
  return triggerSource
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProofShowcase({
  summary,
  title = "Trust proof in motion",
  description = "Positive replies become reusable proof snippets you can deploy across trust surfaces.",
  ctaHref,
  ctaLabel,
  compact = false,
}: {
  summary: ReputationProofSummary;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="geo-premium-card rounded-3xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Reputation proof
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        </div>
        {ctaHref && ctaLabel ? (
          <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300">
            {ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-3" : "lg:grid-cols-[0.9fr_1.1fr]"}`}>
        <div className={`grid gap-3 ${compact ? "md:grid-cols-3" : "sm:grid-cols-3"}`}>
          <ProofMetric label="Requests tracked" value={`${summary.totalRequests}`} icon={TrendingUp} />
          <ProofMetric label="Public-ready wins" value={`${summary.publicReady}`} icon={Star} />
          <ProofMetric label="Avg. reply score" value={summary.averageScore ? `${summary.averageScore}/5` : "—"} icon={MessageSquareQuote} />
        </div>

        {!compact && (
          <div className="space-y-3">
            {summary.proofAssets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">
                No proof snippets yet. Once a positive reply includes written feedback, it will show up here ready for approval.
              </div>
            ) : (
              summary.proofAssets.map((asset) => (
                <div key={asset.id} className="geo-proof-card rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                    <span className="rounded-full border border-white/10 px-2 py-1">{asset.approved ? "Approved" : "Awaiting approval"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">“{asset.snippet}”</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProofMetric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <Icon className="h-3.5 w-3.5 text-electric-500" /> {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">{value}</div>
    </div>
  );
}
