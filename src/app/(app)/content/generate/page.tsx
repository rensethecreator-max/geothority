"use client";

import { useState, useRef, Suspense } from "react";
import DOMPurify from "dompurify";
import { useSearchParams } from "next/navigation";
import {
  PenTool,
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileText,
  BookOpen,
  Wrench,
  HelpCircle,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

const contentTypes = [
  { value: "landing_page", label: "Landing Page", icon: FileText, desc: "City+service SEO page with local signals" },
  { value: "blog_post", label: "Blog Post", icon: BookOpen, desc: "1200+ word informative article with TL;DR" },
  { value: "service_page", label: "Service Page", icon: Wrench, desc: "Detailed service page with pricing language" },
  { value: "localized_faq", label: "Localized FAQ", icon: HelpCircle, desc: "8-12 Q&A pairs optimized for AI Overview" },
  { value: "trust_page", label: "Trust Page", icon: Shield, desc: "Credibility & community involvement page" },
  { value: "about", label: "About Page", icon: Users, desc: "Business story with local flavor" },
];

const insuranceServices = [
  "Auto Insurance",
  "Home Insurance",
  "Life Insurance",
  "Business Insurance",
  "Umbrella Insurance",
  "Renters Insurance",
  "Motorcycle Insurance",
  "Boat Insurance",
  "Flood Insurance",
  "Health Insurance",
  "Medicare Supplement",
  "Pet Insurance",
];

interface BriefData {
  id: string;
  contentType: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  outline: { heading: string; headingLevel: number; keyPoints: string[]; targetWordCount: number; localRelevanceHint?: string }[];
  seoTargets: { primaryKeyword: string; secondaryKeywords: string[]; city: string; targetWordCount: { min: number; max: number }; cityMentionRange: { min: number; max: number } };
  localRelevance: { city: string; landmarks: string[]; neighborhoods: string[]; nearbyCities?: string[] };
  aiConfig: { includeSummary: boolean; includeStructuredData: boolean; strictHeadingHierarchy: boolean; includePAAQuestions: boolean };
  toneAndStyle: string;
}

interface GeneratedContent {
  id: string;
  title: string | null;
  meta_description: string | null;
  content_html: string | null;
  content_markdown: string | null;
  quality_score: number | null;
}

interface SEOChecklist {
  titleUnder60Chars: boolean;
  metaUnder160Chars: boolean;
  hasH1: boolean;
  headingHierarchy: boolean;
  cityMentions: number;
  keywordInTitle: boolean;
  keywordInFirstParagraph: boolean;
  hasInternalLinks: boolean;
  hasSchema: boolean;
  wordCount: number;
  overallScore: number;
}

function GenerateForm() {
  const searchParams = useSearchParams();

  const [contentType, setContentType] = useState(searchParams.get("type") || "landing_page");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [service, setService] = useState(searchParams.get("service") || "");
  const [businessName, setBusinessName] = useState(searchParams.get("business") || "");
  const [agentName, setAgentName] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [industry, setIndustry] = useState("insurance");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedTokens, setStreamedTokens] = useState("");
  const [progress, setProgress] = useState(0);
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [preview, setPreview] = useState<GeneratedContent | null>(null);
  const [seoChecklist, setSeoChecklist] = useState<SEOChecklist | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedType = contentTypes.find((t) => t.value === contentType);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    setStreamedTokens("");
    setProgress(0);
    setBrief(null);
    setPreview(null);
    setSeoChecklist(null);
    setSummary(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          city,
          service: service || undefined,
          businessName,
          agentName: agentName || undefined,
          scanId: searchParams.get("scanId") || null,
          industry: industry || undefined,
          targetKeyword: targetKeyword || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        if (res.status === 403) throw new Error("UPGRADE_REQUIRED:authority");
        throw new Error(data.error || "Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let tokenCount = 0;
      let briefReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) throw new Error(parsed.error);

            if (parsed.type === "brief" && parsed.brief) {
              setBrief(parsed.brief);
              briefReceived = true;
              setProgress(10);
            }

            if (parsed.type === "token" && parsed.token) {
              tokenCount++;
              setStreamedTokens((prev) => prev + parsed.token);
              const base = briefReceived ? 15 : 5;
              setProgress(Math.min(base + Math.round((tokenCount / 800) * 80), 95));
            }

            if (parsed.type === "done") {
              setProgress(100);
              if (parsed.content) setPreview(parsed.content);
              if (parsed.output?.seoChecklist) setSeoChecklist(parsed.output.seoChecklist);
              if (parsed.output?.summary) setSummary(parsed.output.summary);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  // Preview state
  if (preview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h1 className="text-2xl font-bold">Content Generated!</h1>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{preview.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPreview(null); setBrief(null); setStreamedTokens(""); setSeoChecklist(null); setSummary(null); }}
              className="px-4 py-2 bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] rounded-lg text-sm font-medium transition-colors"
            >
              Generate Another
            </button>
            <Link
              href="/content"
              className="px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              View in Library
            </Link>
          </div>
        </div>

        {/* AI Summary */}
        {summary && (
          <div className="bg-electric-500/5 border border-electric-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-electric-400" />
              <span className="text-xs font-semibold text-electric-400">AI Summary (for AI Overview extraction)</span>
            </div>
            <p className="text-sm text-[var(--foreground)]">{summary}</p>
          </div>
        )}

        {/* Content preview */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Meta Title</div>
            <div className="text-sm font-medium">{preview.title}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-2">Meta Description</div>
            <div className="text-sm">{preview.meta_description}</div>
          </div>
          <div className="p-6">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(preview.content_html || preview.content_markdown || ""),
              }}
            />
          </div>
        </div>

        {/* Quality + SEO Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-medium">Quality Score: {preview.quality_score}/100</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                SEO, local relevance, and AI summarization readiness
              </div>
            </div>
          </div>

          {seoChecklist && (
            <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
              <div className="text-sm font-medium mb-2">SEO Checklist</div>
              <div className="space-y-1 text-xs">
                <CheckItem pass={seoChecklist.titleUnder60Chars} label="Meta title < 60 chars" />
                <CheckItem pass={seoChecklist.metaUnder160Chars} label="Meta desc < 160 chars" />
                <CheckItem pass={seoChecklist.hasH1} label="Has H1 tag" />
                <CheckItem pass={seoChecklist.headingHierarchy} label="Heading hierarchy" />
                <CheckItem pass={seoChecklist.keywordInTitle} label="Keyword in title" />
                <CheckItem pass={seoChecklist.keywordInFirstParagraph} label="Keyword in first ¶" />
                <CheckItem pass={seoChecklist.hasSchema} label="Schema markup" />
                <div className="text-[var(--muted-foreground)] mt-1">
                  City mentions: {seoChecklist.cityMentions} • Words: {seoChecklist.wordCount}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/content"
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Content Library
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Generate Content</h1>
        <p className="text-[var(--muted-foreground)]">
          Create SEO-optimized, AI-summarizable content with local relevance and structured data.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Content Type Selector */}
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <label className="text-sm font-medium mb-3 block">Content Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {contentTypes.map((ct) => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setContentType(ct.value)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                    contentType === ct.value
                      ? "border-electric-500 bg-electric-500/10"
                      : "border-[var(--border)] hover:border-electric-500/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${contentType === ct.value ? "text-electric-400" : "text-[var(--muted-foreground)]"}`} />
                    <span className="text-sm font-medium">{ct.label}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{ct.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Smith Insurance Agency"
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Agent Name (optional)</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="John Smith"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Target City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                required
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="insurance"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>
          </div>

          {(contentType === "landing_page" || contentType === "service_page" || contentType === "blog_post" || contentType === "localized_faq") && (
            <div>
              <label className="text-sm font-medium mb-2 block">Insurance Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
              >
                <option value="">Select service...</option>
                {insuranceServices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Target Keyword (optional)</label>
            <input
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="auto insurance Austin TX"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>
        </div>

        {error && error.startsWith("UPGRADE_REQUIRED:") ? (
          <div className="p-4 bg-electric-500/10 border border-electric-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-electric-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Authority Plan Required</p>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  AI Content Generation requires the Authority plan or above.
                </p>
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Upgrade to Authority
                </Link>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-xl text-lg font-semibold transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating {selectedType?.label || "content"}...
            </>
          ) : (
            <>
              <PenTool className="w-5 h-5" />
              Generate {selectedType?.label || "Content"}
            </>
          )}
        </button>

        {generating && (
          <div className="space-y-3">
            <div className="w-full bg-[var(--muted)] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-electric-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-[var(--muted-foreground)] animate-pulse">
              {progress < 10
                ? "Generating content brief..."
                : progress < 30
                ? "Researching local landmarks and keywords..."
                : progress < 60
                ? "Drafting SEO-optimized content..."
                : progress < 90
                ? "Adding schema markup and AI summary..."
                : "Validating and saving..."}
            </p>

            {/* Brief preview */}
            {brief && !preview && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <div className="text-xs font-semibold text-electric-400 mb-2">Content Brief Generated</div>
                <div className="text-sm font-medium mb-1">{brief.title}</div>
                <div className="text-xs text-[var(--muted-foreground)] mb-2">{brief.metaDescription}</div>
                <div className="space-y-1">
                  {brief.outline?.slice(0, 4).map((s, i) => (
                    <div key={i} className="text-xs text-[var(--muted-foreground)]">
                      H{s.headingLevel}: {s.heading}
                    </div>
                  ))}
                  {brief.outline?.length > 4 && (
                    <div className="text-xs text-[var(--muted-foreground)]">+{brief.outline.length - 4} more sections</div>
                  )}
                </div>
                {brief.localRelevance?.landmarks?.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Landmarks: {brief.localRelevance.landmarks.slice(0, 3).join(", ")}
                  </div>
                )}
              </div>
            )}

            {streamedTokens.length > 10 && !preview && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 max-h-48 overflow-y-auto">
                <div className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">Live Preview</div>
                <div className="text-xs text-[var(--foreground)] font-mono whitespace-pre-wrap opacity-70 leading-relaxed">
                  {streamedTokens.slice(-800)}
                  <span className="inline-block w-1.5 h-3.5 bg-electric-500 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function CheckItem({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${pass ? "bg-emerald-500" : "bg-red-500/60"}`} />
      <span className={pass ? "" : "text-[var(--muted-foreground)]"}>{label}</span>
    </div>
  );
}

export default function ContentGeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-electric-500" />
        </div>
      }
    >
      <GenerateForm />
    </Suspense>
  );
}
