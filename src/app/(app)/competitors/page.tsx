"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  MapPin,
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react";
import { ComparisonCards } from "@/components/competitors/comparison-cards";
import Link from "next/link";

interface CompetitorAlert {
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  detectedAt: string;
  competitor?: string;
  isNew?: boolean;
  delta?: string;
}

interface SnapshotEntry {
  id: string;
  rating: number | null;
  review_count: number;
  score: number;
  rank_position: number;
  snapshot_date: string;
  created_at: string;
}

interface Competitor {
  id: string;
  domain: string;
  businessName: string;
  city: string;
  score: number;
  lastChecked: string;
  rating: number | null;
  reviewCount: number;
  address: string | null;
  alerts: CompetitorAlert[];
  ratingDelta: number | null;
  reviewCountDelta: number | null;
  scoreDelta: number | null;
  snapshotHistory: SnapshotEntry[];
}

interface CompetitorPayload {
  competitors: Competitor[];
  userScore: number | null;
  location?: string;
  businessType?: string;
  insights?: string[];
}

function DeltaIndicator({ value, label }: { value: number | null; label: string }) {
  if (value == null) return null;
  const isUp = value > 0;
  const isDown = value < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-[var(--muted-foreground)]";

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`} title={`${label}: ${value > 0 ? "+" : ""}${value}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? "+" : ""}{Number.isInteger(value) ? value : value.toFixed(1)}
    </span>
  );
}

function Sparkline({ history }: { history: SnapshotEntry[] }) {
  if (history.length < 2) return null;

  const scores = history
    .slice()
    .reverse()
    .map((s) => s.score);
  const max = Math.max(...scores, 1);
  const width = 80;
  const height = 24;
  const step = width / (scores.length - 1);

  const points = scores
    .map((s, i) => `${i * step},${height - (s / max) * height}`)
    .join(" ");

  const trend = scores[scores.length - 1] - scores[0];
  const stroke = trend > 0 ? "#34d399" : trend < 0 ? "#f87171" : "#9ca3af";

  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CompetitorsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [location, setLocation] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("city, state")
        .eq("id", user.id)
        .single();

      if (!profile?.city) {
        setHasProfile(false);
        setLoading(false);
        return;
      }

      setHasProfile(true);

      const res = await fetch(`/api/competitors${refresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const payload: CompetitorPayload & { error?: string; message?: string } =
        await res.json();

      if (!res.ok) {
        throw new Error(payload.message || payload.error || "Failed to load competitors");
      }

      setCompetitors(payload.competitors || []);
      setUserScore(payload.userScore || 0);
      setLocation(payload.location || `${profile.city}${profile.state ? `, ${profile.state}` : ""}`);
      setBusinessType(payload.businessType || null);
      setInsights(payload.insights || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load competitors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) return <ContentSkeleton />;

  if (!hasProfile) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Competitor Watchdog</h1>
        <EmptyState
          icon={Eye}
          title="Run a scan first"
          description="We need to know your city and business to find competitors. Run a website scan to get started."
          actionLabel="Run a Scan"
          actionHref="/scan"
        />
      </div>
    );
  }

  const allAlerts = competitors
    .flatMap((c) => c.alerts.map((a) => ({ ...a, competitor: c.businessName })))
    .sort((a, b) => {
      // New/delta alerts float to top
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

  const hasAnyHistory = competitors.some((c) => c.snapshotHistory.length >= 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Watchdog</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tracking {competitors.length} live competitors{location ? ` in ${location}` : ""}
            {businessType ? ` for ${businessType}` : ""}
            {hasAnyHistory && " · historical comparison active"}
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh live market
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {insights.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 font-semibold">Live market takeaways</h2>
          <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
            {insights.map((insight, i) => (
              <li key={i}>• {insight}</li>
            ))}
          </ul>
        </div>
      )}

      {allAlerts.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Signals ({allAlerts.length})
              {allAlerts.some((a) => a.isNew) && (
                <Badge variant="secondary" className="bg-electric-500/10 text-electric-500 text-[10px]">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  New changes
                </Badge>
              )}
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {allAlerts.map((alert, i) => (
              <div key={i} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={
                        alert.severity === "critical"
                          ? "bg-score-poor/10 text-score-poor"
                          : alert.severity === "warning"
                          ? "bg-score-mid/10 text-score-mid"
                          : "bg-electric-500/10 text-electric-500"
                      }
                    >
                      {alert.severity}
                    </Badge>
                    {alert.isNew && (
                      <Badge variant="secondary" className="bg-electric-500/15 text-electric-500 text-[10px]">
                        NEW
                      </Badge>
                    )}
                    {alert.delta && (
                      <span className={`text-[11px] font-mono font-semibold ${
                        alert.delta.startsWith("+") ? "text-emerald-400" : alert.delta.startsWith("-") ? "text-red-400" : "text-[var(--muted-foreground)]"
                      }`}>
                        {alert.delta}
                      </span>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {alert.competitor}
                    </span>
                  </div>
                  <div className="font-medium text-sm">{alert.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {alert.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.detectedAt).toLocaleDateString()}
                  </span>
                  <Link
                    href="/content/generate"
                    className="flex items-center gap-1 px-3 py-1.5 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Match This
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userScore > 0 && (
        <ComparisonCards
          you={{
            name: "Your Business",
            domain: "",
            score: userScore,
            rating: null,
            reviewCount: null,
            citationCount: null,
            isYou: true,
          }}
          competitors={competitors.map((c) => ({
            name: c.businessName,
            domain: c.domain,
            score: c.score,
            rating: c.rating,
            reviewCount: c.reviewCount,
            citationCount: null,
          }))}
        />
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {competitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{comp.businessName}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{comp.domain}</div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{comp.score}</div>
                  <DeltaIndicator value={comp.scoreDelta} label="Score" />
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">Market score</div>
              </div>
            </div>

            <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full ${
                  comp.score >= 70 ? "bg-score-good" :
                  comp.score >= 40 ? "bg-score-mid" : "bg-score-poor"
                }`}
                style={{ width: `${comp.score}%` }}
              />
            </div>

            <div className="space-y-2 text-xs text-[var(--muted-foreground)] mb-4">
              {comp.rating !== null && (
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span>{Number(comp.rating).toFixed(1)}★ average rating</span>
                  <DeltaIndicator value={comp.ratingDelta} label="Rating" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{comp.reviewCount.toLocaleString()} Google reviews</span>
                <DeltaIndicator value={comp.reviewCountDelta} label="Reviews" />
              </div>
              {comp.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5" />
                  <span>{comp.address}</span>
                </div>
              )}
            </div>

            {/* Sparkline history */}
            {comp.snapshotHistory.length >= 2 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowHistory(showHistory === comp.id ? null : comp.id)}
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {showHistory === comp.id ? "Hide" : "Show"} trend
                </button>
                {showHistory === comp.id && (
                  <div className="mt-2 space-y-1">
                    <Sparkline history={comp.snapshotHistory} />
                    <div className="space-y-0.5 mt-2">
                      {comp.snapshotHistory.slice(0, 5).map((snap, si) => (
                        <div key={snap.id} className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                          <span>{new Date(snap.snapshot_date).toLocaleDateString()}</span>
                          <span className="tabular-nums">
                            {snap.score}pts · {snap.rating != null ? `${Number(snap.rating).toFixed(1)}★` : "—"} · {snap.review_count} rev
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>
                {comp.alerts.filter((a) => a.isNew).length > 0 && (
                  <span className="text-electric-500 mr-1">
                    {comp.alerts.filter((a) => a.isNew).length} new
                  </span>
                )}
                {comp.alerts.length} signals
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Checked {new Date(comp.lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
