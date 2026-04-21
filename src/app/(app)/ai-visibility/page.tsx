"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart3,
  FileText,
  Target,
  ArrowRight,
  Clock,
  Zap,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/info-tooltip";

// ─── Types ─────────────────────────────────────────────────────

interface Scorecard {
  id: string;
  overall_score: number;
  overall_visibility: string;
  google_ai_score: number;
  chatgpt_score: number;
  perplexity_score: number;
  claude_score: number;
  gemini_score: number;
  previous_overall_score: number | null;
  score_delta: number | null;
  total_queries: number;
  found_queries: number;
  gap_analysis: Record<string, any>;
  top_recommendations: string[];
  last_computed_at: string;
}

interface QuerySet {
  id: string;
  name: string;
  vertical: string | null;
  city: string;
  state: string | null;
  queries: Array<{ query: string; priority: number }>;
  last_checked_at: string | null;
}

interface RecentCheck {
  id: string;
  query: string;
  engine: string;
  found: boolean;
  confidence: string;
  checked_at: string;
  is_real: boolean;
}

interface ContentRec {
  id: string;
  recommendation_type: string;
  title: string;
  description: string | null;
  priority: number;
  impact_estimate: string | null;
  target_engine: string | null;
  status: string;
}

interface TrendPoint {
  date: string;
  found: number;
  total: number;
  rate: number;
}

interface EngineSummary {
  checks: number;
  found: number;
  lastChecked: string | null;
}

interface VisibilityData {
  scorecard: Scorecard | null;
  querySets: QuerySet[];
  recentChecks: RecentCheck[];
  recommendations: ContentRec[];
  trendData: TrendPoint[];
  engineSummary: Record<string, EngineSummary>;
}

const ENGINE_META: Record<string, { label: string; icon: string; color: string; note?: string }> = {
  google_ai: { label: "Google AI", icon: "🔍", color: "text-blue-400" },
  chatgpt: { label: "ChatGPT", icon: "🤖", color: "text-emerald-400" },
  perplexity: { label: "Perplexity", icon: "⚡", color: "text-purple-400" },
  claude: { label: "Claude", icon: "🔶", color: "text-orange-400" },
  gemini: { label: "Gemini", icon: "✨", color: "text-cyan-400" },
  copilot: { label: "Copilot", icon: "🔷", color: "text-blue-500", note: "Inferred from Bing" },
  grok: { label: "Grok", icon: "𝕏", color: "text-zinc-300" },
  deepseek: { label: "DeepSeek", icon: "🐋", color: "text-sky-400" },
  meta_ai: { label: "Meta AI", icon: "♾️", color: "text-indigo-400", note: "Approximation via Llama" },
  you_com: { label: "You.com", icon: "🎯", color: "text-teal-400" },
  mistral: { label: "Mistral", icon: "🌪️", color: "text-rose-400" },
  brave: { label: "Brave", icon: "🦁", color: "text-amber-500", note: "Inferred from Brave Search" },
  phind: { label: "Phind", icon: "🔎", color: "text-violet-400", note: "Simulated" },
  iask: { label: "iAsk.ai", icon: "💬", color: "text-lime-400", note: "Simulated" },
  qwen: { label: "Qwen", icon: "🐉", color: "text-red-400" },
  cohere: { label: "Cohere", icon: "🧠", color: "text-fuchsia-400" },
};

const VIS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "High Visibility" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Medium Visibility" },
  low: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Low Visibility" },
  none: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Not Visible" },
};

const REC_TYPE_ICONS: Record<string, any> = {
  faq_page: FileText,
  local_page: Search,
  schema: Code,
  citation: Target,
  trust_content: Zap,
  entity_page: BarChart3,
};

import { Code } from "lucide-react";

// ─── Score Ring ─────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 60 ? "#10b981" : score >= 35 ? "#f59e0b" : score >= 10 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
      </div>
    </div>
  );
}

// ─── Engine Score Bar ──────────────────────────────────────────

function EngineScoreBar({ engine, score }: { engine: string; score: number }) {
  const meta = ENGINE_META[engine] ?? { label: engine, icon: "📊", color: "text-gray-400" };
  const note = meta.note;
  const barColor =
    score >= 60 ? "bg-emerald-500" : score >= 35 ? "bg-amber-500" : score >= 10 ? "bg-orange-500" : "bg-red-500/40";

  const getNoteTooltip = (n: string, label: string) => {
    if (n === "Simulated") return `This result is simulated using a similar AI model. ${label} does not offer a public API, so this reflects likely behavior.`;
    if (n === "Inferred from Bing") return "Copilot uses Bing search results. This result is based on your visibility in Bing.";
    if (n === "Inferred from Brave Search") return "Brave AI uses Brave search results. This result is based on your visibility in Brave Search.";
    if (n === "Approximation via Llama") return "Meta AI does not offer a public API. This result uses Meta's Llama model as an approximation of Meta AI behavior.";
    return n;
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-6 text-center">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium flex items-center gap-1">
            {meta.label}
            {note && (
              <>
                <span className="text-[9px] text-white/30 italic">({note})</span>
                <InfoTooltip
                  content={getNoteTooltip(note, meta.label)}
                  side="top"
                  iconClassName="w-2.5 h-2.5 opacity-30 hover:opacity-80"
                />
              </>
            )}
          </span>
          <span className={`text-sm font-bold ${score >= 60 ? "text-emerald-400" : score >= 35 ? "text-amber-400" : score > 0 ? "text-orange-400" : "text-red-400"}`}>
            {score}
          </span>
        </div>
        <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.max(score, 2)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AIVisibilityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VisibilityData | null>(null);
  const [checking, setChecking] = useState(false);
  const [recsExpanded, setRecsExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-visibility", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRunCheck = async () => {
    if (!data?.querySets?.length) return;
    setChecking(true);
    try {
      const qs = data.querySets[0];
      const firstQuery = qs.queries?.[0]?.query || `${qs.city} insurance agency`;
      await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          businessName: "My Business",
          city: qs.city,
          businessType: qs.vertical || "insurance agency",
          querySetId: qs.id,
        }),
      });
      await load();
    } catch {
      // handled
    } finally {
      setChecking(false);
    }
  };

  const handleDismiss = async (recId: string) => {
    await fetch("/api/ai-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_recommendation", recommendationId: recId }),
    });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-electric-500 animate-spin" />
      </div>
    );
  }

  const scorecard = data?.scorecard;
  const visConfig = scorecard ? VIS_CONFIG[scorecard.overall_visibility] ?? VIS_CONFIG.none : VIS_CONFIG.none;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-electric-500" />
            <h1 className="text-2xl font-bold">AI Visibility Scorecard</h1>
            <span className="px-2 py-0.5 bg-electric-500/15 border border-electric-500/30 text-electric-500 text-[10px] font-bold rounded-full uppercase tracking-wide">
              New
            </span>
            <InfoTooltip
              content="Your aggregated AI visibility score across Google AI, ChatGPT, Perplexity, Claude, and Gemini. Higher = more likely AI assistants recommend you."
              side="right"
            />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Track how often AI assistants mention your business — and what to do about it
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ai-overview"
            className="text-sm text-electric-500 hover:text-electric-400 font-medium flex items-center gap-1"
          >
            Run Manual Check <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* No scorecard yet */}
      {!scorecard && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-8 text-center">
          <Sparkles className="w-12 h-12 text-electric-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No AI Visibility Data Yet</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-md mx-auto">
            Run your first AI Overview check to establish your baseline visibility score across all major AI platforms — ChatGPT, Perplexity, Google AI, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere.
          </p>
          <Link
            href="/ai-overview"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-electric-500 to-emerald-600 hover:from-electric-600 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Search className="w-4 h-4" /> Run First Check
          </Link>
        </div>
      )}

      {/* Scorecard */}
      {scorecard && (
        <>
          {/* Top section: Score ring + engine bars */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Overall score */}
            <div className={`lg:col-span-1 rounded-2xl border p-6 ${visConfig.bg} ${visConfig.border}`}>
              <div className="flex flex-col items-center">
                <ScoreRing score={scorecard.overall_score} />
                <div className="mt-3 text-center">
                  <div className={`text-sm font-bold ${visConfig.color}`}>{visConfig.label}</div>
                  {scorecard.score_delta !== null && scorecard.score_delta !== 0 && (
                    <div className={`flex items-center gap-1 text-xs mt-1 ${scorecard.score_delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {scorecard.score_delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {scorecard.score_delta > 0 ? "+" : ""}{scorecard.score_delta} from last check
                    </div>
                  )}
                  {scorecard.score_delta === 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Minus className="w-3 h-3" /> No change
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                  Found in <span className="text-[var(--foreground)] font-bold">{scorecard.found_queries}</span> of{" "}
                  <span className="text-[var(--foreground)] font-bold">{scorecard.total_queries}</span> queries
                </div>
              </div>
            </div>

            {/* Engine breakdown */}
            <div className="lg:col-span-2 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
              <h2 className="font-semibold mb-4">Per-Engine Scores</h2>
              <div className="space-y-4">
                <EngineScoreBar engine="google_ai" score={scorecard.google_ai_score} />
                <EngineScoreBar engine="chatgpt" score={scorecard.chatgpt_score} />
                <EngineScoreBar engine="perplexity" score={scorecard.perplexity_score} />
                <EngineScoreBar engine="claude" score={scorecard.claude_score} />
                <EngineScoreBar engine="gemini" score={scorecard.gemini_score} />
              </div>
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={handleRunCheck}
                  disabled={checking}
                  className="text-sm text-electric-500 hover:text-electric-400 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Refresh Scores
                </button>
              </div>
            </div>
          </div>

          {/* Trend chart (simple bar chart) */}
          {data?.trendData && data.trendData.length > 1 && (
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-electric-500" />
                Visibility Trend
              </h2>
              <div className="flex items-end gap-1 h-32">
                {data.trendData.map((point, i) => {
                  const height = Math.max(point.rate, 4);
                  const color = point.rate >= 60 ? "bg-emerald-500" : point.rate >= 35 ? "bg-amber-500" : point.rate >= 10 ? "bg-orange-500" : "bg-red-500/40";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-[var(--muted-foreground)]">{point.rate}%</div>
                      <div className="w-full relative">
                        <div
                          className={`w-full rounded-t ${color} transition-all duration-500`}
                          style={{ height: `${height}%`, minHeight: "4px" }}
                        />
                      </div>
                      <div className="text-[9px] text-[var(--muted-foreground)] truncate w-full text-center">
                        {point.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Recommendations */}
          {scorecard.top_recommendations && scorecard.top_recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-electric-500/5 to-emerald-500/5 border border-electric-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold">Top Recommendations</h3>
              </div>
              <div className="space-y-2">
                {scorecard.top_recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Content Recommendations (actionable) */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-electric-500" />
              <h2 className="font-semibold">Content Actions to Improve AI Visibility</h2>
            </div>
            <button
              onClick={() => setRecsExpanded(!recsExpanded)}
              className="text-xs text-electric-500 flex items-center gap-1"
            >
              {recsExpanded ? "Show Less" : "Show All"}
              {recsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <div className="space-y-3">
            {(recsExpanded ? data.recommendations : data.recommendations.slice(0, 3)).map((rec) => {
              const RecIcon = REC_TYPE_ICONS[rec.recommendation_type] ?? FileText;
              const impactColor =
                rec.impact_estimate === "high" ? "text-emerald-400" :
                rec.impact_estimate === "medium" ? "text-amber-400" : "text-gray-400";
              return (
                <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-electric-500/30 transition-colors">
                  <RecIcon className="w-5 h-5 text-electric-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rec.title}</span>
                      {rec.impact_estimate && (
                        <span className={`text-[10px] font-bold uppercase ${impactColor}`}>
                          {rec.impact_estimate} impact
                        </span>
                      )}
                      {rec.target_engine && ENGINE_META[rec.target_engine] && (
                        <span className="text-xs">{ENGINE_META[rec.target_engine].icon}</span>
                      )}
                    </div>
                    {rec.description && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{rec.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    className="text-xs text-[var(--muted-foreground)] hover:text-red-400 flex-shrink-0 px-2 py-1"
                  >
                    Dismiss
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Engine Summary */}
      {data?.engineSummary && Object.keys(data.engineSummary).length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-electric-500" />
            Engine Summary (Last 30 Days)
          </h2>
          <div className="grid sm:grid-cols-5 gap-3">
            {Object.entries(data.engineSummary).map(([engine, summary]) => {
              const meta = ENGINE_META[engine] ?? { label: engine, icon: "📊", color: "text-gray-400" };
              const note = meta.note;
              const rate = summary.checks > 0 ? Math.round((summary.found / summary.checks) * 100) : 0;
              return (
                <div key={engine} className="text-center p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-xl mb-1">{meta.icon}</div>
                  <div className="text-xs font-medium mb-1">{meta.label}</div>
                  {note && <div className="text-[9px] text-white/30 italic">{note}</div>}
                  <div className={`text-lg font-bold ${rate >= 50 ? "text-emerald-400" : rate > 0 ? "text-amber-400" : "text-red-400"}`}>
                    {rate}%
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    {summary.found}/{summary.checks} found
                  </div>
                  {summary.lastChecked && (
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1 flex items-center justify-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(summary.lastChecked).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Query Sets */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold mb-3">Query Sets</h2>
        {(!data?.querySets || data.querySets.length === 0) ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No query sets saved yet. Run an AI Overview check to create your first set.
          </p>
        ) : (
          <div className="space-y-2">
            {data.querySets.map((qs) => (
              <div key={qs.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]">
                <div>
                  <div className="font-medium text-sm">{qs.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {qs.city}{qs.state ? `, ${qs.state}` : ""} · {qs.queries?.length ?? 0} queries
                    {qs.vertical && ` · ${qs.vertical}`}
                  </div>
                </div>
                {qs.last_checked_at && (
                  <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(qs.last_checked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Checks */}
      {data?.recentChecks && data.recentChecks.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-3">Recent Checks</h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {data.recentChecks.slice(0, 25).map((check) => {
              const meta = ENGINE_META[check.engine] ?? { label: check.engine, icon: "📊", color: "text-gray-400" };
              return (
                <div key={check.id} className="flex items-center gap-3 text-sm py-1.5">
                  <span className="text-sm">{meta.icon}</span>
                  {check.found ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-[var(--muted-foreground)]">{check.query}</span>
                  <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
                    {new Date(check.checked_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
