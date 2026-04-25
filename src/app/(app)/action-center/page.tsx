"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/empty-state";
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
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Orbit,
} from "lucide-react";

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
  verification?: {
    status: "pending" | "running" | "completed" | "failed";
    scoreBefore?: number;
    scoreAfter?: number;
    passedCount?: number;
    failedCount?: number;
    completedAt?: string;
  } | null;
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.planning;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "executing" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const cls = MODE_BADGE[mode] ?? MODE_BADGE.GUIDED;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${cls}`}>
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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
    <div className="geo-premium-card rounded-3xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--foreground)]">
              Plan {plan.id.slice(0, 12)}…
            </span>
            <ModeBadge mode={plan.mode} />
            <StatusBadge status={plan.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span>{plan.completed}/{plan.total} steps complete</span>
            {plan.failed > 0 && <span className="font-medium text-red-400">{plan.failed} failed</span>}
            {plan.needs_input > 0 && <span className="font-medium text-orange-400">{plan.needs_input} awaiting approval</span>}
            <span>· updated {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="hidden w-28 shrink-0 sm:block">
          <ProgressBar value={plan.progress} />
          <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">{plan.progress}%</div>
        </div>
        {isApprovable && (
          <button
            type="button"
            disabled={approving === plan.id}
            onClick={(event) => {
              event.stopPropagation();
              onApprove(plan.id);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {approving === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Approve
          </button>
        )}
        {isRunning && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />}
      </div>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-1 sm:px-5">
          <div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <div className="geo-premium-muted rounded-2xl p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Scan</div>
              <Link href={`/scan/${plan.scan_id}`} className="inline-flex items-center gap-1 text-sm text-electric-500 transition-colors hover:text-electric-400">
                {plan.scan_id.slice(0, 12)}…
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="geo-premium-muted rounded-2xl p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Created</div>
              <div>{formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}</div>
            </div>
            <div className="geo-premium-muted rounded-2xl p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Last updated</div>
              <div>{formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}</div>
            </div>
            <div className="geo-premium-muted rounded-2xl p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Execution mode</div>
              <div>{plan.mode}</div>
            </div>
          </div>
          <div className="mt-4 sm:hidden">
            <ProgressBar value={plan.progress} />
            <div className="mt-1 text-right text-xs text-[var(--muted-foreground)]">{plan.progress}% complete</div>
          </div>
          {plan.verification && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${
                plan.verification.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : plan.verification.status === "failed"
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-200"
              }`}
            >
              <div className="flex flex-wrap gap-3">
                <span>
                  Verification <span className="font-semibold uppercase">{plan.verification.status}</span>
                </span>
                {typeof plan.verification.scoreBefore === "number" && typeof plan.verification.scoreAfter === "number" && (
                  <span>
                    Score {plan.verification.scoreBefore} → {plan.verification.scoreAfter}
                  </span>
                )}
                {typeof plan.verification.passedCount === "number" && <span>{plan.verification.passedCount} checks passed</span>}
                {typeof plan.verification.failedCount === "number" && <span>{plan.verification.failedCount} checks failed</span>}
              </div>
              {plan.verification.completedAt && (
                <div className="mt-1 opacity-80">
                  Completed {formatDistanceToNow(new Date(plan.verification.completedAt), { addSuffix: true })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SyncRow({ sync }: { sync: SyncSummary }) {
  const cfg = SYNC_STATUS_CFG[sync.sync_status] ?? SYNC_STATUS_CFG.pending;
  const Icon = cfg.color.includes("emerald") ? CheckCircle2 : cfg.color.includes("red") ? XCircle : Clock;
  const location = [sync.city, sync.state].filter(Boolean).join(", ") || "Awaiting territory";

  return (
    <div className="geo-premium-card rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--foreground)]">{sync.business_name}</div>
          <div className="text-xs text-[var(--muted-foreground)]">{location}</div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{sync.directories_reached} directories reached</div>
        </div>
      </div>
    </div>
  );
}

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPlans([]);
        setSyncs([]);
        return;
      }

      const response = await fetch("/api/action-center/plans", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch action center data");
      const data = await response.json();
      setPlans(data.plans ?? []);
      setSyncs(data.syncs ?? []);
      setError(null);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/action-center/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Approve failed");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(null);
    }
  };

  const needsAction = plans.filter((plan) => plan.status === "paused" || plan.status === "planning");
  const running = plans.filter((plan) => plan.status === "executing");
  const completed = plans.filter((plan) => plan.status === "completed");
  const failed = plans.filter((plan) => plan.status === "failed");

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "needs-action", label: "Needs Action", count: needsAction.length },
    { key: "running", label: "Running", count: running.length },
    { key: "completed", label: "Completed", count: completed.length },
    { key: "failed", label: "Failed", count: failed.length },
    { key: "syncs", label: "Listing Syncs", count: syncs.length },
  ];

  const activePlans =
    tab === "needs-action"
      ? needsAction
      : tab === "running"
        ? running
        : tab === "completed"
          ? completed
          : tab === "failed"
            ? failed
            : [];

  const latestHeartbeat = [...plans].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];

  return (
    <div className="space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-400">
              <Orbit className="h-3.5 w-3.5" />
              Automation command deck
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Action Center</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Review automation approvals, watch execution progress, and confirm trust-impact before changes go live.
              {latestHeartbeat ? ` Latest movement landed ${formatDistanceToNow(new Date(latestHeartbeat.updated_at), { addSuffix: true })}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Awaiting review", value: `${needsAction.length} plans`, icon: AlertTriangle },
              { label: "Live runs", value: `${running.length} executing`, icon: Loader2 },
              { label: "Listing coverage", value: `${syncs.length} sync records`, icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[180px] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <item.icon className={`h-3.5 w-3.5 text-electric-500 ${item.label === "Live runs" ? "animate-spin" : ""}`} />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-2.5 text-sm font-medium transition-colors hover:border-electric-500/40 hover:text-electric-400"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pending approval", value: needsAction.length, icon: AlertTriangle, color: "text-orange-400" },
          { label: "Running", value: running.length, icon: Loader2, color: "text-blue-400" },
          { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed", value: failed.length, icon: XCircle, color: "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="geo-premium-card rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              <card.icon className={`h-4 w-4 ${card.color} ${card.label === "Running" ? "animate-spin" : ""}`} />
              {card.label}
            </div>
            <div className={`text-3xl font-semibold ${card.color}`}>{card.value}</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {card.label === "Pending approval"
                ? "Human-in-the-loop checkpoints ready for review."
                : card.label === "Running"
                  ? "Active tasks currently moving through your queue."
                  : card.label === "Completed"
                    ? "Finished plans with verification-ready outputs."
                    : "Automations that need another look before redeploy."}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-red-100">Action center unavailable</p>
              <p className="mt-1 text-red-200/90">{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-200/70 transition-colors hover:text-red-100">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="geo-premium-card rounded-3xl p-2">
        <div className="flex gap-1 overflow-x-auto px-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                tab === item.key
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-white/[0.04] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  tab === item.key ? "bg-slate-950/10 text-slate-950" : "bg-white/10 text-[var(--foreground)]"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="geo-premium-card rounded-3xl px-6 py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-electric-500" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading action center telemetry…</p>
        </div>
      ) : tab === "syncs" ? (
        syncs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            eyebrow="Listings still quiet"
            title="No listing syncs yet"
            description="When directory syncs start running, you’ll see verification status, coverage, and last-mile confidence here."
            actionLabel="Open citations"
            actionHref="/citations"
            meta={["50+ directory network", "Verification-aware sync status"]}
          />
        ) : (
          <div className="space-y-3">
            {syncs.map((sync) => (
              <SyncRow key={sync.id} sync={sync} />
            ))}
          </div>
        )
      ) : activePlans.length === 0 ? (
        <EmptyState
          icon={tab === "running" ? Activity : tab === "completed" ? CheckCircle2 : tab === "failed" ? XCircle : Zap}
          eyebrow={tab === "needs-action" ? "Queue is clear" : tab === "running" ? "Nothing in flight" : tab === "completed" ? "Awaiting first finish" : "No incidents detected"}
          title={
            tab === "needs-action"
              ? "Nothing needs your attention right now"
              : tab === "running"
                ? "No active automations"
                : tab === "completed"
                  ? "No completed automations yet"
                  : "No failures recorded"
          }
          description={
            tab === "needs-action"
              ? "Approvals, paused plans, and operator checkpoints will surface here the moment they need human review."
              : tab === "running"
                ? "Once a plan starts executing, live progress and verification state will appear here automatically."
                : tab === "completed"
                  ? "Finished plans will collect here so you can audit score lift and trust verification in one stream."
                  : "If a workflow stalls or verification fails, this becomes your incident lane."
          }
          actionLabel="Launch a new scan"
          actionHref="/scan"
          meta={["15-second auto refresh", "Verification-aware status tracking"]}
        />
      ) : (
        <div className="space-y-3">
          {activePlans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onApprove={handleApprove} approving={approving} />
          ))}
        </div>
      )}
    </div>
  );
}
