"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Scan, UserProfile } from "@/lib/types";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";
import { TrustStackVisualization, ScoreRing } from "@/components/scan/trust-stack";
import { QuickWinCard } from "@/components/scan/quick-win-card";
import {
  Search,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  ExternalLink,
  ShieldCheck,
  Radar,
  Sparkles,
} from "lucide-react";
import { InfoTooltip, LayerInfoTooltip } from "@/components/ui/info-tooltip";
import Link from "next/link";
import { StarceptaBanner } from "@/components/upsell/StarceptaBanner";
import { HealthPulse } from "@/components/dashboard/health-pulse";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { readOnboardingCompletion } from "@/lib/onboarding";

interface ScoreHistoryEntry {
  id: string;
  overall_score: number;
  layer_scores: Record<string, number> | null;
  scanned_at: string;
}

interface ScoreChartTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string; stroke: string }[];
  label?: string;
}

function ScoreChartTooltip({ active, payload, label }: ScoreChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-xs shadow-xl">
        <p className="font-medium mb-1.5">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.stroke || p.color }} />
            <span className="text-[var(--muted-foreground)]">{p.name}:</span>
            <span className="font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [_profile, setProfile] = useState<UserProfile | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [latestScan, setLatestScan] = useState<Scan | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
    overall: true, layer1: false, layer2: false, layer3: false, layer4: false, layer5: false,
  });
  // Onboarding completion state - must be declared before any early returns
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?redirect=/dashboard");
        setLoading(false);
        return;
      }

      const [profileRes, scansRes, historyRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("scans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("score_history")
          .select("id, overall_score, layer_scores, scanned_at")
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: true })
          .limit(30),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setOnboardingDone(profileRes.data.onboarding_completed === true || readOnboardingCompletion());
      } else {
        setOnboardingDone(readOnboardingCompletion());
      }
      if (scansRes.data) {
        setScans(scansRes.data);
        if (scansRes.data.length > 0) setLatestScan(scansRes.data[0]);
      }
      if (historyRes.data) setScoreHistory(historyRes.data);

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  useEffect(() => {
    setOnboardingDone((current) => current ?? readOnboardingCompletion());
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (!latestScan) {
    // Still reading localStorage - wait a tick
    if (onboardingDone === null) return <DashboardSkeleton />;

    // Show onboarding wizard if not completed
    if (!onboardingDone) {
      return (
        <div>
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <WelcomeFlow onComplete={() => setOnboardingDone(true)} />
        </div>
      );
    }

    // Onboarding done but no scans yet - show guided empty state
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Hero CTA */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-electric-500/20 via-emerald-500/10 to-transparent border border-electric-500/20 p-8 mb-6">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">Ready to establish your baseline?</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5 max-w-lg">
              Run your first scan to get your 5-Layer Trust Stack™ score, discover quick wins,
              and see which trust signals need attention first.
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-400 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Search className="w-4 h-4" />
              Run Your First Scan
            </Link>
          </div>
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-electric-500/5 blur-2xl" />
        </div>

        {/* What you get cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Trust Stack Score</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              5-layer audit covering schema, NAP, content, reviews, and citation health.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Quick Wins</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Prioritized fixes ranked by impact. One click to generate the fix.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <Search className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-semibold text-sm mb-1">AI Visibility</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              See if AI assistants like ChatGPT and Claude recommend your business to local searchers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ls = latestScan.layer_scores || { layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0 };
  const quickWins = latestScan.quick_wins || [];
  const topLayer = Object.entries(ls).sort((a, b) => b[1] - a[1])[0];
  const layerLabels: Record<string, string> = {
    layer1: "GBP authority",
    layer2: "Website trust",
    layer3: "Citation consistency",
    layer4: "Review momentum",
    layer5: "Content coverage",
  };

  return (
    <div className="space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-500">
              <Radar className="h-3.5 w-3.5" />
              Territory command center
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{latestScan.business_name}</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              {latestScan.city}, {latestScan.state} · Last scan {new Date(latestScan.created_at).toLocaleDateString()}.
              Your moat is currently anchored by {topLayer ? layerLabels[topLayer[0]] : "trust coverage"}, with {quickWins.length} quick win{quickWins.length === 1 ? "" : "s"} ready to convert into score lift.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Best layer", value: topLayer ? `${layerLabels[topLayer[0]]} · ${topLayer[1]}/100` : "Waiting for layer data", icon: ShieldCheck },
              { label: "Response posture", value: quickWins.length > 0 ? `${quickWins.length} countermoves queued` : "No urgent fixes detected", icon: Sparkles },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[220px] rounded-2xl px-4 py-3">
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

      {/* Score Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="geo-premium-card rounded-2xl p-6 flex items-center gap-4">
          <ScoreRing score={latestScan.geothority_score || 0} size={80} label="" />
          <div>
            <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5">
              Geothority Score
              <InfoTooltip
                content="Your overall local search authority score from 0-100. Higher means more visibility in Google and AI search."
                side="top"
              />
            </div>
            <div className="text-2xl font-bold">{latestScan.geothority_score || 0}/100</div>
            <div className="mt-1.5">
              <HealthPulse
                score={latestScan.geothority_score || 0}
                lastScanDate={latestScan.created_at}
              />
            </div>
          </div>
        </div>

        <div className="geo-premium-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5">
              Quick Wins Available
              <InfoTooltip
                content="Specific, actionable fixes you can make today to improve your score. Sorted by impact."
                side="top"
              />
            </span>
          </div>
          <div className="text-2xl font-bold">{quickWins.length}</div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Actionable fixes to boost your score
          </p>
        </div>

        <div className="geo-premium-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-score-good" />
            <span className="text-sm text-[var(--muted-foreground)] flex items-center gap-1.5">
              Scans Completed
              <InfoTooltip
                content="Your Trust Stack score over time. Upward trends mean your local visibility is improving."
                side="top"
              />
            </span>
          </div>
          <div className="text-2xl font-bold">{scans.length}</div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Track your progress over time
          </p>
        </div>
      </div>

      {/* API Key Setup Checklist */}
      <SetupChecklist />

      {/* Starcepta Review Cross-Sell Banner */}
      {!bannerDismissed && (
        <StarceptaBanner
          reviewHealthScore={ls.layer4}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Trust Stack + Quick Win */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="geo-premium-card rounded-3xl p-6 lg:col-span-3">
          <TrustStackVisualization layerScores={ls} />
          <Link
            href={`/scan/${latestScan.id}`}
            className="mt-4 flex items-center gap-1 text-sm text-electric-500 hover:text-electric-400 transition-colors"
          >
            View full scan details
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Top Quick Win</h3>
          {quickWins[0] ? (
            <QuickWinCard win={quickWins[0]} featured scanId={latestScan.id} index={0} />
          ) : (
            <div className="geo-premium-card rounded-3xl p-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No quick wins - your site looks great! 🎉
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Score History Chart */}
      <div className="geo-premium-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-1.5">
              Score History
              <InfoTooltip
                content="Your Trust Stack score over time. Upward trends mean your local visibility is improving."
                side="top"
              />
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">Trust Stack score over time</p>
          </div>
          {/* Layer toggles */}
          <div className="hidden sm:flex flex-wrap gap-2">
            {([
              { key: "overall", label: "Overall", color: "#10b981", layerNum: 0 },
              { key: "layer1", label: "GBP", color: "#6366f1", layerNum: 1 },
              { key: "layer2", label: "Website", color: "#f59e0b", layerNum: 2 },
              { key: "layer3", label: "Citations", color: "#3b82f6", layerNum: 3 },
              { key: "layer4", label: "Reviews", color: "#ec4899", layerNum: 4 },
              { key: "layer5", label: "Content", color: "#8b5cf6", layerNum: 5 },
            ] as const).map(({ key, label, color, layerNum }) => (
              <div key={key} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveLines((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    activeLines[key]
                      ? "border-transparent text-white"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  }`}
                  style={activeLines[key] ? { backgroundColor: color } : {}}
                >
                  {label}
                </button>
                {layerNum > 0 && <LayerInfoTooltip layerNum={layerNum} side="top" />}
              </div>
            ))}
          </div>
        </div>

        {scoreHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="w-8 h-8 text-[var(--muted-foreground)] mb-3" />
            <p className="text-sm font-medium mb-1">No score history yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Run more scans to track your progress over time.
            </p>
          </div>
        ) : scoreHistory.length === 1 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-emerald-500">{scoreHistory[0].overall_score}</span>
            </div>
            <p className="text-sm font-medium">Starting Score: {scoreHistory[0].overall_score}/100</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Keep scanning to see your progress! 🚀
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={scoreHistory.map((h) => ({
              date: format(new Date(h.scanned_at), "MMM d"),
              overall: h.overall_score,
              layer1: h.layer_scores?.layer1 || 0,
              layer2: h.layer_scores?.layer2 || 0,
              layer3: h.layer_scores?.layer3 || 0,
              layer4: h.layer_scores?.layer4 || 0,
              layer5: h.layer_scores?.layer5 || 0,
            }))}>
              <defs>
                <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<ScoreChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeLines.overall && (
                <Area
                  type="monotone"
                  dataKey="overall"
                  name="Overall"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#overallGrad)"
                  dot={{ fill: "#10b981", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {activeLines.layer1 && <Line type="monotone" dataKey="layer1" name="GBP" stroke="#6366f1" strokeWidth={1.5} dot={false} />}
              {activeLines.layer2 && <Line type="monotone" dataKey="layer2" name="Website" stroke="#f59e0b" strokeWidth={1.5} dot={false} />}
              {activeLines.layer3 && <Line type="monotone" dataKey="layer3" name="Citations" stroke="#3b82f6" strokeWidth={1.5} dot={false} />}
              {activeLines.layer4 && <Line type="monotone" dataKey="layer4" name="Reviews" stroke="#ec4899" strokeWidth={1.5} dot={false} />}
              {activeLines.layer5 && <Line type="monotone" dataKey="layer5" name="Content" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Scan History */}
      <div className="geo-premium-card rounded-3xl">
        <div className="p-6 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Recent Scans</h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/scan/${scan.id}`}
              className="flex items-center justify-between p-4 hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-electric-500/10 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-electric-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">{scan.url}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {scan.city}, {scan.state}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold">{scan.geothority_score || 0}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Score</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  <Clock className="w-3 h-3" />
                  {new Date(scan.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
