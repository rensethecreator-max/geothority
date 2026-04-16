"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Link2,
  Calendar,
  Loader2,
  ArrowUpRight,
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
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";

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
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--muted-foreground)]">{p.name}:</span>
            <span className="font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [content, setContent] = useState<ContentSummary[]>([]);
  const [citationChecks] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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

      if (scansRes.data) setScans(scansRes.data);
      if (contentRes.data) setContent(contentRes.data);
      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build 30-day bucket data
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dayBuckets: DayBucket[] = last30Days.map((day) => {
    const dayStr = format(startOfDay(day), "MMM d");
    const dayIso = format(startOfDay(day), "yyyy-MM-dd");
    return {
      date: dayStr,
      scans: scans.filter((s) => s.created_at.startsWith(dayIso)).length,
      content: content.filter((c) => c.created_at.startsWith(dayIso)).length,
    };
  });

  // Score trend (last 20 scans)
  const scoreTrend = scans.slice(-20).map((s, i) => ({
    index: i + 1,
    score: s.geothority_score || 0,
    date: format(new Date(s.created_at), "MMM d"),
  }));

  const avgScore =
    scans.length > 0
      ? Math.round(scans.reduce((a, s) => a + (s.geothority_score || 0), 0) / scans.length)
      : 0;

  const latestScore = scans[scans.length - 1]?.geothority_score || 0;
  const previousScore = scans[scans.length - 2]?.geothority_score || 0;
  const scoreDelta = latestScore - previousScore;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-electric-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track your performance, content growth, and score improvements over time.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Scans",
            value: scans.length,
            icon: BarChart3,
            color: "text-electric-500",
            bg: "bg-electric-500/10",
          },
          {
            label: "Avg Score",
            value: avgScore,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            suffix: "/100",
          },
          {
            label: "Content Generated",
            value: content.length,
            icon: FileText,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Citation Checks",
            value: citationChecks,
            icon: Link2,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex items-center gap-4 group hover:border-electric-500/30 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">{stat.suffix}</span>
                )}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Score Trend */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Score Trend</h2>
            <p className="text-xs text-[var(--muted-foreground)]">Geothority score over your last {scoreTrend.length} scans</p>
          </div>
          {scans.length >= 2 && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${scoreDelta >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"}`}>
              <ArrowUpRight className={`w-3 h-3 ${scoreDelta < 0 ? "rotate-180" : ""}`} />
              {Math.abs(scoreDelta)} pts since last scan
            </div>
          )}
        </div>

        {scoreTrend.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-8 h-8 text-[var(--muted-foreground)] mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">
              Run more scans to see your score trend here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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

      {/* Activity Chart */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-electric-500" />
          <h2 className="text-lg font-semibold">Activity (Last 30 Days)</h2>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dayBuckets.filter((_, i) => i % 3 === 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="scans" name="Scans" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="content" name="Content" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Scan History */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold">Scan History</h2>
        </div>
        {scans.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            No scans yet. Run your first scan to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {[...scans].reverse().slice(0, 10).map((scan, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium">{scan.business_name || "Unknown"}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {scan.city} · {format(new Date(scan.created_at), "MMM d, yyyy")}
                  </div>
                </div>
                <div
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    (scan.geothority_score || 0) >= 80
                      ? "bg-emerald-500/10 text-emerald-500"
                      : (scan.geothority_score || 0) >= 60
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-400"
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
  );
}
