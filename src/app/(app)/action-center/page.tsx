"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  PauseCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

interface PlanSummary {
  id: string;
  scan_id: string;
  mode: string;
  status: "planning" | "executing" | "paused" | "completed" | "failed";
  progress: number;
  total: number;
  completed: number;
  failed: number;
  needs_input: number;
  created_at: string;
  updated_at: string;
}

interface SyncSummary {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  sync_status: string;
  directories_reached: number;
  created_at: string;
}

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  planning: { label: "Pending", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  executing: { label: "Running", icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10" },
  paused: { label: "Needs Approval", icon: PauseCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

const MODE_BADGE: Record<string, string> = {
  AUTO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ASSISTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  GUIDED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const SYNC_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  verified: { label: "Verified", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  found: { label: "Found", color: "text-blue-500", bg: "bg-blue-500/10" },
  pending: { label: "Pending", color: "text-amber-500", bg: "bg-amber-500/10" },
  error: { label: "Error", color: "text-red-500", bg: "bg-red-500/10" },
  not_found: { label: "Not Found", color: "text-gray-500", bg: "bg-gray-500/10" },
};

// ── Components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.planning;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className={`w-3.5 h-3.5 ${status === "executing" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const cls = MODE_BADGE[mode] ?? MODE_BADGE.GUIDED;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${cls}`}>
      {mode}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  let barColor = "bg-emerald-500";
  if (pct < 100 && pct > 0) barColor = "bg-blue-500";
  if (pct === 0) barColor = "bg-gray-300 dark:bg-gray-600";

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PlanRow({
  plan,
  onApprove,
  approving,
}: {
  plan: PlanSummary;
  onApprove: (id: string) => void;
  approving: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isApprovable = plan.status === "paused" || plan.status === "planning";
  const isRunning = plan.status === "executing";

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              Plan {plan.id.slice(0, 12)}…
            </span>
            <ModeBadge mode={plan.mode} />
            <StatusBadge status={plan.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{plan.completed}/{plan.total} steps</span>
            {plan.failed > 0 && <span className="text-red-500 font-medium">{plan.failed} failed</span>}
            {plan.needs_input > 0 && <span className="text-orange-500 font-medium">{plan.needs_input} need input</span>}
            <span>· {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="w-24 shrink-0">
          <ProgressBar value={plan.progress} />
          <div className="text-right text-xs text-gray-400 mt-0.5">{plan.progress}%</div>
        </div>
        {isApprovable && (
          <button
            type="button"
            disabled={approving === plan.id}
            onClick={(e) => {
              e.stopPropagation();
              onApprove(plan.id);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {approving === plan.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Approve
          </button>
        )}
        {isRunning && (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-400 mb-0.5">Scan</div>
              <Link
                href={`/scan/${plan.scan_id}`}
                className="text-blue-500 hover:underline truncate block"
              >
                {plan.scan_id.slice(0, 12)}…
              </Link>
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Created</div>
              <div>{formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Last Updated</div>
              <div>{formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Mode</div>
              <div>{plan.mode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SyncRow({ sync }: { sync: SyncSummary }) {
  const cfg = SYNC_STATUS_CFG[sync.sync_status] ?? SYNC_STATUS_CFG.pending;
  const Icon = cfg.color.includes("emerald") ? CheckCircle2 : cfg.color.includes("red") ? XCircle : Clock;
  const location = [sync.city, sync.state].filter(Boolean).join(", ") || "—";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
      <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {sync.business_name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{location}</div>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
      {sync.directories_reached > 0 && (
        <span className="text-xs text-gray-400">{sync.directories_reached} dirs</span>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ActionCenterPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [syncs, setSyncs] = useState<SyncSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [tab, setTab] = useState<"needs-action" | "running" | "completed" | "failed" | "syncs">("needs-action");

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/action-center/plans", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch action center data");
      const data = await res.json();
      setPlans(data.plans ?? []);
      setSyncs(data.syncs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (planId: string) => {
    setApproving(planId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/action-center/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Approve failed");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(null);
    }
  };

  // ── Derived lists ─────────────────────────────────────────────────────────

  const needsAction = plans.filter((p) => p.status === "paused" || p.status === "planning");
  const running = plans.filter((p) => p.status === "executing");
  const completed = plans.filter((p) => p.status === "completed");
  const failed = plans.filter((p) => p.status === "failed");

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "needs-action", label: "Needs Action", count: needsAction.length },
    { key: "running", label: "Running", count: running.length },
    { key: "completed", label: "Completed", count: completed.length },
    { key: "failed", label: "Failed", count: failed.length },
    { key: "syncs", label: "Listing Syncs", count: syncs.length },
  ];

  const activePlans =
    tab === "needs-action" ? needsAction :
    tab === "running" ? running :
    tab === "completed" ? completed :
    tab === "failed" ? failed :
    [];

  // ── Summary stats ─────────────────────────────────────────────────────────

  const totalPending = needsAction.length;
  const totalRunning = running.length;
  const totalCompleted = completed.length;
  const totalFailed = failed.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
          <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Action Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review pending approvals, monitor running work, and track outcomes.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending Approval", value: totalPending, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Running", value: totalRunning, icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Completed", value: totalCompleted, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Failed", value: totalFailed, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`w-4 h-4 ${card.color} ${card.label === "Running" ? "animate-spin" : ""}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.key ? "bg-orange-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Loading action center…</span>
        </div>
      ) : tab === "syncs" ? (
        syncs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No listing syncs yet.</div>
        ) : (
          <div className="space-y-2">
            {syncs.map((s) => (
              <SyncRow key={s.id} sync={s} />
            ))}
          </div>
        )
      ) : activePlans.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {tab === "needs-action" && (
            <>
              <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              Nothing needs your attention right now.
            </>
          )}
          {tab === "running" && "No work in progress."}
          {tab === "completed" && "No completed automations yet."}
          {tab === "failed" && "No failures recorded."}
        </div>
      ) : (
        <div className="space-y-2">
          {activePlans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onApprove={handleApprove}
              approving={approving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
