"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ReviewHealthCard } from "@/components/reputation/review-health-card";
import { ProofShowcase } from "@/components/reputation/proof-showcase";
import type { ReputationAnalyticsSummary, ReputationProofSummary } from "@/lib/reputation/types";

interface TrustScore {
  id: string;
  nap_consistency: number;
  citation_coverage: number;
  review_velocity: number;
  review_rating: number;
  gbp_completeness: number;
  schema_presence: number;
  content_depth: number;
  ai_visibility: number;
  overall_trust_score: number;
  trust_tier: string;
  signals_breakdown: Record<string, { score: number; weight: number; label: string }>;
  last_computed_at: string;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  platinum: { color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Platinum", icon: "💎" },
  gold: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Gold", icon: "🥇" },
  silver: { color: "text-gray-300", bg: "bg-gray-400/10", label: "Silver", icon: "🥈" },
  bronze: { color: "text-orange-400", bg: "bg-orange-500/10", label: "Bronze", icon: "🥉" },
  unrated: { color: "text-red-400", bg: "bg-red-500/10", label: "Unrated", icon: "⚠️" },
};

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500/40";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-40 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(score, 2)}%` }} />
      </div>
      <span className="text-sm font-bold w-10 text-right">{score}</span>
      <span className="text-[10px] text-[var(--muted-foreground)] w-12 text-right">{Math.round(weight * 100)}%</span>
    </div>
  );
}

export default function TrustScorePage() {
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [score, setScore] = useState<TrustScore | null>(null);
  const [proofSummary, setProofSummary] = useState<ReputationProofSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scoreRes, proofRes] = await Promise.all([
        fetch("/api/trust-score", { cache: "no-store" }),
        fetch("/api/reputation/proof-summary", { cache: "no-store" }),
      ]);
      const data = await scoreRes.json();
      const proofData = await proofRes.json().catch(() => ({}));
      setScore(data.score);
      setProofSummary(proofData.summary ?? null);
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      const res = await fetch("/api/trust-score", { method: "POST" });
      const data = await res.json();
      setScore(data.score);
    } catch { /* handled */ } finally {
      setComputing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-electric-500 animate-spin" /></div>;
  }

  const tier = TIER_CONFIG[score?.trust_tier ?? "unrated"] ?? TIER_CONFIG.unrated;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-electric-500" />
            Trust Score
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Your aggregated trust signal score across NAP, citations, reviews, GBP, schema, content, and AI visibility
          </p>
        </div>
        <button
          onClick={handleCompute}
          disabled={computing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm font-medium hover:border-electric-500/30 transition-colors disabled:opacity-50"
        >
          {computing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recompute
        </button>
      </div>

      {!score ? (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-8 text-center">
          <Shield className="w-12 h-12 text-electric-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Trust Score Yet</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Click &ldquo;Recompute&rdquo; to calculate your trust signal score.</p>
        </div>
      ) : (
        <>
          {/* Overall score + tier */}
          <div className={`rounded-2xl border p-6 ${tier.bg} border-current/20`}>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl mb-1">{tier.icon}</div>
                <div className={`text-sm font-bold ${tier.color}`}>{tier.label}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold">{score.overall_trust_score}</span>
                  <span className="text-sm text-[var(--muted-foreground)]">/ 100</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Composite score weighted by signal importance. NAP consistency and citation coverage carry the most weight.
                </p>
                <div className="text-xs text-[var(--muted-foreground)] mt-2">
                  Last computed: {new Date(score.last_computed_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Signal breakdown */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="font-semibold mb-4">Signal Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(score.signals_breakdown || {}).map(([key, signal]: [string, any]) => (
                <ScoreBar key={key} label={signal.label} score={signal.score} weight={signal.weight} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-medium">Weighted Total</span>
              <span className="text-lg font-bold">{score.overall_trust_score}</span>
            </div>
          </div>

          <ReviewHealthCard
            reviewHealthScore={score.review_velocity}
            reviewScore={Number(score.review_rating.toFixed(1))}
          />

          {proofSummary && (
            <>
              <ProofShowcase
                summary={proofSummary}
                title="Proof assets ready to reinforce your Trust Score"
                description="Every positive reply can become a reusable proof snippet. Keep the trust story tight by routing happy customers into public-ready wins."
                ctaHref="/reputation"
                ctaLabel="Open Reputation Engine"
              />
              <ReputationMomentumCard analytics={proofSummary.analytics} />
            </>
          )}

          {/* Tier thresholds */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="font-semibold mb-3">Trust Tiers</h2>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                <div key={key} className={`text-center p-3 rounded-lg border ${score.trust_tier === key ? cfg.bg + " " + cfg.color + " font-bold" : "border-[var(--border)]"}`}>
                  <div className="text-xl">{cfg.icon}</div>
                  <div className="text-xs mt-1">{cfg.label}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    {key === "platinum" ? "85+" : key === "gold" ? "70+" : key === "silver" ? "50+" : key === "bronze" ? "25+" : "<25"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReputationMomentumCard({ analytics }: { analytics: ReputationAnalyticsSummary }) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Reputation momentum</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">A compact ops readout from the same request and feedback pipeline.</p>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">Top source: {analytics.sourcePerformance[0] ? analytics.sourcePerformance[0].triggerSource.replace(/_/g, " ") : "—"}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
        <MomentumStat label="Reply rate" value={`${analytics.replyRate}%`} detail={`${analytics.repliedCount}/${analytics.requestsSent} replied`} />
        <MomentumStat label="Positive rate" value={`${analytics.positiveRate}%`} detail={`${analytics.positiveCount} public-ready`} />
        <MomentumStat label="Proof gen" value={`${analytics.proofGenerationRate}%`} detail={`${analytics.proofGeneratedCount} snippets`} />
        <MomentumStat label="Open recovery" value={`${analytics.recovery.unresolved}`} detail={`${analytics.recovery.resolved} resolved`} />
      </div>
    </div>
  );
}

function MomentumStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)] font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</div>
    </div>
  );
}
