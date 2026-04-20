"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import {
  FileText,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit3,
  Trash2,
  Sparkles,
  Eye,
  Calendar,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface GBPPost {
  id: string;
  title: string | null;
  body: string;
  cta_type: string | null;
  cta_url: string | null;
  image_url: string | null;
  post_type: string;
  suggestion_reason: string | null;
  business_context: Record<string, any>;
  status: "draft" | "pending_approval" | "approved" | "published" | "failed" | "expired";
  auto_generated: boolean;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  expires_at: string | null;
  views: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

interface PostsResponse {
  posts: GBPPost[];
  templates: any[];
  summary: {
    total: number;
    drafts: number;
    pendingApproval: number;
    published: number;
    failed: number;
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  draft: { bg: "bg-gray-500/10", text: "text-gray-400", icon: Edit3, label: "Draft" },
  pending_approval: { bg: "bg-amber-500/10", text: "text-amber-400", icon: Clock, label: "Pending" },
  approved: { bg: "bg-blue-500/10", text: "text-blue-400", icon: CheckCircle2, label: "Approved" },
  published: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: Send, label: "Published" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", icon: XCircle, label: "Failed" },
  expired: { bg: "bg-gray-500/10", text: "text-gray-500", icon: Clock, label: "Expired" },
};

function PostCard({
  post,
  onApprove,
  onPublish,
  onDelete,
  approving,
  publishing,
}: {
  post: GBPPost;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  approving: string | null;
  publishing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
  const StatusIcon = status.icon;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.auto_generated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-electric-500/10 text-electric-500 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.bg} ${status.text} flex items-center gap-0.5`}>
              <StatusIcon className="w-2.5 h-2.5" />
              {status.label}
            </span>
            {post.scheduled_for && (
              <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(post.scheduled_for).toLocaleDateString()}
              </span>
            )}
          </div>
          {post.title && (
            <div className="font-semibold text-sm mb-1">{post.title}</div>
          )}
          <div className={`text-sm text-[var(--muted-foreground)] whitespace-pre-line ${expanded ? "" : "line-clamp-3"}`}>
            {post.body}
          </div>
          {post.body.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-electric-500 hover:text-electric-600 mt-1"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {post.status === "draft" && (
            <button
              onClick={() => onApprove(post.id)}
              disabled={approving === post.id}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              {approving === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Approve
            </button>
          )}
          {(post.status === "approved" || post.status === "draft") && (
            <button
              onClick={() => onPublish(post.id)}
              disabled={publishing === post.id}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              {publishing === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Publish
            </button>
          )}
          {post.status !== "published" && (
            <button
              onClick={() => onDelete(post.id)}
              className="px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 text-xs text-[var(--muted-foreground)]">
        {post.cta_type && (
          <span className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--border)]">
            CTA: {post.cta_type}
          </span>
        )}
        {post.suggestion_reason && (
          <span className="italic">{post.suggestion_reason}</span>
        )}
        {post.status === "published" && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {post.views} views · {post.clicks} clicks
          </span>
        )}
        <span className="ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default function GBPPostsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PostsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/gbp/posts${statusParam}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load posts");
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/gbp/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId: string) => {
    setApproving(postId);
    try {
      await fetch("/api/gbp/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", postId }),
      });
      await load();
    } catch {
      // handled by reload
    } finally {
      setApproving(null);
    }
  };

  const handlePublish = async (postId: string) => {
    setPublishing(postId);
    try {
      await fetch("/api/gbp/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", postId }),
      });
      await load();
    } catch {
      // handled by reload
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await fetch("/api/gbp/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", postId }),
      });
      await load();
    } catch {
      // handled by reload
    }
  };

  if (loading) return <ContentSkeleton />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-electric-500" />
            GBP Posts
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Generate, approve, and publish Google Business Profile posts
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating..." : "Generate Suggestions"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-3 text-center">
            <div className="text-lg font-bold">{data.summary.drafts}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Drafts</div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-3 text-center">
            <div className="text-lg font-bold text-amber-400">{data.summary.pendingApproval}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Pending</div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">{data.summary.published}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Published</div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-3 text-center">
            <div className="text-lg font-bold text-red-400">{data.summary.failed}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Failed</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "pending_approval", "approved", "published"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filter === f
                ? "bg-electric-500 text-white"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {f === "all" ? "All" : f === "pending_approval" ? "Pending" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {data && data.posts.length > 0 ? (
        <div className="space-y-3">
          {data.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onApprove={handleApprove}
              onPublish={handlePublish}
              onDelete={handleDelete}
              approving={approving}
              publishing={publishing}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Generate AI-powered post suggestions tailored to your business, season, and market."
          actionLabel="Generate Suggestions"
          onAction={handleGenerate}
        />
      )}
    </div>
  );
}
