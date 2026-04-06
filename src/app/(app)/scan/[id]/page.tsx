"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Scan } from "@/lib/types";
import { ScanSkeleton } from "@/components/shared/loading-skeleton";
import { TrustStackVisualization, ScoreRing } from "@/components/scan/trust-stack";
import { QuickWinCard } from "@/components/scan/quick-win-card";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Target,
  Trophy,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function ScanResultPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadScan() {
      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) setScan(data);
      setLoading(false);
    }

    loadScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) return <ScanSkeleton />;

  if (!scan) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold mb-2">Scan not found</h2>
        <p className="text-[var(--muted-foreground)] mb-4">
          This scan may have been deleted or you don&apos;t have access.
        </p>
        <Link href="/dashboard" className="text-electric-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const ls = scan.layer_scores || { layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0 };
  const quickWins = scan.quick_wins || [];
  const competitors = scan.competitor_gaps || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{scan.business_name}</h1>
            <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {scan.url}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(scan.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Link
            href={`/content/generate?city=${scan.city}&state=${scan.state}&business=${scan.business_name}&scanId=${scan.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Content
          </Link>
        </div>
      </div>

      {/* Score Overview */}
      <div className="bg-[var(--card)] rounded-xl p-8 border border-[var(--border)]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={scan.geothority_score || 0} size={160} />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold mb-2">
              {scan.geothority_score! >= 70
                ? "Looking Good! 🎉"
                : scan.geothority_score! >= 40
                ? "Room for Improvement"
                : "Critical Issues Found ⚠️"}
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-lg">
              {scan.geothority_score! >= 70
                ? "Your website has a solid local SEO foundation. Focus on the remaining gaps to truly dominate."
                : scan.geothority_score! >= 40
                ? "You have some basics in place, but significant gaps are making you invisible to search and AI. Let's fix that."
                : "Your website is missing critical trust signals. You're likely invisible in local search and AI recommendations. The good news: we know exactly what to fix."}
            </p>
          </div>
        </div>
      </div>

      {/* Trust Stack */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
        <TrustStackVisualization layerScores={ls} />
      </div>

      {/* Quick Wins */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          Quick Wins ({quickWins.length})
        </h2>
        <div className="space-y-4">
          {quickWins.map((win, i) => (
            <QuickWinCard key={i} win={win} featured={i === 0} />
          ))}
        </div>

        {/* ReviewPulse cross-sell — show when Layer 4 (Reviews) score is low */}
        {ls.layer4 < 60 && (
          <div className="mt-6 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⭐</span>
                  <h3 className="font-semibold text-sm text-amber-400">Fix Your Review Score Automatically</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-lg">
                  Your review velocity is hurting your local rank. ReviewPulse automatically texts customers after every transaction and routes happy ones straight to Google — without you lifting a finger.
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Works with Square, Stripe, or any payment system. Setup takes 5 minutes.</p>
              </div>
              <a
                href="https://reviewpulse-iota.vercel.app?ref=geothority"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                Fix Reviews →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Competitor Gaps */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Competitor Gaps
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Top competitors in {scan.city}, {scan.state} and what they&apos;re doing better
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {competitors.map((comp, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{comp.businessName}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{comp.domain}</div>
                <div className="text-xs text-amber-500 mt-1">{comp.advantage}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{comp.score}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Score</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
