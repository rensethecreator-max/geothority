"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

// ── Types (mirroring server types) ────────────────────────────────

interface LocalKeyword {
  term: string;
  searchVolume: number | null;
  difficulty: string | null;
  intent: string;
  cpc: number | null;
  localRelevance: number;
  priority: number;
  peopleAlsoAsk: string[];
}

interface ContentGap {
  id: string;
  gapType: string;
  pageType: string;
  targetKeyword: string;
  supportingKeywords: string[];
  title: string;
  description: string;
  impact: string;
  effort: string;
  recommendedActions: string[];
}

interface TopicCluster {
  id: string;
  pillarKeyword: string;
  pillarTitle: string;
  clusterKeywords: LocalKeyword[];
  contentGaps: ContentGap[];
  totalEstimatedTraffic: number;
  priority: number;
}

interface ContentBrief {
  id: string;
  pageType: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  title: string;
  metaTitle: string;
  metaDescription: string;
  outline: { heading: string; level: number; keyPoints: string[]; wordCountHint: number }[];
  wordCountTarget: number;
  localOptimization: { cityMentions: number; neighborhoodReferences: string[]; landmarkReferences: string[] } | null;
  estimatedImpact: string;
  priority: number;
}

type ResearchResult = {
  id: string;
  status: string;
  keywords: LocalKeyword[];
  contentGaps: ContentGap[];
  topicClusters: TopicCluster[];
  contentBriefs: ContentBrief[];
};

// ── Badge Helpers ─────────────────────────────────────────────────

const intentColor: Record<string, string> = {
  transactional: "bg-green-500/20 text-green-400",
  commercial_investigation: "bg-blue-500/20 text-blue-400",
  informational: "bg-yellow-500/20 text-yellow-400",
  navigational: "bg-purple-500/20 text-purple-400",
};

const impactColor: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const difficultyColor: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-orange-500/20 text-orange-400",
  very_hard: "bg-red-500/20 text-red-400",
};

// ── Component ─────────────────────────────────────────────────────

export default function KeywordResearchPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"keywords" | "gaps" | "clusters" | "briefs">("keywords");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("user_profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data: p }) => setProfile(p as UserProfile));
      }
    });
  }, []);

  const runResearch = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: profile.business_name,
          city: profile.city,
          state: profile.state,
          businessType: "insurance_agency",
          services: ["auto insurance", "home insurance", "life insurance", "business insurance"],
          competitorDomains: [],
          websiteUrl: null,
          existingPages: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Research failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Local Keyword Research</h1>
            <p className="text-sm text-zinc-400 mt-1">
              AI-driven keyword discovery &amp; content gap analysis
            </p>
          </div>
          <button
            onClick={runResearch}
            disabled={loading || !profile}
            className="px-4 py-2 bg-[#4ADE80] text-black font-semibold rounded-lg hover:bg-[#4ADE80]/90 disabled:opacity-50 text-sm"
          >
            {loading ? "Researching..." : "Run Research"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && !result && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ADE80] mr-3" />
            <span className="text-zinc-400">Analyzing keywords &amp; content gaps...</span>
          </div>
        )}

        {result && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Keywords Found", value: result.keywords.length },
                { label: "Content Gaps", value: result.contentGaps.length },
                { label: "Topic Clusters", value: result.topicClusters.length },
                { label: "Content Briefs", value: result.contentBriefs.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#4ADE80]">{stat.value}</div>
                  <div className="text-xs text-zinc-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1">
              {(["keywords", "gaps", "clusters", "briefs"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md capitalize transition ${
                    tab === t ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Keywords Tab */}
            {tab === "keywords" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="text-left px-4 py-3">Keyword</th>
                      <th className="text-right px-4 py-3">Volume</th>
                      <th className="text-center px-4 py-3">Difficulty</th>
                      <th className="text-center px-4 py-3">Intent</th>
                      <th className="text-right px-4 py-3">CPC</th>
                      <th className="text-center px-4 py-3">Local</th>
                      <th className="text-right px-4 py-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.keywords.slice(0, 50).map((kw, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium">{kw.term}</td>
                        <td className="px-4 py-3 text-right text-zinc-300">
                          {kw.searchVolume ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {kw.difficulty && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColor[kw.difficulty] || ""}`}>
                              {kw.difficulty.replace("_", " ")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${intentColor[kw.intent] || ""}`}>
                            {kw.intent.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">
                          {kw.cpc ? `$${kw.cpc.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-300">{kw.localRelevance}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-[#4ADE80]">{kw.priority}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Gaps Tab */}
            {tab === "gaps" && (
              <div className="space-y-3">
                {result.contentGaps.map((gap) => (
                  <div key={gap.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{gap.title}</h3>
                        <p className="text-sm text-zinc-400 mt-1">{gap.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${impactColor[gap.impact] || ""}`}>
                          {gap.impact} impact
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300">
                          {gap.pageType}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="text-xs text-zinc-500">Target: </span>
                      <span className="text-xs text-[#4ADE80]">{gap.targetKeyword}</span>
                      {gap.supportingKeywords.map((sk) => (
                        <span key={sk} className="text-xs text-zinc-400">· {sk}</span>
                      ))}
                    </div>
                    {gap.recommendedActions.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {gap.recommendedActions.map((a, i) => (
                          <li key={i} className="text-xs text-zinc-400 flex gap-2">
                            <span className="text-zinc-600">→</span> {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Clusters Tab */}
            {tab === "clusters" && (
              <div className="space-y-4">
                {result.topicClusters.map((cluster) => (
                  <div key={cluster.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{cluster.pillarTitle}</h3>
                      <span className="text-sm text-zinc-400">
                        ~{cluster.totalEstimatedTraffic} monthly searches
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">Pillar: {cluster.pillarKeyword}</p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.clusterKeywords.slice(0, 10).map((kw) => (
                        <span key={kw.term} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                          {kw.term} <span className="text-[#4ADE80] ml-1">{kw.priority}</span>
                        </span>
                      ))}
                      {cluster.clusterKeywords.length > 10 && (
                        <span className="px-2 py-1 text-xs text-zinc-500">
                          +{cluster.clusterKeywords.length - 10} more
                        </span>
                      )}
                    </div>
                    {cluster.contentGaps.length > 0 && (
                      <div className="mt-3 text-xs text-zinc-400">
                        {cluster.contentGaps.length} content gap{cluster.contentGaps.length !== 1 ? "s" : ""} to fill
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Briefs Tab */}
            {tab === "briefs" && (
              <div className="space-y-4">
                {result.contentBriefs.map((brief) => (
                  <div key={brief.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{brief.title}</h3>
                        <p className="text-sm text-zinc-400">
                          {brief.pageType} · {brief.wordCountTarget} words · Target: {brief.targetKeyword}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${impactColor[brief.estimatedImpact] || ""}`}>
                        {brief.estimatedImpact} impact
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-zinc-500">Meta Title:</p>
                      <p className="text-sm text-zinc-300">{brief.metaTitle}</p>
                      <p className="text-xs text-zinc-500 mt-1">Meta Description:</p>
                      <p className="text-sm text-zinc-300">{brief.metaDescription}</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-500 mb-2">Outline:</p>
                      {brief.outline.map((section, i) => (
                        <div key={i} className="ml-2 mb-2">
                          <div className="text-sm font-medium" style={{ marginLeft: `${(section.level - 1) * 12}px` }}>
                            {"#".repeat(section.level)} {section.heading}
                            <span className="text-zinc-600 ml-2 text-xs">~{section.wordCountHint}w</span>
                          </div>
                          <ul className="ml-6 mt-0.5">
                            {section.keyPoints.map((point, j) => (
                              <li key={j} className="text-xs text-zinc-400">• {point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {brief.localOptimization && (
                      <div className="border-t border-zinc-800 pt-3 mt-3">
                        <p className="text-xs text-zinc-500 mb-1">Local SEO Notes:</p>
                        <p className="text-xs text-zinc-400">
                          {brief.localOptimization.cityMentions} city mentions
                          {brief.localOptimization.neighborhoodReferences.length > 0 &&
                            ` · Neighborhoods: ${brief.localOptimization.neighborhoodReferences.join(", ")}`}
                          {brief.localOptimization.landmarkReferences.length > 0 &&
                            ` · Landmarks: ${brief.localOptimization.landmarkReferences.join(", ")}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!result && !loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Local Keyword Research</h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
              Discover high-intent local search terms, analyze content gaps, and get
              AI-generated content briefs for service pages, location pages, FAQs, and blog posts.
            </p>
            <button
              onClick={runResearch}
              disabled={!profile}
              className="px-6 py-3 bg-[#4ADE80] text-black font-semibold rounded-lg hover:bg-[#4ADE80]/90 disabled:opacity-50 text-sm"
            >
              Start Research
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
