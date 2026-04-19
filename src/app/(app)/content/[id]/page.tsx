"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import type { GeneratedContent } from "@/lib/types";

type CmsState = {
  type: string | null;
  configured: boolean;
  wordpressContentType: "pages" | "posts";
  autoPublishFixes: boolean;
  verifyAfterPublish: boolean;
};

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const contentId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [cms, setCms] = useState<CmsState>({
    type: null,
    configured: false,
    wordpressContentType: "pages",
    autoPublishFixes: false,
    verifyAfterPublish: true,
  });
  const [publishOptions, setPublishOptions] = useState({
    wpContentType: "pages" as "pages" | "posts",
    slug: "",
    verifyAfterPublish: true,
  });
  const [form, setForm] = useState({
    title: "",
    meta_description: "",
    content_html: "",
    content_markdown: "",
  });

  useEffect(() => {
    async function loadContent() {
      if (!contentId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/content/${contentId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.error || "Failed to load content");

        setContent(data.content);
        setCms(
          data.cms || {
            type: null,
            configured: false,
            wordpressContentType: "pages",
            autoPublishFixes: false,
            verifyAfterPublish: true,
          }
        );
        setPublishOptions({
          wpContentType: data.cms?.wordpressContentType === "posts" ? "posts" : "pages",
          slug: data.content.title || "",
          verifyAfterPublish: data.cms?.verifyAfterPublish !== false,
        });
        setForm({
          title: data.content.title || "",
          meta_description: data.content.meta_description || "",
          content_html: data.content.content_html || "",
          content_markdown: data.content.content_markdown || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [contentId]);

  const editorLabel = useMemo(() => {
    if (form.content_markdown?.trim()) return "Markdown / working draft";
    return "HTML content";
  }, [form.content_markdown]);

  const activeBodyField = form.content_markdown?.trim() ? "content_markdown" : "content_html";

  const handleSave = async () => {
    if (!contentId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save content");

      setContent(data.content);
      setSuccess("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!contentId) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          wpContentType: publishOptions.wpContentType,
          slug: publishOptions.slug,
          verifyAfterPublish: publishOptions.verifyAfterPublish,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to publish content");

      setContent((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              published_at: data.publishedAt || new Date().toISOString(),
              cms_post_id: data.cmsPostId || prev.cms_post_id,
            }
          : prev
      );
      setSuccess(
        data.verified
          ? `Published and verified${data.liveUrl ? ` at ${data.liveUrl}` : ""}`
          : "Published successfully"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish content");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <ContentSkeleton />;
  if (!content) {
    return (
      <div className="space-y-4">
        <Link href="/content" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to content
        </Link>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          {error || "Content not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/content" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-white mb-3">
            <ArrowLeft className="w-4 h-4" />
            Back to content
          </Link>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <Badge className={content.status === "published" ? "bg-score-good/10 text-score-good border-score-good/20" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}>
              {content.status === "published" ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Published</span>
              ) : (
                "Draft"
              )}
            </Badge>
            <Badge className="bg-electric-500/10 text-electric-300 border-electric-500/20">{content.type}</Badge>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {content.city || "Unknown city"}{content.service ? `, ${content.service}` : ""}
            {cms.type ? ` • CMS: ${cms.type}` : " • No CMS configured"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </button>

          {content.status === "draft" ? (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {publishing ? "Publishing..." : cms.configured ? "Publish to CMS" : "Publish"}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Published
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-300">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300 break-all">{success}</div>
      )}

      {!cms.configured && content.status === "draft" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          Connect WordPress in <Link href="/settings" className="underline hover:text-white">Settings</Link> to make publish actually push this page into your CMS.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div>
            <label className="text-sm font-medium block mb-2">Title</label>
            <input
              value={form.title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setForm((prev) => ({ ...prev, title: nextTitle }));
                setPublishOptions((prev) => ({
                  ...prev,
                  slug: prev.slug === "" || prev.slug === form.title ? nextTitle : prev.slug,
                }));
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Meta description</label>
            <textarea
              value={form.meta_description}
              onChange={(e) => setForm((prev) => ({ ...prev, meta_description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">{editorLabel}</label>
            <textarea
              value={activeBodyField === "content_markdown" ? form.content_markdown : form.content_html}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [activeBodyField]: e.target.value,
                }))
              }
              rows={22}
              className="w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-electric-500 font-mono"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <h2 className="font-semibold">Publishing State</h2>
            <div className="text-sm text-[var(--muted-foreground)] space-y-2">
              <div>Status: <span className="text-white">{content.status}</span></div>
              <div>Created: <span className="text-white">{new Date(content.created_at).toLocaleString()}</span></div>
              {content.published_at && (
                <div>Published: <span className="text-white">{new Date(content.published_at).toLocaleString()}</span></div>
              )}
              {content.cms_post_id && <div>CMS Post ID: <span className="text-white">{content.cms_post_id}</span></div>}
              <div>Default target: <span className="text-white capitalize">{publishOptions.wpContentType}</span></div>
              <div>Verification: <span className="text-white">{publishOptions.verifyAfterPublish ? "On" : "Off"}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <h2 className="font-semibold">Publish Controls</h2>
            <div>
              <label className="text-sm font-medium block mb-2">WordPress target</label>
              <select
                value={publishOptions.wpContentType}
                onChange={(e) => setPublishOptions((prev) => ({ ...prev, wpContentType: e.target.value as "pages" | "posts" }))}
                className="w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-electric-500"
              >
                <option value="pages">Pages</option>
                <option value="posts">Posts</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Slug</label>
              <input
                value={publishOptions.slug}
                onChange={(e) => setPublishOptions((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-sm outline-none focus:border-electric-500"
                placeholder="city-service-page"
              />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
              <input
                type="checkbox"
                checked={publishOptions.verifyAfterPublish}
                onChange={(e) => setPublishOptions((prev) => ({ ...prev, verifyAfterPublish: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium">Verify after publish</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  Re-check WordPress after publish and confirm the content exists before reporting success.
                </div>
              </div>
            </label>
            {cms.autoPublishFixes && (
              <div className="text-xs text-emerald-400 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                Auto-publish from fix execution is enabled in Settings.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <h2 className="font-semibold">Content Metadata</h2>
            <div className="text-sm text-[var(--muted-foreground)] space-y-2">
              <div>Type: <span className="text-white">{content.type}</span></div>
              <div>City: <span className="text-white">{content.city || "—"}</span></div>
              <div>Service: <span className="text-white">{content.service || "—"}</span></div>
              <div>Quality: <span className="text-white">{content.quality_score ?? "—"}</span></div>
            </div>
          </div>

          {content.schema_json && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Schema Preview</h2>
                <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)]" />
              </div>
              <pre className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap break-words bg-black/20 rounded-lg p-3 border border-white/5">
                {JSON.stringify(content.schema_json, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
