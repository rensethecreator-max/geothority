"use client";

import { useState, Suspense } from "react";
import DOMPurify from "dompurify";
import { useSearchParams } from "next/navigation";
import { PenTool, Loader2, Sparkles, ArrowLeft } from "lucide-react";
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

function GenerateForm() {
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [service, setService] = useState("");
  const [businessName, setBusinessName] = useState(searchParams.get("business") || "");
  const [agentName, setAgentName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title?: string;
    meta_description?: string;
    content_html?: string;
    content_markdown?: string;
    quality_score?: number;
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGenerating(true);

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
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const { content } = await res.json();
      setPreview(content);
    } catch (err: unknown) {
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
            <h1 className="text-2xl font-bold">Content Generated! ✨</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{preview.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreview(null)}
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
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.content_html || preview.content_markdown || "") }}
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
          Create an SEO-optimized landing page with local landmarks, trust
          signals, and schema markup.
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

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

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
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)] animate-pulse-slow">
              AI is crafting your SEO-optimized page with local landmarks and trust signals...
            </p>
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
