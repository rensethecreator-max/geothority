"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Scan, UserProfile } from "@/lib/types";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { TrustStackVisualization, ScoreRing } from "@/components/scan/trust-stack";
import { QuickWinCard } from "@/components/scan/quick-win-card";
import {
  Search,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { StarceptaBanner } from "@/components/upsell/StarceptaBanner";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [_profile, setProfile] = useState<UserProfile | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [latestScan, setLatestScan] = useState<Scan | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [profileRes, scansRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("scans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (scansRes.data) {
        setScans(scansRes.data);
        if (scansRes.data.length > 0) setLatestScan(scansRes.data[0]);
      }

      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (!latestScan) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <EmptyState
          icon={Search}
          title="No scans yet"
          description="Run your first website scan to see your Local Trust Stack™ analysis, discover quick wins, and start improving your local search visibility."
          actionLabel="Run Your First Scan"
          actionHref="/scan"
        />
      </div>
    );
  }

  const ls = latestScan.layer_scores || { layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0 };
  const quickWins = latestScan.quick_wins || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {latestScan.business_name} · {latestScan.city}, {latestScan.state}
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

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] flex items-center gap-4">
          <ScoreRing score={latestScan.geothority_score || 0} size={80} label="" />
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Geothority Score</div>
            <div className="text-2xl font-bold">{latestScan.geothority_score || 0}/100</div>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-[var(--muted-foreground)]">Quick Wins Available</span>
          </div>
          <div className="text-2xl font-bold">{quickWins.length}</div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Actionable fixes to boost your score
          </p>
        </div>

        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-score-good" />
            <span className="text-sm text-[var(--muted-foreground)]">Scans Completed</span>
          </div>
          <div className="text-2xl font-bold">{scans.length}</div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Track your progress over time
          </p>
        </div>
      </div>

      {/* Starcepta Review Cross-Sell Banner */}
      {!bannerDismissed && (
        <StarceptaBanner
          reviewHealthScore={ls.layer4}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Trust Stack + Quick Win */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
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
            <QuickWinCard win={quickWins[0]} featured />
          ) : (
            <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No quick wins — your site looks great! 🎉
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scan History */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
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
