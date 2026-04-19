"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedContent } from "@/lib/types";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  PenTool,
  Clock,
  CheckCircle2,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default function ContentPage() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadContent() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("generated_content")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setContent(data);
      setLoading(false);
    }

    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSelectedContentId(params.get("contentId"));
  }, []);

  const handlePublish = async (contentId: string) => {
    setPublishing(contentId);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      if (res.ok) {
        setContent((prev) =>
          prev.map((c) =>
            c.id === contentId
              ? { ...c, status: "published", published_at: new Date().toISOString() }
              : c
          )
        );
      }
    } catch {
      // Handle error
    } finally {
      setPublishing(null);
    }
  };

  const orderedContent = useMemo(() => {
    if (!selectedContentId) return content;
    return [...content].sort((a, b) => {
      if (a.id === selectedContentId) return -1;
      if (b.id === selectedContentId) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [content, selectedContentId]);

  if (loading) return <ContentSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Library</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {content.length} pages generated
          </p>
        </div>
        <Link
          href="/content/generate"
          className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PenTool className="w-4 h-4" />
          Generate New
        </Link>
      </div>

      {content.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content yet"
          description="Generate your first SEO-optimized landing page. Our AI creates city-specific insurance content with local landmarks, trust signals, and schema markup."
          actionLabel="Generate Content"
          actionHref="/content/generate"
        />
      ) : (
        <div className="space-y-3">
          {orderedContent.map((item) => (
            <div
              key={item.id}
              className={`bg-[var(--card)] rounded-xl p-5 border transition-colors ${item.id === selectedContentId ? "border-electric-500 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]" : "border-[var(--border)] hover:border-[var(--border)]"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className={`flex items-center gap-2 mb-1 ${item.id === selectedContentId ? "border-electric-500 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]" : "border-[var(--border)] hover:border-[var(--border)] transition-colors"}`}>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    {item.id === selectedContentId && (
                      <Badge className="bg-electric-500/10 text-electric-300 border-electric-500/20">From Fix Engine</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{item.city}, {item.service}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === "published" ? "default" : "secondary"}
                    className={
                      item.status === "published"
                        ? "bg-score-good/10 text-score-good border-score-good/20"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    }
                  >
                    {item.status === "published" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    ) : (
                      "Draft"
                    )}
                  </Badge>
                </div>
              </div>

              {item.meta_description && (
                <p className="text-xs text-[var(--muted-foreground)] mb-3 line-clamp-2">
                  {item.meta_description}
                </p>
              )}

              <div className="flex items-center gap-2">
                {item.status === "draft" && (
                  <button
                    onClick={() => handlePublish(item.id)}
                    disabled={publishing === item.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    {publishing === item.id ? "Publishing..." : "Publish"}
                  </button>
                )}
                {item.quality_score && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Quality: {item.quality_score}/100
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
