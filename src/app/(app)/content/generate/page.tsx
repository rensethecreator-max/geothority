"use client";

import { useState, useRef, Suspense } from "react";
import DOMPurify from "dompurify";
import { useSearchParams } from "next/navigation";
import { PenTool, Loader2, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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

interface GeneratedContent {
  id: string;
  title: string | null;
  meta_description: string | null;
  content_html: string | null;
  content_markdown: string | null;
  quality_score: number | null;
}

function GenerateForm() {
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [service, setService] = useState("");
  const [businessName, setBusinessName] = useState(searchParams.get("business") || "");
  const [agentName, setAgentName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedTokens, setStreamedTokens] = useState("");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<GeneratedContent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    setStreamedTokens("");
    setProgress(0);
    setPreview(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          service,
          businessName,
          agentName,
          scanId: searchParams.get("scanId") || null,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        if (res.status === 403) {
          throw new Error("UPGRADE_REQUIRED:authority");
        }
        throw new Error(data.error || "Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let tokenCount = 0;

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

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.token) {
              tokenCount++;
              setStreamedTokens((prev) => prev + parsed.token);
              // Estimate progress: assume ~3000 tokens total
              setProgress(Math.min(Math.round((tokenCount / 800) * 90), 90));
            }

            if (parsed.done && parsed.content) {
              setProgress(100);
              setPreview(parsed.content);
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
              onClick={() => { setPreview(null); setStreamedTokens(""); }}
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

        {preview.quality_score && (
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-medium">Quality Score: {preview.quality_score}/100</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Includes local landmarks, trust signals, and schema markup
              </div>
            </div>
          </div>
        )}
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
          Create an SEO-optimized landing page with local landmarks, trust signals, and schema markup.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
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
            <label className="text-sm font-medium mb-2 block">Insurance Service</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            >
              <option value="">Select service...</option>
              {insuranceServices.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && error.startsWith("UPGRADE_REQUIRED:") ? (
          <div className="p-4 bg-electric-500/10 border border-electric-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-electric-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Authority Plan Required</p>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  AI Content Generation requires the Authority plan or above. Upgrade to generate geo-targeted landing pages that rank.
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
              Generating content...
            </>
          ) : (
            <>
              <PenTool className="w-5 h-5" />
              Generate Landing Page
            </>
          )}
        </button>

        {generating && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-[var(--muted)] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-electric-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-[var(--muted-foreground)] animate-pulse">
              {progress < 30
                ? "Researching local landmarks and trust signals..."
                : progress < 60
                ? "Crafting SEO-optimized content..."
                : progress < 90
                ? "Adding schema markup and meta data..."
                : "Saving your content..."}
            </p>

            {/* Live token stream preview */}
            {streamedTokens.length > 10 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 max-h-48 overflow-y-auto">
                <div className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">
                  Live Preview
                </div>
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
