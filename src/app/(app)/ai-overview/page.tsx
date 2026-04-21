"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { AICheckResult } from "@/lib/ai-citation-scanner";

interface GoogleAiOverviewResult {
  source: "google";
  found: boolean;
  mentionedText: string | null;
  confidence: "high" | "medium" | "low" | "none";
  snippet: string;
  recommendations: string[];
}

interface AiOverviewResponse {
  query: string;
  businessName: string;
  googleResult: GoogleAiOverviewResult;
  aiResults: AICheckResult[];
  realApiCount: number;
  overallVisibility: "high" | "medium" | "low" | "none";
  topRecommendations: string[];
}

const ENGINE_META: Record<
  string,
  { label: string; icon: string; color: string; glow: string }
> = {
  google: {
    label: "Google AI Overview",
    icon: "🔍",
    color: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  chatgpt: {
    label: "ChatGPT",
    icon: "🤖",
    color: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  perplexity: {
    label: "Perplexity AI",
    icon: "⚡",
    color: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
  claude: {
    label: "Claude",
    icon: "🔶",
    color: "text-orange-400",
    glow: "shadow-orange-500/20",
  },
  gemini: {
    label: "Gemini",
    icon: "✨",
    color: "text-cyan-400",
    glow: "shadow-cyan-500/20",
  },
  copilot: {
    label: "Copilot",
    icon: "🔷",
    color: "text-blue-500",
    glow: "shadow-blue-600/20",
  },
  grok: {
    label: "Grok",
    icon: "𝕏",
    color: "text-zinc-300",
    glow: "shadow-zinc-400/20",
  },
  deepseek: {
    label: "DeepSeek",
    icon: "🐋",
    color: "text-sky-400",
    glow: "shadow-sky-500/20",
  },
  meta_ai: {
    label: "Meta AI",
    icon: "♾️",
    color: "text-indigo-400",
    glow: "shadow-indigo-500/20",
  },
  you_com: {
    label: "You.com",
    icon: "🎯",
    color: "text-teal-400",
    glow: "shadow-teal-500/20",
  },
  mistral: {
    label: "Mistral",
    icon: "🌪️",
    color: "text-rose-400",
    glow: "shadow-rose-500/20",
  },
  brave: {
    label: "Brave",
    icon: "🦁",
    color: "text-amber-500",
    glow: "shadow-amber-500/20",
  },
  phind: {
    label: "Phind",
    icon: "🔎",
    color: "text-violet-400",
    glow: "shadow-violet-500/20",
  },
  iask: {
    label: "iAsk.ai",
    icon: "💬",
    color: "text-lime-400",
    glow: "shadow-lime-500/20",
  },
  qwen: {
    label: "Qwen",
    icon: "🐉",
    color: "text-red-400",
    glow: "shadow-red-500/20",
  },
  cohere: {
    label: "Cohere",
    icon: "🧠",
    color: "text-fuchsia-400",
    glow: "shadow-fuchsia-500/20",
  },
};

const VISIBILITY_STYLES = {
  high: {
    label: "High Visibility",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  medium: {
    label: "Medium Visibility",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  low: {
    label: "Low Visibility",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  none: {
    label: "Not Visible",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

const DEMO_MODE_SENTINEL = "__DEMO_MODE__";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  isReal,
  status,
}: {
  isReal: boolean;
  status: AICheckResult["status"] | "demo_mode";
}) {
  if (status === "demo_mode") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-400">
        Demo Mode
        <InfoTooltip
          content="Google AI Overview checking requires a premium SerpAPI key."
          side="top"
          iconClassName="w-3 h-3 text-blue-400"
        />
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 border border-gray-500/20 rounded-full text-xs font-semibold text-gray-400">
        Skipped
        <InfoTooltip
          content="API key not configured for this engine."
          side="top"
          iconClassName="w-3 h-3 text-gray-400"
        />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-semibold text-red-400">
        Error
      </div>
    );
  }
  if (isReal) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
        Live Check ✅
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
      Simulated
      <InfoTooltip
        content="Using OpenAI to simulate this engine's response. Add the real API key for live checks."
        side="top"
        iconClassName="w-3 h-3 text-amber-400"
      />
    </div>
  );
}

// ─── Google Result Card ───────────────────────────────────────────────────────

function GoogleResultCard({ result }: { result: GoogleAiOverviewResult }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ENGINE_META.google;
  const isDemoMode = result.snippet === DEMO_MODE_SENTINEL;
  const isFound = result.found && !isDemoMode;

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 ${
        isFound
          ? `border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-xl ${meta.glow}`
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      {isFound && (
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none" />
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <h3 className={`font-semibold text-sm ${meta.color}`}>{meta.label}</h3>
          </div>
        </div>
        <StatusBadge isReal={false} status={isDemoMode ? "demo_mode" : "checked"} />
      </div>

      {isDemoMode ? (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-300 leading-relaxed">
            Google AI Overview - Demo Mode. Full checking available with a SerpAPI key configured.
          </p>
        </div>
      ) : (
        <>
          {result.mentionedText && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-emerald-300 italic leading-relaxed">
                &ldquo;{result.mentionedText}&rdquo;
              </p>
            </div>
          )}
          <div className="mb-4">
            <p
              className={`text-xs text-[var(--muted-foreground)] leading-relaxed ${
                !expanded ? "line-clamp-3" : ""
              }`}
            >
              {result.snippet}
            </p>
            {result.snippet.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-electric-500 hover:text-electric-400 mt-1.5"
              >
                {expanded ? (
                  <>
                    Less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    More <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

      {/* Found / Not Found badge */}
      <div className="mt-3">
        {!isDemoMode &&
          (isFound ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">Found in AI Overview</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">Not in AI Overview</span>
            </div>
          ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-1.5 mt-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Recommendations
        </p>
        {result.recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-electric-500 flex-shrink-0 mt-1.5" />
            <p className="text-xs text-[var(--muted-foreground)]">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Engine Result Card ────────────────────────────────────────────────────

function AIEngineCard({ result }: { result: AICheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ENGINE_META[result.engine] || ENGINE_META.chatgpt;
  const isFound = result.found;

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 ${
        isFound
          ? `border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-xl ${meta.glow}`
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      {isFound && (
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <h3 className={`font-semibold text-sm ${meta.color}`}>{meta.label}</h3>
            {result.status === "checked" && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Confidence: {result.confidence}
              </p>
            )}
          </div>
        </div>
        <StatusBadge isReal={result.isReal} status={result.status} />
      </div>

      {/* Skipped state */}
      {result.status === "skipped" && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 leading-relaxed">{result.snippet}</p>
        </div>
      )}

      {/* Mentioned snippet */}
      {result.mentioned && result.snippet && result.status !== "skipped" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-emerald-300 italic leading-relaxed">
            &ldquo;{result.snippet}&rdquo;
          </p>
        </div>
      )}

      {/* Full snippet (when not found, show what AI said) */}
      {!result.mentioned && result.snippet && result.status !== "skipped" && (
        <div className="mb-4">
          <p
            className={`text-xs text-[var(--muted-foreground)] leading-relaxed ${
              !expanded ? "line-clamp-3" : ""
            }`}
          >
            {result.snippet}
          </p>
          {result.snippet.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-electric-500 hover:text-electric-400 mt-1.5"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  More <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Found / Not Found */}
      {result.status !== "skipped" && (
        <div className="mb-3">
          {isFound ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">Found</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">Not Found</span>
            </div>
          )}
        </div>
      )}

      {/* Competitors */}
      {result.competitors.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3 h-3 text-amber-400" />
            <p className="text-xs font-semibold text-amber-400">Mentioned Instead</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.competitors.slice(0, 4).map((comp, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300"
              >
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiOverviewPage() {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("insurance agency");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiOverviewResponse | null>(null);
  const [step, setStep] = useState<"idle" | "searching" | "done">("idle");

  const simulatedSteps = [
    "Checking Google AI Overviews...",
    "Querying ChatGPT...",
    "Querying Perplexity...",
    "Querying Claude & Gemini...",
    "Checking Copilot & Grok...",
    "Querying DeepSeek & Meta AI...",
    "Scanning You.com & Mistral...",
    "Checking Brave & Phind...",
    "Querying iAsk, Qwen & Cohere...",
    "Analyzing visibility signals...",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setStep("searching");
    setStepIdx(0);

    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < simulatedSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await fetch("/api/ai-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, city, businessType }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const d = (await res.json()) as { error?: string; currentPlan?: string; requiredPlan?: string };
        if (res.status === 403) {
          throw new Error(`UPGRADE_REQUIRED:${d.requiredPlan || "growth"}`);
        }
        throw new Error(d.error || "Check failed");
      }

      const data = (await res.json()) as AiOverviewResponse;
      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  const visStyle = result ? VISIBILITY_STYLES[result.overallVisibility] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-electric-500" />
          <h1 className="text-2xl font-bold">AI Overview Checker</h1>
          <span className="px-2 py-0.5 bg-electric-500/15 border border-electric-500/30 text-electric-500 text-[10px] font-bold rounded-full uppercase tracking-wide">
            New
          </span>
          <InfoTooltip
            content="Whether AI assistants like ChatGPT, Google AI, Perplexity, Claude, and Gemini mention your business when people search for services in your area."
            side="right"
          />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          See if your business appears in Google AI Overviews, ChatGPT, Perplexity, Claude, and
          Gemini - the new frontier of local search.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleCheck}
        className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Smith Insurance Agency"
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Austin, TX"
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Business Type</label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="insurance agency"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-electric-500 to-emerald-600 hover:from-electric-600 hover:to-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? "Checking..." : "Check AI Visibility"}
          </button>
        </div>
      </form>

      {/* Loading animation */}
      {step === "searching" && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-electric-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-electric-500 animate-pulse" />
          </div>
          <p className="text-sm font-medium mb-2">{simulatedSteps[stepIdx]}</p>
          <div className="flex justify-center gap-1 mt-4">
            {simulatedSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= stepIdx ? "bg-electric-500 w-6" : "bg-[var(--muted)] w-2"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {error && error.startsWith("UPGRADE_REQUIRED:") ? (
        <div className="p-5 bg-electric-500/10 border border-electric-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-electric-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[var(--foreground)] mb-1">Growth Plan Required</p>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                AI Overview tracking requires the Growth plan or above. Upgrade to see where you rank in ChatGPT, Perplexity, Google AI, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere.
              </p>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade to Growth
              </Link>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Results */}
      {result && step === "done" && (
        <div className="space-y-5">
          {/* Overall visibility + real API count */}
          {visStyle && (
            <div
              className={`flex items-center gap-4 p-5 rounded-xl border ${visStyle.border} ${visStyle.bg}`}
            >
              <TrendingUp className={`w-6 h-6 ${visStyle.color} flex-shrink-0`} />
              <div className="flex-1">
                <div className={`font-bold text-lg ${visStyle.color}`}>{visStyle.label}</div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{result.businessName}</strong>{" "}
                  appears in{" "}
                  <strong>
                    {
                      [
                        result.googleResult,
                        ...result.aiResults,
                      ].filter((r) => r.found).length
                    }
                  </strong>{" "}
                  of 5 AI platforms for &ldquo;{result.query}&rdquo;
                </p>
              </div>
              {result.realApiCount > 0 && (
                <div className="text-right text-xs text-gray-400 flex-shrink-0">
                  <div className="text-emerald-400 font-bold text-lg">{result.realApiCount}</div>
                  <div>Live APIs</div>
                </div>
              )}
            </div>
          )}

          {/* 16-card grid: Google + 15 AI engines
              Layout: on mobile 2-col grid, on large 4-col or 5-col */}
          <div className="space-y-4">
            {/* Google full width */}
            <GoogleResultCard result={result.googleResult} />

            {/* 15 AI engines: 2x2 on mobile, 4-col on large */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {result.aiResults.map((r) => (
                <AIEngineCard key={r.engine} result={r} />
              ))}
            </div>
          </div>

          {/* Top recommendations */}
          {result.topRecommendations.length > 0 && (
            <div className="bg-gradient-to-r from-electric-500/5 to-emerald-500/5 border border-electric-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold">
                  Top Recommendations to Improve AI Visibility
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.topRecommendations.map((rec, i) => (
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

          {/* Run again */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setResult(null);
                setStep("idle");
              }}
              className="text-sm text-electric-500 hover:text-electric-400 font-medium"
            >
              ← Check another business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
