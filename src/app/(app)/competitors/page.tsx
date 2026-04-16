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
} from "lucide-react";
import { ComparisonCards } from "@/components/competitors/comparison-cards";
import Link from "next/link";

interface MockCompetitor {
  id: string;
  domain: string;
  businessName: string;
  city: string;
  score: number;
  lastChecked: string;
  alerts: {
    type: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "critical";
    detectedAt: string;
  }[];
}

// Mock data for MVP
const MOCK_COMPETITORS: MockCompetitor[] = [
  {
    id: "1",
    domain: "austininsurancegroup.com",
    businessName: "Austin Insurance Group",
    city: "Austin",
    score: 78,
    lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    alerts: [
      {
        type: "new_page",
        title: "New city page detected",
        description: 'Published "Round Rock Auto Insurance" landing page (1,200 words)',
        severity: "warning",
        detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: "review_burst",
        title: "Review burst detected",
        description: "Received 8 new Google reviews in the past week (avg: 2/week)",
        severity: "critical",
        detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "2",
    domain: "trustedtxagent.com",
    businessName: "Trusted TX Insurance",
    city: "Austin",
    score: 72,
    lastChecked: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    alerts: [
      {
        type: "new_page",
        title: "Schema markup added",
        description: "Added LocalBusiness + FAQPage schema to all service pages",
        severity: "info",
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "3",
    domain: "austin-coverage.com",
    businessName: "Austin Coverage Experts",
    city: "Austin",
    score: 65,
    lastChecked: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    alerts: [],
  },
];

export default function CompetitorsPage() {
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<MockCompetitor[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [userScore, setUserScore] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("city, plan")
        .eq("id", user.id)
        .single();

      if (profile?.city) {
        setHasProfile(true);
        // In production, load from Supabase. MVP uses mock data.
        setCompetitors(MOCK_COMPETITORS);
        // Load latest scan score for comparison
        const { data: latestScan } = await supabase
          .from("scans")
          .select("geothority_score, business_name, url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (latestScan?.geothority_score) setUserScore(latestScan.geothority_score);
      }
      setLoading(false);
    }
    load();
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Watchdog</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tracking {competitors.length} competitors in your area
          </p>
        </div>
      </div>

      {/* Alerts */}
      {allAlerts.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recent Alerts ({allAlerts.length})
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

      {/* Competitors Grid */}
      {/* Side-by-side comparison cards */}
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
            rating: null,
            reviewCount: null,
            citationCount: null,
          }))}
        />
      )}

      {/* Detailed competitor cards */}
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
                <div className="text-xs text-[var(--muted-foreground)]">Score</div>
              </div>
            </div>

            <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${
                  comp.score >= 70 ? "bg-score-good" :
                  comp.score >= 40 ? "bg-score-mid" : "bg-score-poor"
                }`}
                style={{ width: `${comp.score}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>{comp.alerts.length} alerts</span>
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
