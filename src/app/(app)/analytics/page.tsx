"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/empty-state";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Link2,
  Calendar,
  Loader2,
  ArrowUpRight,
  Sparkles,
  Activity,
  Radar,
  Search,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface ScanSummary {
  created_at: string;
  geothority_score: number | null;
  business_name: string | null;
  city: string | null;
}

interface ContentSummary {
  created_at: string;
  type: string;
}

interface DayBucket {
  date: string;
  scans: number;
  content: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[var(--card)] p-3 text-xs shadow-xl shadow-black/20">
        <p className="mb-1 font-medium text-[var(--foreground)]">{label}</p>
        {payload.map((point) => (
          <div key={point.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: point.color }} />
            <span className="text-[var(--muted-foreground)]">{point.name}:</span>
            <span className="font-semibold text-[var(--foreground)]">{point.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [content, setContent] = useState<ContentSummary[]>([]);
  const [citationChecks] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setScans([]);
          setContent([]);
          return;
        }

        const [scansRes, contentRes] = await Promise.all([
          supabase
            .from("scans")
            .select("created_at, geothority_score, business_name, city")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(100),
          supabase
            .from("generated_content")
            .select("created_at, type")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(100),
        ]);

        if (scansRes.error) throw scansRes.error;
        if (contentRes.error) throw contentRes.error;

        setScans(scansRes.data ?? []);
        setContent(contentRes.data ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last30Days = useMemo(
    () =>
      eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      }),
    []
  );

  const dayBuckets: DayBucket[] = last30Days.map((day) => {
    const label = format(startOfDay(day), "MMM d");
    const dayIso = format(startOfDay(day), "yyyy-MM-dd");
    return {
      date: label,
      scans: scans.filter((scan) => scan.created_at.startsWith(dayIso)).length,
      content: content.filter((entry) => entry.created_at.startsWith(dayIso)).length,
    };
  });

  const scoreTrend = scans.slice(-20).map((scan, index) => ({
    index: index + 1,
    score: scan.geothority_score || 0,
    date: format(new Date(scan.created_at), "MMM d"),
  }));

  const avgScore = scans.length
    ? Math.round(scans.reduce((sum, scan) => sum + (scan.geothority_score || 0), 0) / scans.length)
    : 0;
  const latestScore = scans[scans.length - 1]?.geothority_score || 0;
  const previousScore = scans[scans.length - 2]?.geothority_score || 0;
  const scoreDelta = latestScore - previousScore;
  const totalActivity = dayBuckets.reduce((sum, bucket) => sum + bucket.scans + bucket.content, 0);
  const lastBusiness = scans[scans.length - 1]?.business_name || "Awaiting first territory";

  if (loading) {
    return (
      <div className="geo-premium-card rounded-3xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-electric-500" />
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading analytics telemetry…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-500">
              <Radar className="h-3.5 w-3.5" />
              Performance observatory
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Track score momentum, content velocity, and reporting cadence across your local authority program.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Latest market", value: lastBusiness, icon: Sparkles },
              { label: "30-day activity", value: `${totalActivity} actions`, icon: Activity },
              { label: "Average authority", value: `${avgScore}/100`, icon: TrendingUp },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[180px] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <item.icon className="h-3.5 w-3.5 text-electric-500" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-electric-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-electric-600"
            >
              <Search className="h-4 w-4" />
              New Scan
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-red-100">Analytics currently unavailable</p>
              <p className="mt-1 text-red-200/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {scans.length === 0 && content.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Run your first scan or generate your first page to start filling your performance timeline with meaningful trend data."
          actionLabel="Run a scan"
          actionHref="/scan"
          meta={["30-day activity view", "Score and content trend monitoring"]}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total scans", value: scans.length, icon: BarChart3, color: "text-electric-500", bg: "bg-electric-500/10" },
              { label: "Avg score", value: `${avgScore}/100`, icon: TrendingUp, color: "text-emerald-300", bg: "bg-emerald-500/10" },
              { label: "Content generated", value: content.length, icon: FileText, color: "text-amber-300", bg: "bg-amber-500/10" },
              { label: "Citation checks", value: citationChecks, icon: Link2, color: "text-purple-300", bg: "bg-purple-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="geo-premium-card rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{stat.label}</div>
                </div>
                <div className="text-3xl font-semibold text-[var(--foreground)]">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="geo-premium-card rounded-3xl p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Score Trend</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Geothority score across your latest {scoreTrend.length} scans</p>
              </div>
              {scans.length >= 2 && (
                <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${scoreDelta >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                  <ArrowUpRight className={`h-3.5 w-3.5 ${scoreDelta < 0 ? "rotate-180" : ""}`} />
                  {Math.abs(scoreDelta)} pts since last scan
                </div>
              )}
            </div>

            {scoreTrend.length < 2 ? (
              <div className="geo-premium-muted rounded-3xl px-6 py-14 text-center">
                <TrendingUp className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                <p className="mt-3 text-sm font-medium">Need at least two scans for a trend line</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Your first score is captured — one more scan will unlock momentum tracking.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="geo-premium-card rounded-3xl p-6">
              <div className="mb-6 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-electric-500" />
                <h2 className="text-lg font-semibold">Activity (Last 30 Days)</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dayBuckets.filter((_, index) => index % 3 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="scans" name="Scans" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="content" name="Content" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="geo-premium-card rounded-3xl">
              <div className="border-b border-white/10 p-5">
                <h2 className="font-semibold">Recent Scan History</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Most recent markets and authority scores</p>
              </div>
              {scans.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
                  No scans yet. Run your first audit to populate this panel.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {[...scans].reverse().slice(0, 10).map((scan, index) => (
                    <div key={`${scan.created_at}-${index}`} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[var(--foreground)]">{scan.business_name || "Unknown territory"}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {scan.city || "Unknown city"} · {format(new Date(scan.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          (scan.geothority_score || 0) >= 80
                            ? "bg-emerald-500/10 text-emerald-300"
                            : (scan.geothority_score || 0) >= 60
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {scan.geothority_score || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
