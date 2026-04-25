"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Scan } from "@/lib/types";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { InfoTooltip, LAYER_TOOLTIP_DATA } from "@/components/ui/info-tooltip";
import {
  FileText,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Search,
  ShieldCheck,
  Sparkles,
  History,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : score >= 40
        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : "bg-red-500/10 text-red-300 border-red-500/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

function ScoreTrend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return <Minus className="h-4 w-4 text-[var(--muted-foreground)]" />;
  const diff = current - previous;
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-300">
        <TrendingUp className="h-3.5 w-3.5" />+{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-red-300">
        <TrendingDown className="h-3.5 w-3.5" />{diff}
      </span>
    );
  }
  return <Minus className="h-4 w-4 text-[var(--muted-foreground)]" />;
}

const LAYER_LABELS: Record<string, string> = {
  layer1: "Foundation",
  layer2: "Trust Pages",
  layer3: "Geo Content",
  layer4: "Reviews",
  layer5: "AI Opt.",
};

const LAYER_NUMS: Record<string, number> = {
  layer1: 1,
  layer2: 2,
  layer3: 3,
  layer4: 4,
  layer5: 5,
};

const LAYER_COLORS: Record<string, string> = {
  layer1: "#6366f1",
  layer2: "#f59e0b",
  layer3: "#3b82f6",
  layer4: "#ec4899",
  layer5: "#8b5cf6",
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadScans() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setScans([]);
          return;
        }

        const { data, error: scansError } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (scansError) throw scansError;
        setScans(data ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }

    loadScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardSkeleton />;

  const latestScore = scans[0]?.geothority_score ?? 0;
  const bestScore = scans.length ? Math.max(...scans.map((scan) => scan.geothority_score ?? 0)) : 0;
  const averageScore = scans.length
    ? Math.round(scans.reduce((sum, scan) => sum + (scan.geothority_score ?? 0), 0) / scans.length)
    : 0;
  const lastScanDate = scans[0]?.created_at ? format(new Date(scans[0].created_at), "MMM d, yyyy") : "No scans yet";

  return (
    <div className="space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-500">
              <History className="h-3.5 w-3.5" />
              Reporting archive
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Your full Trust Stack™ scan history, ready for stakeholder reviews, score tracking, and launch-quality reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Latest snapshot", value: lastScanDate, icon: Clock },
              { label: "Best recorded score", value: `${bestScore}/100`, icon: ShieldCheck },
              { label: "Average authority", value: `${averageScore}/100`, icon: Sparkles },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[180px] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <item.icon className="h-3.5 w-3.5 text-electric-500" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-electric-600"
              >
                <Search className="h-4 w-4" />
                New Scan
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-2.5 text-sm font-medium transition-colors hover:border-electric-500/40 hover:text-electric-400"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-red-100">Report history unavailable</p>
              <p className="mt-1 text-red-200/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {scans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total reports", value: scans.length, icon: FileText, color: "text-electric-500" },
            { label: "Latest score", value: `${latestScore}/100`, icon: TrendingUp, color: "text-emerald-300" },
            { label: "Best score", value: `${bestScore}/100`, icon: ShieldCheck, color: "text-amber-300" },
            { label: "Avg. score", value: `${averageScore}/100`, icon: Minus, color: "text-[var(--foreground)]" },
          ].map((stat) => (
            <div key={stat.label} className="geo-premium-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.label}
              </div>
              <div className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {scans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Run your first Trust Stack™ scan to build a premium reporting archive and start tracking score lift over time."
          actionLabel="Run your first scan"
          actionHref="/scan"
          meta={["Historical score tracking", "Layer-by-layer authority breakdowns"]}
        />
      ) : (
        <div className="geo-premium-card overflow-hidden rounded-3xl">
          <div className="hidden grid-cols-[1.2fr_auto_auto_auto_auto] gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] lg:grid">
            <span>Website / Market</span>
            <span className="text-center">Score</span>
            <span className="text-center">Trend</span>
            <span>Layer scores</span>
            <span className="text-right">Captured</span>
          </div>

          <div className="divide-y divide-white/10">
            {scans.map((scan, index) => {
              const previousScan = scans[index + 1];
              const layerScores = scan.layer_scores;

              return (
                <Link
                  key={scan.id}
                  href={`/scan/${scan.id}`}
                  className="group flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-white/[0.02] lg:grid lg:grid-cols-[1.2fr_auto_auto_auto_auto] lg:items-center lg:px-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-electric-500/10">
                      <ExternalLink className="h-4 w-4 text-electric-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--foreground)] transition-colors group-hover:text-electric-400">
                        {scan.url}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {scan.business_name ? `${scan.business_name} · ` : ""}
                        {[scan.city, scan.state].filter(Boolean).join(", ") || "Unspecified market"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-center">
                    <ScoreBadge score={scan.geothority_score ?? 0} />
                    <span className="text-xs text-[var(--muted-foreground)] lg:hidden">overall authority</span>
                  </div>

                  <div className="hidden justify-center lg:flex">
                    <ScoreTrend current={scan.geothority_score ?? 0} previous={previousScan?.geothority_score ?? undefined} />
                  </div>

                  <div className="hidden flex-wrap gap-1.5 lg:flex">
                    {layerScores &&
                      Object.entries(layerScores).map(([key, value]) => {
                        const layerNum = LAYER_NUMS[key];
                        const tipData = layerNum ? LAYER_TOOLTIP_DATA[layerNum] : null;
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
                            style={{ backgroundColor: `${LAYER_COLORS[key]}18`, color: LAYER_COLORS[key] }}
                          >
                            {LAYER_LABELS[key] ?? key}: {value}
                            {tipData && (
                              <InfoTooltip
                                content={tipData.what}
                                side="top"
                                iconClassName="h-2.5 w-2.5"
                                className="h-3 w-3"
                              />
                            )}
                          </span>
                        );
                      })}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] lg:justify-end">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(new Date(scan.created_at), "MMM d, yyyy")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-electric-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
