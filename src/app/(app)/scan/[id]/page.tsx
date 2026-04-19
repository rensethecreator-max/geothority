"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Scan } from "@/lib/types";
import { ScanSkeleton } from "@/components/shared/loading-skeleton";
import { TrustStackVisualization, ScoreRing } from "@/components/scan/trust-stack";
import { QuickWinCard } from "@/components/scan/quick-win-card";
import { StarceptaBanner } from "@/components/upsell/StarceptaBanner";
import { PDFReportButton } from "@/components/scan/pdf-report";
import { useAchievements } from "@/hooks/use-achievements";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Target,
  Trophy,
  FileText,
  Zap,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
  Code,
  AlignLeft,
  MapPin,
  Link2,
  BarChart3,
  Sparkles,
  Star,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import Link from "next/link";

/* ─── Types ─── */

interface FixItem {
  type: "schema" | "faq" | "about" | "landing_page" | "meta_tags" | "listing_sync" | "ai_optimization";
  title: string;
  content: string;
  instructions: string;
  impact: "high" | "medium" | "low";
  autoApplied: boolean;
  group?: string;
}

interface FixPackage {
  scanId: string;
  generatedAt: string;
  fixes: FixItem[];
  totalFixes: number;
  autoAppliedCount: number;
}

type FixExecutionMode = "AUTO" | "ASSISTED" | "GUIDED";

type FixStepStatus = "pending" | "skipped" | "running" | "completed" | "failed" | "needs_input";

interface FixStep {
  id: string;
  fixType: string;
  title: string;
  impact: "high" | "medium" | "low";
  autoRunnable: boolean;
  status: FixStepStatus;
  userAction?: string;
  resultMessage?: string;
  artifactId?: string;
  artifactType?: string;
  startedAt?: string;
  completedAt?: string;
  verification?: { fixType: string; passed: boolean; message: string; scoreBefore?: number; scoreAfter?: number; verifiedAt: string };
}

interface FixExecutionPlan {
  id: string;
  scanId: string;
  mode: FixExecutionMode;
  steps: FixStep[];
  createdAt: string;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  needsInput: number;
  status: "planning" | "executing" | "paused" | "completed" | "failed";
}

/* ─── FixCard ─── */

const fixTypeConfig: Record<FixItem["type"], { icon: React.ElementType; label: string; color: string }> = {
  schema: { icon: Code, label: "Schema Markup", color: "text-purple-400" },
  faq: { icon: AlignLeft, label: "FAQ Content", color: "text-blue-400" },
  about: { icon: FileText, label: "About Page", color: "text-teal-400" },
  landing_page: { icon: MapPin, label: "Landing Page", color: "text-emerald-400" },
  meta_tags: { icon: BarChart3, label: "Meta Tags", color: "text-amber-400" },
  listing_sync: { icon: Link2, label: "Listing Sync", color: "text-emerald-400" },
  ai_optimization: { icon: Brain, label: "AI Optimization", color: "text-violet-400" },
};

const impactColors = {
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function FixCard({ fix }: { fix: FixItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = fixTypeConfig[fix.type] ?? fixTypeConfig.schema;
  const Icon = cfg.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(fix.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // For ai_optimization, try to parse JSON for nicer display
  let aiParsed: Record<string, string> | null = null;
  if (fix.type === "ai_optimization") {
    try { aiParsed = JSON.parse(fix.content); } catch { /* raw */ }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117] overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{fix.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${impactColors[fix.impact]}`}>
              {fix.impact.charAt(0).toUpperCase() + fix.impact.slice(1)} Impact
            </span>
            {fix.autoApplied && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-applied
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{fix.instructions}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!fix.autoApplied && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4">
          {fix.type === "ai_optimization" && aiParsed ? (
            <div className="space-y-4">
              <p className="text-xs text-violet-400 font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                These changes help AI assistants like ChatGPT and Perplexity recognize and recommend your business.
              </p>
              {Object.entries(aiParsed).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                  <pre className="text-xs text-gray-300 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-white/5">
                    {typeof val === "string" ? val : JSON.stringify(val, null, 2)}
                  </pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(typeof val === "string" ? val : JSON.stringify(val, null, 2)); }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy this section
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs text-gray-300 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-white/5">
              {fix.content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function ScanResultPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixPackage, setFixPackage] = useState<FixPackage | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixMode, setFixMode] = useState<FixExecutionMode>("ASSISTED");
  const [execPlan, setExecPlan] = useState<FixExecutionPlan | null>(null);
  const [executing, setExecuting] = useState(false);
  const [publishingArtifactId, setPublishingArtifactId] = useState<string | null>(null);
  const [artifactStatusById, setArtifactStatusById] = useState<Record<string, { status: "draft" | "published"; cmsPostId: string | null }>>({});
  const supabase = createClient();

  // IMPORTANT: All hooks must be called before any conditional returns
  useAchievements({ scanScore: scan?.geothority_score ?? 0, scanCount: scan ? 1 : 0 });

  useEffect(() => {
    async function loadScan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (data) setScan(data);
      setLoading(false);
    }

    loadScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleFixAll = async () => {
    if (fixing || !scan) return;

    // If we already have a package, just scroll to it
    if (fixPackage) {
      document.getElementById("fix-package")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setFixing(true);
    setFixError(null);

    try {
      const res = await fetch("/api/scan/fix-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate fixes");
      }

      const pkg: FixPackage = await res.json();
      setFixPackage(pkg);

      // Scroll to results after a tick
      setTimeout(() => {
        document.getElementById("fix-package")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFixing(false);
    }
  };

  const handleStartExecution = async () => {
    if (!fixPackage || !scan || executing) return;
    setExecuting(true);
    setFixError(null);

    try {
      // 1. Build execution plan
      const planRes = await fetch("/api/fix-engine/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id, mode: fixMode }),
      });

      if (!planRes.ok) {
        const err = await planRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create execution plan");
      }

      const plan: FixExecutionPlan = await planRes.json();
      setExecPlan(plan);

      // 2. Execute the plan
      const execRes = await fetch("/api/fix-engine/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!execRes.ok) {
        const err = await execRes.json().catch(() => ({}));
        throw new Error(err.error || "Execution failed");
      }

      const executed: FixExecutionPlan = await execRes.json();
      setExecPlan(executed);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleStepAction = async (stepId: string, action: "complete" | "skip") => {
    if (!execPlan || executing) return;
    setExecuting(true);
    try {
      const res = await fetch("/api/fix-engine/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: execPlan.id, stepId, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Step action failed");
      }
      const updated: FixExecutionPlan = await res.json();
      setExecPlan(updated);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Step action failed");
    } finally {
      setExecuting(false);
    }
  };

  const handlePublishArtifact = async (stepId: string, artifactId: string) => {
    setPublishingArtifactId(artifactId);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: artifactId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Publish failed");
      }

      setArtifactStatusById((prev) => ({
        ...prev,
        [artifactId]: {
          status: "published",
          cmsPostId: data.cmsPostId || null,
        },
      }));

      setExecPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId
              ? { ...step, resultMessage: `${step.resultMessage || "Draft saved."} Published successfully.` }
              : step
          ),
        };
      });
    } catch (error) {
      setFixError(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPublishingArtifactId(null);
    }
  };

  const artifactIds = useMemo(
    () =>
      (execPlan?.steps || [])
        .filter((step) => step.artifactType === "generated_content" && step.artifactId)
        .map((step) => step.artifactId as string),
    [execPlan]
  );

  useEffect(() => {
    async function hydrateArtifactStatuses() {
      if (artifactIds.length === 0) return;

      const results = await Promise.all(
        artifactIds.map(async (artifactId) => {
          try {
            const res = await fetch(`/api/content/${artifactId}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.content) return null;
            return {
              artifactId,
              status: data.content.status as "draft" | "published",
              cmsPostId: data.content.cms_post_id as string | null,
            };
          } catch {
            return null;
          }
        })
      );

      const next = results.reduce<Record<string, { status: "draft" | "published"; cmsPostId: string | null }>>((acc, item) => {
        if (item) {
          acc[item.artifactId] = {
            status: item.status,
            cmsPostId: item.cmsPostId,
          };
        }
        return acc;
      }, {});

      if (Object.keys(next).length > 0) {
        setArtifactStatusById((prev) => ({ ...prev, ...next }));
      }
    }

    hydrateArtifactStatuses();
  }, [artifactIds]);

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

  // Group fixes by group label for display
  const aiGroupFixes = fixPackage?.fixes.filter((f) => f.group === "AI Optimization Package") ?? [];
  const regularFixes = fixPackage?.fixes.filter((f) => f.group !== "AI Optimization Package") ?? [];

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
          <div className="flex items-center gap-2 flex-wrap">
            <PDFReportButton scan={scan} />
            <Link
              href={`/content/generate?city=${scan.city}&state=${scan.state}&business=${scan.business_name}&scanId=${scan.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate Content
            </Link>
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <div className="bg-[var(--card)] rounded-xl p-8 border border-[var(--border)]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={scan.geothority_score || 0} size={160} />
            <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              Trust Stack Score
              <InfoTooltip
                content="Your overall local search authority score from 0-100. Higher means more visibility in Google and AI search."
                side="bottom"
              />
            </div>
          </div>
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

      {/* Starcepta Review Cross-Sell Banner */}
      {!bannerDismissed && (
        <StarceptaBanner
          reviewHealthScore={ls.layer4}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Trust Stack */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
        <TrustStackVisualization layerScores={ls} />
      </div>

      {/* Quick Wins */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          Quick Wins ({quickWins.length})
          <InfoTooltip
            content="Specific, actionable fixes you can make today to improve your score. Sorted by impact."
            side="right"
          />
        </h2>
        <div className="space-y-4">
          {quickWins.map((win, i) => (
            <QuickWinCard key={i} win={win} featured={i === 0} scanId={scan.id} index={i} />
          ))}
        </div>

        {/* Cross-sell: Starcepta */}
        {ls.layer4 < 60 && (
          <div className="mt-6 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl border border-green-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold">Your Review Score is Holding You Back</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Your competitors average more reviews. Starcepta automates review collection with One-Tap Reviews - customers leave a 5-star review in 3 seconds.
                </p>
                <a
                  href="https://starcepta.com?ref=geothority"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 mt-2 font-medium"
                >
                  Try Starcepta Free <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Cross-sell: 4MinuteSEO */}
        <div className="mt-6 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl border border-blue-500/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">Want to Fix Everything Automatically?</h4>
              <p className="text-sm text-gray-400 mt-1">
                4MinuteSEO builds your backlinks, generates content, and gets you indexed - on autopilot. The engine behind your local SEO growth.
              </p>
              <a
                href="https://4minuteseo.com?ref=geothority"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-2 font-medium"
              >
                Learn About 4MinuteSEO <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Fix Everything Banner ─── */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Fix What Matters
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Generate your missing schema, content, meta tags, AI optimization, and sync listings — with control over how much runs automatically.
            </p>
          </div>
          {!fixPackage && (
            <button
              onClick={handleFixAll}
              disabled={fixing}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {fixing ? "Generating Fixes..." : "Generate Fixes"}
            </button>
          )}
        </div>

        {fixError && (
          <p className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">
            {fixError}
          </p>
        )}

        {fixing && (
          <div className="mt-6 space-y-2">
            {["Analyzing scan results...", "Generating content with AI...", "Packaging your fixes..."].map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {msg}
              </div>
            ))}
          </div>
        )}

        {fixPackage && !execPlan && (
          <div id="fix-package" className="mt-6 space-y-6">
            {/* Execution Mode Selector */}
            <div className="rounded-xl border border-white/10 bg-[#0f1117] p-5">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Choose Execution Mode
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {([
                  { mode: "AUTO" as FixExecutionMode, label: "Auto", desc: "Run everything automatically. Hands-off.", icon: "🤖" },
                  { mode: "ASSISTED" as FixExecutionMode, label: "Assisted", desc: "Auto-run safe fixes; you confirm the rest.", icon: "🤝" },
                  { mode: "GUIDED" as FixExecutionMode, label: "Guided", desc: "You approve each step. Full control.", icon: "📋" },
                ]).map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setFixMode(opt.mode)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      fixMode === opt.mode
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-lg mb-1">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleStartExecution}
                disabled={executing}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {executing ? "Executing..." : `Start ${fixMode === "AUTO" ? "Auto" : fixMode === "ASSISTED" ? "Assisted" : "Guided"} Execution`}
              </button>
            </div>

            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 text-sm border-b border-white/5 pb-4">
              <span className="text-emerald-400 font-semibold">{fixPackage.totalFixes} fixes generated</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400">{fixPackage.autoAppliedCount} applied automatically</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500 text-xs">Generated {new Date(fixPackage.generatedAt).toLocaleString()}</span>
            </div>

            {/* Regular Fixes */}
            {regularFixes.length > 0 && (
              <div className="space-y-3">
                {regularFixes.map((fix, i) => (
                  <FixCard key={i} fix={fix} />
                ))}
              </div>
            )}

            {/* AI Optimization Package - grouped separately */}
            {aiGroupFixes.length > 0 && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <h4 className="font-bold text-sm text-violet-300">AI Optimization Package</h4>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium">High Impact</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  These changes help AI assistants like ChatGPT and Perplexity recognize and recommend your business. Generate the exact content and schema that <em>makes</em> AI recommend you - not just checks if it does.
                </p>
                {aiGroupFixes.map((fix, i) => (
                  <FixCard key={i} fix={fix} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execution Progress */}
        {execPlan && (
          <div className="mt-6 space-y-4" id="fix-package">
            {/* Progress Bar */}
            <div className="rounded-xl border border-white/10 bg-[#0f1117] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Execution Progress
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  {execPlan.mode} Mode
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${execPlan.progress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <span>{execPlan.completed}/{execPlan.total} completed</span>
                {execPlan.failed > 0 && <span className="text-rose-400">{execPlan.failed} failed</span>}
                {execPlan.needsInput > 0 && <span className="text-amber-400">{execPlan.needsInput} need your action</span>}
                <span className="ml-auto font-semibold text-emerald-400">{execPlan.progress}%</span>
              </div>
            </div>

            {/* Step List */}
            <div className="space-y-2">
              {execPlan.steps.map((step) => {
                const cfg = fixTypeConfig[step.fixType as FixItem["type"]] ?? fixTypeConfig.schema;
                const StepIcon = cfg.icon;
                const artifactStatus = step.artifactId ? artifactStatusById[step.artifactId] : null;
                const isPublishedArtifact = artifactStatus?.status === "published";
                const statusIcon = step.status === "completed" ? <Check className="w-4 h-4 text-emerald-400" /> : step.status === "failed" ? <XCircle className="w-4 h-4 text-rose-400" /> : step.status === "running" ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : step.status === "needs_input" ? <ArrowRight className="w-4 h-4 text-amber-400" /> : <div className="w-4 h-4 rounded-full border border-gray-600" />;
                return (
                  <div key={step.id} className={`rounded-lg border p-3 flex items-center gap-3 ${step.status === "completed" ? "border-emerald-500/20 bg-emerald-500/5" : step.status === "failed" ? "border-rose-500/20 bg-rose-500/5" : step.status === "needs_input" ? "border-amber-500/20 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
                    <div className="flex-shrink-0">{statusIcon}</div>
                    <StepIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{step.title}</div>
                      {step.userAction && step.status === "needs_input" && (
                        <div className="text-xs text-amber-400 mt-0.5">{step.userAction}</div>
                      )}
                      {step.resultMessage && (step.status === "completed" || step.status === "running") && (
                        <div className="text-xs text-gray-500 mt-0.5">{step.resultMessage}</div>
                      )}
                      {step.verification && (
                        <div className={`text-xs mt-1 px-2 py-1 rounded ${step.verification.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          ✓ Verified: {step.verification.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${impactColors[step.impact]}`}>
                        {step.impact.charAt(0).toUpperCase() + step.impact.slice(1)}
                      </span>
                      {step.autoRunnable && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                          Auto
                        </span>
                      )}
                      {step.artifactType === "generated_content" && step.artifactId && step.status === "completed" && (
                        <>
                          <Link
                            href={`/content/${step.artifactId}?contentId=${step.artifactId}`}
                            className="px-2 py-1 text-xs font-medium rounded-lg bg-white/5 text-gray-200 hover:bg-white/10 transition-colors"
                          >
                            {isPublishedArtifact ? "Open published" : "Open draft"}
                          </Link>
                          {isPublishedArtifact ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Published{artifactStatus?.cmsPostId ? ` (#${artifactStatus.cmsPostId})` : ""}
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePublishArtifact(step.id, step.artifactId!)}
                              disabled={publishingArtifactId === step.artifactId}
                              className="px-2 py-1 text-xs font-medium rounded-lg bg-electric-500/20 text-electric-300 hover:bg-electric-500/30 disabled:opacity-60 transition-colors"
                            >
                              {publishingArtifactId === step.artifactId ? "Publishing..." : "Publish"}
                            </button>
                          )}
                        </>
                      )}
                      {step.artifactType === "listing_sync" && step.artifactId && step.status === "completed" && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Sync saved
                        </span>
                      )}
                      {step.status === "needs_input" && (
                        <>
                          <button onClick={() => handleStepAction(step.id, "complete")} className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">Done</button>
                          <button onClick={() => handleStepAction(step.id, "skip")} className="px-2 py-1 text-xs font-medium rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">Skip</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
            <InfoTooltip
              content="Areas where your competitors are outperforming you. Fix these to close the gap."
              side="right"
            />
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
