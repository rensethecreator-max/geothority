"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Globe,
  ExternalLink,
  ListChecks,
  Clock,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface PushResult {
  id: string;
  directory_name: string;
  sync_mode: string;
  status: string;
  result_detail: string | null;
  url: string | null;
  pushed_at: string | null;
}

interface Batch {
  id: string;
  total_directories: number;
  pushed_count: number;
  failed_count: number;
  skipped_count: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUS_ICON: Record<string, any> = {
  pushed: CheckCircle2,
  failed: XCircle,
  skipped: AlertTriangle,
  guided: ArrowRight,
  pending: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  pushed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-gray-400",
  guided: "text-blue-400",
  pending: "text-amber-400",
};

const MODE_LABEL: Record<string, string> = {
  direct: "Direct API",
  distribution: "Aggregator",
  guided: "Step-by-Step",
  unknown: "Check Only",
};

export default function NapPushPage() {
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState<{ batch: Batch; results: PushResult[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nap-push", { cache: "no-store" });
      const data = await res.json();
      setBatches(data.batches ?? []);
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handlePush = async () => {
    setPushing(true);
    try {
      const res = await fetch("/api/nap-push", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // Load the new batch
        const batchRes = await fetch(`/api/nap-push?batchId=${data.batchId}`);
        const batchData = await batchRes.json();
        setActiveBatch(batchData);
        await load();
      }
    } catch { /* handled */ } finally {
      setPushing(false);
    }
  };

  const loadBatch = async (batchId: string) => {
    const res = await fetch(`/api/nap-push?batchId=${batchId}`);
    const data = await res.json();
    setActiveBatch(data);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-electric-500" />
            NAP Push
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Push your canonical business name, address, and phone to all directories at once
          </p>
        </div>
        <button
          onClick={handlePush}
          disabled={pushing}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-electric-500 to-emerald-600 hover:from-electric-600 hover:to-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all"
        >
          {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {pushing ? "Pushing..." : "Push NAP Now"}
        </button>
      </div>

      {/* Active batch results */}
      {activeBatch && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Push Results</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-400">{activeBatch.batch.pushed_count} pushed</span>
              <span className="text-red-400">{activeBatch.batch.failed_count} failed</span>
              <span className="text-gray-400">{activeBatch.batch.skipped_count} skipped</span>
            </div>
          </div>
          <div className="space-y-2">
            {activeBatch.results.map((r) => {
              const Icon = STATUS_ICON[r.status] ?? Clock;
              const color = STATUS_COLOR[r.status] ?? "text-gray-400";
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.directory_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--background)] rounded text-[var(--muted-foreground)]">
                        {MODE_LABEL[r.sync_mode] ?? r.sync_mode}
                      </span>
                    </div>
                    {r.result_detail && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{r.result_detail}</p>
                    )}
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-electric-500 hover:text-electric-400 flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch history */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-electric-500" />
          Push History
        </h2>
        {batches.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No NAP push batches yet. Click &ldquo;Push NAP Now&rdquo; to start.</p>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => loadBatch(batch.id)}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:border-electric-500/30 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">
                    {batch.total_directories} directories
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {new Date(batch.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-400">{batch.pushed_count} ✓</span>
                  <span className="text-red-400">{batch.failed_count} ✗</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    batch.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    batch.status === "partial" ? "bg-amber-500/10 text-amber-400" :
                    batch.status === "failed" ? "bg-red-500/10 text-red-400" :
                    "bg-gray-500/10 text-gray-400"
                  }`}>
                    {batch.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
