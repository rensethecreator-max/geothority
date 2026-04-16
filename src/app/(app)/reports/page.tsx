"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Scan } from "@/lib/types";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FileText,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Search,
} from "lucide-react";
import { InfoTooltip, LAYER_TOOLTIP_DATA } from "@/components/ui/info-tooltip";
import Link from "next/link";
import { format } from "date-fns";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : score >= 40
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score}/100
    </span>
  );
}

function ScoreTrend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return <Minus className="w-4 h-4 text-[var(--muted-foreground)]" />;
  const diff = current - previous;
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
        <TrendingUp className="w-3.5 h-3.5" />+{diff}
      </span>
    );
  if (diff < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-400 font-medium">
        <TrendingDown className="w-3.5 h-3.5" />{diff}
      </span>
    );
  return <Minus className="w-4 h-4 text-[var(--muted-foreground)]" />;
}

const LAYER_LABELS: Record<string, string> = {
  layer1: "Foundation",
  layer2: "Trust Pages",
  layer3: "Geo Content",
  layer4: "Reviews",
  layer5: "AI Opt.",
};

const LAYER_NUMS: Record<string, number> = {
  layer1: 1, layer2: 2, layer3: 3, layer4: 4, layer5: 5,
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
  const supabase = createClient();

  useEffect(() => {
    async function loadScans() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setScans(data);
      setLoading(false);
    }
    loadScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            All your Trust Stack™ scan reports in one place
          </p>
        </div>
        <Link
          href="/scan"
          className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Search className="w-4 h-4" />
          New Scan
        </Link>
      </div>

      {/* Summary Row */}
      {scans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Reports", value: scans.length, icon: FileText, color: "text-electric-500" },
            {
              label: "Latest Score",
              value: `${scans[0]?.geothority_score ?? "—"}/100`,
              icon: TrendingUp,
              color: "text-emerald-400",
            },
            {
              label: "Best Score",
              value: `${Math.max(...scans.map((s) => s.geothority_score ?? 0))}/100`,
              icon: TrendingUp,
              color: "text-amber-400",
            },
            {
              label: "Avg Score",
              value: `${Math.round(
                scans.reduce((sum, s) => sum + (s.geothority_score ?? 0), 0) / scans.length
              )}/100`,
              icon: Minus,
              color: "text-[var(--muted-foreground)]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-[var(--muted-foreground)]">{stat.label}</span>
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reports Table */}
      {scans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Run your first scan to generate a Trust Stack™ report and start tracking your local SEO progress."
          actionLabel="Run Your First Scan"
          actionHref="/scan"
        />
      ) : (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Website / Location</span>
            <span className="text-center">Score</span>
            <span className="text-center hidden lg:block">Trend</span>
            <span className="hidden lg:block">Layer Scores</span>
            <span className="text-right">Date</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {scans.map((scan, idx) => {
              const prev = scans[idx + 1];
              const ls = scan.layer_scores;
              return (
                <Link
                  key={scan.id}
                  href={`/scan/${scan.id}`}
                  className="group flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 hover:bg-[var(--muted)] transition-colors items-start sm:items-center"
                >
                  {/* URL + Business */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-electric-500/10 flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-electric-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-electric-400 transition-colors">
                        {scan.url}
                      </div>
                      {(scan.city || scan.state) && (
                        <div className="text-xs text-[var(--muted-foreground)] truncate">
                          {scan.business_name && `${scan.business_name} · `}
                          {scan.city}, {scan.state}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex sm:justify-center items-center gap-2">
                    <ScoreBadge score={scan.geothority_score ?? 0} />
                    <span className="sm:hidden text-xs text-[var(--muted-foreground)]">overall</span>
                  </div>

                  {/* Trend */}
                  <div className="hidden lg:flex justify-center">
                    <ScoreTrend
                      current={scan.geothority_score ?? 0}
                      previous={prev?.geothority_score ?? undefined}
                    />
                  </div>

                  {/* Layer Pills */}
                  <div className="hidden lg:flex gap-1.5 flex-wrap">
                    {ls &&
                      Object.entries(ls).map(([key, val]) => {
                        const layerNum = LAYER_NUMS[key];
                        const tipData = layerNum ? LAYER_TOOLTIP_DATA[layerNum] : null;
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: `${LAYER_COLORS[key]}18`,
                              color: LAYER_COLORS[key],
                            }}
                          >
                            {LAYER_LABELS[key] ?? key}: {val}
                            {tipData && (
                              <InfoTooltip
                                content={tipData.what}
                                side="top"
                                iconClassName="w-2.5 h-2.5"
                                className="w-3 h-3"
                              />
                            )}
                          </span>
                        );
                      })}
                  </div>

                  {/* Date + Arrow */}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] sm:justify-end">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(scan.created_at), "MMM d, yyyy")}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-electric-500" />
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
