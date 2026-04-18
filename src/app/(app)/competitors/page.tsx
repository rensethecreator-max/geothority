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
}

interface CompetitorPayload {
  competitors: Competitor[];
  userScore: number | null;
  location?: string;
  businessType?: string;
  insights?: string[];
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
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Watchdog</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tracking {competitors.length} live competitors{location ? ` in ${location}` : ""}
            {businessType ? ` for ${businessType}` : ""}
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
              Live signals ({allAlerts.length})
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
              <div className="text-right">
                <div className="text-2xl font-bold">{comp.score}</div>
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
                  <span>{comp.rating.toFixed(1)}★ average rating</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{comp.reviewCount.toLocaleString()} Google reviews</span>
              </div>
              {comp.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5" />
                  <span>{comp.address}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{comp.alerts.length} live signals</span>
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
