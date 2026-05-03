"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, RefreshCw, Send, Settings, ShieldCheck, Sparkles, Star, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_REPUTATION_SETTINGS,
  DEFAULT_REPUTATION_TEMPLATES,
  type ReputationSettings,
  type ReputationTemplate,
} from "@/lib/reputation/defaults";
import { formatTriggerSource } from "@/lib/reputation/format";
import { ProofShowcase } from "@/components/reputation/proof-showcase";
import type { ReputationAnalyticsSummary } from "@/lib/reputation/types";

interface ApiState {
  setupRequired: boolean;
  activitySetupRequired: boolean;
  settingsSetupRequired: boolean;
  templatesSetupRequired: boolean;
}

interface ReputationTransportDiagnostics {
  mode: string;
  ready: boolean;
  twilioRequested: boolean;
  activeTransport: "simulated" | "twilio";
  missing: string[];
  checks: {
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    hasFromNumber: boolean;
    hasMessagingServiceSid: boolean;
    hasSender: boolean;
    hasBaseUrl: boolean;
  };
}

interface FeedbackItem {
  id: string;
  severity: string | null;
  topic: string | null;
  feedback_text: string;
  follow_up_status: string;
  assigned_owner_name: string | null;
  follow_up_due_date: string | null;
  resolution_notes: string | null;
  recovery_outcome: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface FeedbackDraft {
  assignedOwnerName: string;
  followUpDueDate: string;
  followUpStatus: string;
  recoveryOutcome: string;
  resolutionNotes: string;
}

interface RecentRequest {
  id: string;
  business_id: string;
  trigger_source: string;
  status: string;
  delivery_state?: string | null;
  send_attempt_count?: number | null;
  last_send_attempt_at?: string | null;
  last_send_error?: string | null;
  next_retry_at?: string | null;
  dead_lettered_at?: string | null;
  score: number | null;
  feedback_text: string | null;
  review_token: string | null;
  google_link_sent: boolean;
  template_used: string | null;
  sent_at: string | null;
  replied_at: string | null;
  created_at: string;
  contact?: { name?: string | null; phone?: string | null } | { name?: string | null; phone?: string | null }[] | null;
}

interface ReputationOpsSummary {
  queued: number;
  retryScheduled: number;
  stuckSending: number;
  deadLettered: number;
  overdueRetry: number;
  latestFailure: (Pick<RecentRequest, "id" | "business_id" | "delivery_state" | "send_attempt_count" | "last_send_error" | "next_retry_at" | "dead_lettered_at" | "created_at" | "contact">) | null;
}

interface ProofAsset {
  id: string;
  snippet: string;
  approved: boolean;
  created_at: string;
  topic?: string | null;
  published_to?: string[] | null;
}

interface ReputationMetrics {
  total: number;
  awaitingReply: number;
  publicReady: number;
  unresolvedFeedback: number;
  approvedProofCount: number;
  pendingProofCount: number;
}

const EMPTY_METRICS: ReputationMetrics = {
  total: 0,
  awaitingReply: 0,
  publicReady: 0,
  unresolvedFeedback: 0,
  approvedProofCount: 0,
  pendingProofCount: 0,
};

const TRIGGER_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual send" },
  { value: "appointment_completed", label: "Appointment completed" },
  { value: "job_completed", label: "Job completed" },
  { value: "delivery_completed", label: "Delivery completed" },
  { value: "api", label: "API event" },
];

const FEEDBACK_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "outreach_queued", label: "Outreach queued" },
  { value: "waiting_on_customer", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
];

const FEEDBACK_OUTCOME_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "saved_customer", label: "Saved customer" },
  { value: "refund", label: "Refund" },
  { value: "redo_job", label: "Redo / callback" },
  { value: "coaching", label: "Team coaching" },
  { value: "no_response", label: "No response" },
  { value: "not_recoverable", label: "Not recoverable" },
];

const ACTIVE_FEEDBACK_STATUSES = new Set(["new", "reviewing", "outreach_queued", "waiting_on_customer"]);

function buildFeedbackDraft(item: FeedbackItem): FeedbackDraft {
  return {
    assignedOwnerName: item.assigned_owner_name ?? "",
    followUpDueDate: item.follow_up_due_date ?? "",
    followUpStatus: item.follow_up_status,
    recoveryOutcome: item.recovery_outcome ?? "pending",
    resolutionNotes: item.resolution_notes ?? "",
  };
}

function formatWorkflowLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatTransportMode(mode: string | null | undefined) {
  if (!mode) return "Unknown";
  if (mode === "auto") return "Auto";
  if (mode === "twilio") return "Twilio";
  if (mode === "simulated") return "Simulated";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function ReputationEngine() {
  const [settings, setSettings] = useState<ReputationSettings>(DEFAULT_REPUTATION_SETTINGS);
  const [templates, setTemplates] = useState<ReputationTemplate[]>(DEFAULT_REPUTATION_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [creatingEventRequest, setCreatingEventRequest] = useState(false);
  const [refreshingActivity, setRefreshingActivity] = useState(false);
  const [proofMutationId, setProofMutationId] = useState<string | null>(null);
  const [savingFeedbackId, setSavingFeedbackId] = useState<string | null>(null);
  const [apiState, setApiState] = useState<ApiState>({
    setupRequired: false,
    activitySetupRequired: false,
    settingsSetupRequired: false,
    templatesSetupRequired: false,
  });
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, FeedbackDraft>>({});
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [proofAssets, setProofAssets] = useState<ProofAsset[]>([]);
  const [metrics, setMetrics] = useState<ReputationMetrics>(EMPTY_METRICS);
  const [analytics, setAnalytics] = useState<ReputationAnalyticsSummary | null>(null);
  const [ops, setOps] = useState<ReputationOpsSummary>({ queued: 0, retryScheduled: 0, stuckSending: 0, deadLettered: 0, overdueRetry: 0, latestFailure: null });
  const [transportDiagnostics, setTransportDiagnostics] = useState<ReputationTransportDiagnostics | null>(null);
  const [suggestedBusinessName, setSuggestedBusinessName] = useState("Your Business");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    businessName: "",
    customerName: "",
    phone: "",
    triggerSource: "manual",
  });
  const [demoIntakeForm, setDemoIntakeForm] = useState({
    requestId: "",
    score: "5",
    feedbackText: "",
  });
  const [eventForm, setEventForm] = useState({
    businessName: "",
    customerName: "",
    phone: "",
    eventType: "appointment_completed",
    externalEventId: "",
  });

  function buildApiState(state: {
    activitySetupRequired?: boolean;
    settingsSetupRequired?: boolean;
    templatesSetupRequired?: boolean;
  }): ApiState {
    const activitySetupRequired = Boolean(state.activitySetupRequired);
    const settingsSetupRequired = Boolean(state.settingsSetupRequired);
    const templatesSetupRequired = Boolean(state.templatesSetupRequired);

    return {
      activitySetupRequired,
      settingsSetupRequired,
      templatesSetupRequired,
      setupRequired: activitySetupRequired || settingsSetupRequired || templatesSetupRequired,
    };
  }

  async function loadTransportDiagnostics() {
    try {
      const res = await fetch("/api/diagnostics/keys", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load transport diagnostics");
      setTransportDiagnostics(json.reputationTransport ?? null);
    } catch {
      setTransportDiagnostics(null);
    }
  }

  async function loadReputationActivity() {
    const [feedbackRes, requestsRes] = await Promise.all([
      fetch("/api/reputation/feedback", { cache: "no-store" }),
      fetch("/api/reputation/requests", { cache: "no-store" }),
    ]);

    const feedbackJson = await feedbackRes.json();
    const requestsJson = await requestsRes.json();

    if (!feedbackRes.ok) throw new Error(feedbackJson.error || "Failed to load feedback items");
    if (!requestsRes.ok) throw new Error(requestsJson.error || "Failed to load reputation activity");

    setFeedbackItems(feedbackJson.items ?? []);
    setFeedbackDrafts(
      Object.fromEntries(((feedbackJson.items ?? []) as FeedbackItem[]).map((item) => [item.id, buildFeedbackDraft(item)])),
    );
    setRecentRequests(requestsJson.recentRequests ?? []);
    setProofAssets(requestsJson.proofAssets ?? []);
    setMetrics({
      ...EMPTY_METRICS,
      ...(requestsJson.metrics ?? {}),
    });
    setAnalytics(requestsJson.analytics ?? null);
    setOps(requestsJson.ops ?? { queued: 0, retryScheduled: 0, stuckSending: 0, deadLettered: 0, overdueRetry: 0, latestFailure: null });
    setSuggestedBusinessName(requestsJson.suggestedBusinessName ?? "Your Business");
    setManualForm((current) => ({
      ...current,
      businessName: current.businessName || requestsJson.suggestedBusinessName || "",
    }));
    setEventForm((current) => ({
      ...current,
      businessName: current.businessName || requestsJson.suggestedBusinessName || "",
    }));
    return {
      activitySetupRequired: Boolean(feedbackJson.setupRequired || requestsJson.setupRequired),
    };
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const diagnosticsPromise = loadTransportDiagnostics();
        const [settingsRes, templatesRes, activityState] = await Promise.all([
          fetch("/api/reputation/settings", { cache: "no-store" }),
          fetch("/api/reputation/templates", { cache: "no-store" }),
          loadReputationActivity(),
        ]);

        const settingsJson = await settingsRes.json();
        const templatesJson = await templatesRes.json();

        if (!mounted) return;

        if (!settingsRes.ok) throw new Error(settingsJson.error || "Failed to load reputation settings");
        if (!templatesRes.ok) throw new Error(templatesJson.error || "Failed to load reputation templates");

        setSettings(settingsJson.settings ?? DEFAULT_REPUTATION_SETTINGS);
        setTemplates(templatesJson.templates ?? DEFAULT_REPUTATION_TEMPLATES);
        setApiState(
          buildApiState({
            activitySetupRequired: activityState.activitySetupRequired,
            settingsSetupRequired: settingsJson.setupRequired,
            templatesSetupRequired: templatesJson.setupRequired,
          }),
        );
        await diagnosticsPromise;
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load reputation engine");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const previewSms = useMemo(
    () => settings.smsTemplate.replace("{customer_name}", "Alex").replace("{business_name}", manualForm.businessName || suggestedBusinessName || "Your Business"),
    [manualForm.businessName, settings.smsTemplate, suggestedBusinessName],
  );

  const pendingReplyRequests = useMemo(
    () => recentRequests.filter((request) => request.review_token && !request.replied_at),
    [recentRequests],
  );

  const pendingProofAssets = useMemo(
    () => proofAssets.filter((asset) => !asset.approved),
    [proofAssets],
  );

  const approvedProofAssets = useMemo(
    () => proofAssets.filter((asset) => asset.approved),
    [proofAssets],
  );

  const selectedDemoRequest = useMemo(
    () => pendingReplyRequests.find((request) => request.id === demoIntakeForm.requestId) ?? null,
    [demoIntakeForm.requestId, pendingReplyRequests],
  );

  const liveDeliveryEnabled = transportDiagnostics?.activeTransport === "twilio";
  const transportModeLabel = formatTransportMode(transportDiagnostics?.mode);
  const transportStatusTone = transportDiagnostics
    ? transportDiagnostics.activeTransport === "twilio"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : transportDiagnostics.mode === "simulated"
        ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
        : "border-amber-500/20 bg-amber-500/10 text-amber-100"
    : "border-white/10 bg-[var(--muted)]/20 text-[var(--foreground)]";

  useEffect(() => {
    setDemoIntakeForm((current) => {
      if (!pendingReplyRequests.length) return { ...current, requestId: "" };
      if (pendingReplyRequests.some((request) => request.id === current.requestId)) return current;
      return { ...current, requestId: pendingReplyRequests[0].id };
    });
  }, [pendingReplyRequests]);

  async function refreshActivity(showSuccessMessage = false) {
    setRefreshingActivity(true);
    setError(null);
    try {
      const diagnosticsPromise = loadTransportDiagnostics();
      const [settingsRes, templatesRes, activityState] = await Promise.all([
        fetch("/api/reputation/settings", { cache: "no-store" }),
        fetch("/api/reputation/templates", { cache: "no-store" }),
        loadReputationActivity(),
      ]);

      const settingsJson = await settingsRes.json();
      const templatesJson = await templatesRes.json();

      if (!settingsRes.ok) throw new Error(settingsJson.error || "Failed to load reputation settings");
      if (!templatesRes.ok) throw new Error(templatesJson.error || "Failed to load reputation templates");

      setSettings(settingsJson.settings ?? DEFAULT_REPUTATION_SETTINGS);
      setTemplates(templatesJson.templates ?? DEFAULT_REPUTATION_TEMPLATES);
      setApiState(
        buildApiState({
          activitySetupRequired: activityState.activitySetupRequired,
          settingsSetupRequired: settingsJson.setupRequired,
          templatesSetupRequired: templatesJson.setupRequired,
        }),
      );
      await diagnosticsPromise;
      if (showSuccessMessage) setMessage("Reputation activity refreshed.");
    } catch (err: any) {
      setError(err.message || "Failed to refresh reputation activity");
    } finally {
      setRefreshingActivity(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings");
      setMessage("Reputation settings saved.");
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveTemplates() {
    setSavingTemplates(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save templates");
      setMessage("Review templates saved.");
    } catch (err: any) {
      setError(err.message || "Failed to save templates");
    } finally {
      setSavingTemplates(false);
    }
  }

  async function createManualRequest() {
    setCreatingRequest(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create request");
      setManualForm((current) => ({ ...current, customerName: "", phone: "" }));
      await refreshActivity();
      setMessage("Review request created and sent.");
    } catch (err: any) {
      setError(err.message || "Failed to create request");
    } finally {
      setCreatingRequest(false);
    }
  }

  async function submitDemoIntake() {
    if (!demoIntakeForm.requestId) return;

    setSubmittingIntake(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: demoIntakeForm.requestId,
          score: Number(demoIntakeForm.score),
          feedbackText: demoIntakeForm.feedbackText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit intake");
      await refreshActivity();
      setDemoIntakeForm((current) => ({ ...current, feedbackText: "" }));
      setMessage(`Demo reply captured. Request routed to ${json.status === "public_review_ready" ? "public-review-ready" : "private feedback"}.`);
    } catch (err: any) {
      setError(err.message || "Failed to submit intake");
    } finally {
      setSubmittingIntake(false);
    }
  }

  async function createEventTriggeredRequest() {
    setCreatingEventRequest(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create event-driven request");
      setEventForm((current) => ({ ...current, customerName: "", phone: "", externalEventId: "" }));
      await refreshActivity();
      setMessage(json.deduplicated ? `Event ${json.externalEventId || "request"} already existed — showing the existing request.` : `Event-triggered request queued from ${json.triggerSourceLabel || formatTriggerSource(json.triggerSource)}.`);
    } catch (err: any) {
      setError(err.message || "Failed to create event-driven request");
    } finally {
      setCreatingEventRequest(false);
    }
  }

  async function saveFeedbackRecovery(item: FeedbackItem) {
    const draft = feedbackDrafts[item.id] ?? buildFeedbackDraft(item);

    setSavingFeedbackId(item.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          followUpStatus: draft.followUpStatus,
          assignedOwnerName: draft.assignedOwnerName,
          followUpDueDate: draft.followUpDueDate || null,
          recoveryOutcome: draft.recoveryOutcome,
          resolutionNotes: draft.resolutionNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update feedback item");
      const updatedItem = (json.item ?? item) as FeedbackItem;
      setFeedbackItems((current) => {
        const nextItems = current.map((entry) => (entry.id === item.id ? updatedItem : entry));
        setMetrics((currentMetrics) => ({
          ...currentMetrics,
          unresolvedFeedback: nextItems.filter((entry) => ACTIVE_FEEDBACK_STATUSES.has(entry.follow_up_status)).length,
        }));
        return nextItems;
      });
      setFeedbackDrafts((current) => ({ ...current, [item.id]: buildFeedbackDraft(updatedItem) }));
      setMessage("Feedback recovery plan saved.");
    } catch (err: any) {
      setError(err.message || "Failed to update feedback item");
    } finally {
      setSavingFeedbackId(null);
    }
  }

  async function updateProofApproval(assetId: string, approved: boolean) {
    setProofMutationId(assetId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/reputation/proof-assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, publishedTo: approved ? ["public_profile", "dashboard"] : [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update proof asset");
      await refreshActivity();
      setMessage(approved ? "Proof asset approved and marked for your public profile + dashboard trust surfaces." : "Proof asset moved back to pending approval.");
    } catch (err: any) {
      setError(err.message || "Failed to update proof asset");
    } finally {
      setProofMutationId(null);
    }
  }

  if (loading) {
    return (
      <div className="geo-premium-card rounded-3xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-electric-500" />
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading reputation engine…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Reputation Engine
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Review momentum, private feedback, and trust proof — in one place.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Native request sending is live now: operators can launch requests manually, capture low-score feedback privately, and move positive proof through a lightweight approval workflow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
            <StatCard label="Automation" value={settings.active ? "Active" : "Idle"} tone={settings.active ? "emerald" : "slate"} />
            <StatCard label="Awaiting reply" value={`${metrics.awaitingReply}`} tone="blue" />
            <StatCard label="Public threshold" value={`${settings.positiveThreshold}+★`} tone="amber" />
          </div>
          <Button variant="outline" onClick={() => void refreshActivity(true)} disabled={refreshingActivity}>
            {refreshingActivity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh state
          </Button>
        </div>
      </div>

      {apiState.setupRequired && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-200">Database setup still required</p>
              <p className="mt-1 text-amber-100/90">
                {apiState.activitySetupRequired
                  ? "The core reputation tables are still missing in Supabase, so requests and follow-up activity will not persist until the reputation migration runs."
                  : "Some reputation configuration tables are still missing in Supabase. Defaults are being shown for now, but run the reputation migration to restore full settings and template persistence."}
              </p>
            </div>
          </div>
        </div>
      )}

      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "border border-red-500/20 bg-red-500/10 text-red-200" : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"}`}>
          {error || message}
        </div>
      )}

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line" className="flex w-full flex-wrap gap-2 rounded-2xl bg-transparent p-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="proof">Proof</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
              <CardHeader className="border-b border-white/10 py-5">
                <CardTitle>Review Health snapshot</CardTitle>
                <CardDescription>Native review automation becomes another trust lever, not a separate product detour.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Automation" value={settings.active ? "On" : "Off"} detail={settings.active ? "Requests can be scheduled" : "No requests will be sent"} icon={ShieldCheck} />
                <Metric label="Review route" value={`${settings.positiveThreshold}+ stars`} detail="Lower scores stay private" icon={Star} />
                <Metric label="Awaiting reply" value={`${metrics.awaitingReply}`} detail="Requests already sent" icon={MessageSquare} />
                <Metric label="Proof mode" value={`${metrics.approvedProofCount}/${metrics.approvedProofCount + metrics.pendingProofCount}`} detail="Approved vs total proof assets" icon={Sparkles} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
              <CardHeader className="border-b border-white/10 py-5">
                <CardTitle>What ships in this slice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-5 text-sm text-[var(--muted-foreground)]">
                <ChecklistItem checked>Manual review request creation + immediate send execution</ChecklistItem>
                <ChecklistItem checked>Operator demo intake for recent requests</ChecklistItem>
                <ChecklistItem checked>Low-rating intake with private feedback capture</ChecklistItem>
                <ChecklistItem checked>Positive snippet proof asset creation + approval-ready workflow</ChecklistItem>
                <ChecklistItem checked>Webhook-compatible event ingest with idempotency key support</ChecklistItem>
                <ChecklistItem checked={liveDeliveryEnabled}>{liveDeliveryEnabled ? "Live SMS provider delivery is active" : "Live SMS provider delivery is not ready yet"}</ChecklistItem>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
            <CardHeader className="border-b border-white/10 py-5">
              <CardTitle>Delivery readiness</CardTitle>
              <CardDescription>Operator-facing Twilio status for the reputation send path, without exposing secrets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${transportStatusTone}`}>
                    {liveDeliveryEnabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {liveDeliveryEnabled ? "Live Twilio ready" : transportDiagnostics?.mode === "simulated" ? "Simulation mode" : "Twilio needs setup"}
                  </div>
                  <p className="text-sm text-[var(--foreground)]">
                    {liveDeliveryEnabled
                      ? "Reputation sends are using the live Twilio transport, so delivery callbacks and inbound reply handling can run end-to-end."
                      : transportDiagnostics?.mode === "simulated"
                        ? "The engine is intentionally running in simulated mode. Manual sends still work for demos, but no live SMS leaves Twilio from this path."
                        : "The engine is falling back to the simulated transport until the missing Twilio pieces are configured."}
                  </p>
                </div>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:border-electric-500/40 hover:text-electric-400"
                >
                  <Settings className="h-4 w-4" />
                  Open settings
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Configured mode</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{transportModeLabel}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Active send path</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{liveDeliveryEnabled ? "Twilio" : "Simulated"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Readiness</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{liveDeliveryEnabled || transportDiagnostics?.mode === "simulated" ? "Ready" : "Blocked"}</div>
                </div>
              </div>

              {transportDiagnostics && transportDiagnostics.mode !== "simulated" && !liveDeliveryEnabled && transportDiagnostics.missing.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  <div className="font-medium text-amber-200">Missing for live Twilio</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {transportDiagnostics.missing.map((item) => (
                      <span key={item} className="rounded-full border border-amber-500/20 px-2.5 py-1 text-xs text-amber-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {analytics && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle>Pipeline analytics</CardTitle>
                  <CardDescription>Reply, sentiment, proof, and trigger-source momentum from the reputation request stream.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Requests sent" value={`${analytics.requestsSent}`} detail={`${analytics.repliedCount} replied`} icon={Send} />
                    <Metric label="Reply rate" value={formatPercent(analytics.replyRate)} detail="Replies ÷ sent" icon={MessageSquare} />
                    <Metric label="Positive rate" value={formatPercent(analytics.positiveRate)} detail={`${analytics.positiveCount} public-ready wins`} icon={Star} />
                    <Metric label="Proof generation" value={formatPercent(analytics.proofGenerationRate)} detail={`${analytics.proofGeneratedCount} snippets created`} icon={Sparkles} />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      <span>Trigger-source performance</span>
                      <span>Compile-safe from reputation tables</span>
                    </div>
                    {analytics.sourcePerformance.length === 0 ? (
                      <div className="mt-3 text-sm text-[var(--muted-foreground)]">No sent requests yet, so there’s no source-performance data to summarize.</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {analytics.sourcePerformance.slice(0, 4).map((source) => (
                          <div key={source.triggerSource} className="grid grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))] gap-3 rounded-2xl border border-white/10 bg-background/30 px-4 py-3 text-sm">
                            <div>
                              <div className="font-medium text-[var(--foreground)]">{formatTriggerSource(source.triggerSource)}</div>
                              <div className="text-xs text-[var(--muted-foreground)]">{source.requestsSent} sent · {source.repliedCount} replied</div>
                            </div>
                            <MiniStat label="Reply" value={formatPercent(source.replyRate)} />
                            <MiniStat label="Positive" value={formatPercent(source.positiveRate)} />
                            <MiniStat label="Proof" value={`${source.proofCount}`} />
                            <MiniStat label="Recovery" value={`${source.feedbackCount}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle>Recovery ops snapshot</CardTitle>
                  <CardDescription>Private-feedback counts show how much recovery work is active versus closed.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
                  <Metric label="Open recoveries" value={`${analytics.recovery.unresolved}`} detail="Feedback items not marked resolved" icon={AlertTriangle} />
                  <Metric label="Resolved" value={`${analytics.recovery.resolved}`} detail="Recovered or closed-loop threads" icon={CheckCircle2} />
                  <Metric label="Reviewing" value={`${analytics.recovery.reviewing}`} detail="Actively being worked by ops" icon={RefreshCw} />
                  <Metric label="High severity" value={`${analytics.recovery.highSeverity}`} detail="1–2 star feedback items" icon={AlertTriangle} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-electric-500" /> Manual send</CardTitle>
                  <CardDescription>Create a review request now. It persists to the reputation tables, generates a token, and runs the active delivery path immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <Field label="Business name">
                    <Input value={manualForm.businessName} onChange={(event) => setManualForm((current) => ({ ...current, businessName: event.target.value }))} placeholder={suggestedBusinessName} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer name">
                      <Input value={manualForm.customerName} onChange={(event) => setManualForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Alex Johnson" />
                    </Field>
                    <Field label="Phone">
                      <Input value={manualForm.phone} onChange={(event) => setManualForm((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 123-4567" />
                    </Field>
                  </div>
                  <Field label="Trigger source">
                    <select
                      value={manualForm.triggerSource}
                      onChange={(event) => setManualForm((current) => ({ ...current, triggerSource: event.target.value }))}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                    >
                      {TRIGGER_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-[var(--foreground)]">{previewSms}</div>
                  <div className="flex justify-end">
                    <Button onClick={createManualRequest} disabled={creatingRequest}>
                      {creatingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Create and send
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle className="flex items-center gap-2"><Workflow className="h-4 w-4 text-electric-500" /> Event trigger test</CardTitle>
                  <CardDescription>Post a completed appointment, job, or delivery event into the same request pipeline. Re-send the same external event ID and the route will return the original request instead of creating a duplicate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Business name">
                      <Input value={eventForm.businessName} onChange={(event) => setEventForm((current) => ({ ...current, businessName: event.target.value }))} placeholder={suggestedBusinessName} />
                    </Field>
                    <Field label="Event type">
                      <select
                        value={eventForm.eventType}
                        onChange={(event) => setEventForm((current) => ({ ...current, eventType: event.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                      >
                        {TRIGGER_SOURCE_OPTIONS.filter((option) => option.value !== "manual").map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer name">
                      <Input value={eventForm.customerName} onChange={(event) => setEventForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Jamie Customer" />
                    </Field>
                    <Field label="Phone">
                      <Input value={eventForm.phone} onChange={(event) => setEventForm((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 555-0112" />
                    </Field>
                  </div>
                  <Field label="External event ID" hint="Use the same value again to prove idempotent replay safety.">
                    <Input value={eventForm.externalEventId} onChange={(event) => setEventForm((current) => ({ ...current, externalEventId: event.target.value }))} placeholder="appt_10492" />
                  </Field>
                  <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-xs leading-6 text-[var(--muted-foreground)]">
                    POST /api/reputation/events → {`{ businessName, customerName, phone, eventType, externalEventId }`}<br />
                    POST /api/reputation/webhook + x-geothority-webhook-secret → {`{ userId, businessName, customerName, phone, eventType, externalEventId }`}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={createEventTriggeredRequest} disabled={creatingEventRequest}>
                      {creatingEventRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Workflow className="mr-2 h-4 w-4" />}
                      Post event trigger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle>Delivery ops</CardTitle>
                  <CardDescription>Spot retries, dead letters, and stale sends before they hide in the queue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatCard label="Queued" value={`${ops.queued}`} tone={ops.queued > 0 ? "blue" : "slate"} />
                    <StatCard label="Retry scheduled" value={`${ops.retryScheduled}`} tone={ops.retryScheduled > 0 ? "amber" : "slate"} />
                    <StatCard label="Stuck sending" value={`${ops.stuckSending}`} tone={ops.stuckSending > 0 ? "amber" : "emerald"} />
                    <StatCard label="Dead-lettered" value={`${ops.deadLettered}`} tone={ops.deadLettered > 0 ? "amber" : "emerald"} />
                  </div>
                  <div className={`rounded-2xl border p-4 text-sm ${ops.stuckSending > 0 || ops.overdueRetry > 0 || ops.deadLettered > 0 ? "border-amber-500/20 bg-amber-500/10 text-amber-100" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"}`}>
                    {ops.stuckSending > 0 || ops.overdueRetry > 0 || ops.deadLettered > 0
                      ? `${ops.stuckSending} stuck send${ops.stuckSending === 1 ? "" : "s"}, ${ops.overdueRetry} overdue retr${ops.overdueRetry === 1 ? "y" : "ies"}, ${ops.deadLettered} dead-lettered.`
                      : "Queue looks healthy — no stuck sends, overdue retries, or dead letters right now."}
                  </div>
                  {ops.latestFailure ? (() => {
                    const contact = Array.isArray(ops.latestFailure.contact) ? ops.latestFailure.contact[0] : ops.latestFailure.contact;
                    return (
                      <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Latest delivery risk</div>
                            <div className="mt-1 font-medium text-[var(--foreground)]">{contact?.name || "Customer"} · {ops.latestFailure.business_id}</div>
                          </div>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{formatWorkflowLabel(ops.latestFailure.delivery_state)}</span>
                        </div>
                        {ops.latestFailure.last_send_error ? <p className="mt-3 text-[var(--foreground)]">{ops.latestFailure.last_send_error}</p> : null}
                        <div className="mt-3 text-xs text-[var(--muted-foreground)]">
                          Attempt {ops.latestFailure.send_attempt_count ?? 0}
                          {ops.latestFailure.next_retry_at ? ` · Retries ${new Date(ops.latestFailure.next_retry_at).toLocaleString()}` : ""}
                          {ops.latestFailure.dead_lettered_at ? ` · Dead-lettered ${new Date(ops.latestFailure.dead_lettered_at).toLocaleString()}` : ""}
                        </div>
                      </div>
                    );
                  })() : null}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle>Recent request activity</CardTitle>
                  <CardDescription>Latest sends, replies, and public-review-ready requests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 py-5">
                  {recentRequests.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">No requests yet. Create the first one from the manual send form.</div>
                  ) : (
                    recentRequests.map((request) => {
                      const contact = Array.isArray(request.contact) ? request.contact[0] : request.contact;
                      return (
                        <div key={request.id} className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                                <span>{contact?.name || "Customer"}</span>
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{formatTriggerSource(request.trigger_source)}</span>
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{request.status.replace(/_/g, " ")}</span>
                                {request.delivery_state ? <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{formatWorkflowLabel(request.delivery_state)}</span> : null}
                              </div>
                              <p className="mt-2 text-sm text-[var(--foreground)]">{request.business_id} · {contact?.phone || "No phone"}</p>
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Created {new Date(request.created_at).toLocaleString()}</p>
                              {request.last_send_error ? <p className="mt-2 text-xs text-amber-200">Send issue: {request.last_send_error}</p> : null}
                              {request.next_retry_at ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">Retry due {new Date(request.next_retry_at).toLocaleString()}</p> : null}
                              {request.dead_lettered_at ? <p className="mt-1 text-xs text-amber-200">Dead-lettered {new Date(request.dead_lettered_at).toLocaleString()}</p> : null}
                              {request.feedback_text ? <p className="mt-2 text-xs text-[var(--muted-foreground)]">Latest reply: “{request.feedback_text}”</p> : null}
                            </div>
                            <div className="text-right text-xs text-[var(--muted-foreground)]">
                              <div>{request.score ? `${request.score}/5 reply` : request.sent_at ? "Sent" : "Pending"}</div>
                              <div className="mt-1">Attempt {request.send_attempt_count ?? 0}</div>
                              {request.review_token ? <div className="mt-1">token ready</div> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle>Test intake reply</CardTitle>
                  <CardDescription>Choose a recent request, simulate the customer score + feedback, submit it into the intake route, and immediately refresh the inbox/proof state.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <Field label="Recent request">
                    <select
                      value={demoIntakeForm.requestId}
                      onChange={(event) => setDemoIntakeForm((current) => ({ ...current, requestId: event.target.value }))}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                      disabled={pendingReplyRequests.length === 0}
                    >
                      {pendingReplyRequests.length === 0 ? (
                        <option value="">No open requests available</option>
                      ) : (
                        pendingReplyRequests.map((request) => {
                          const contact = Array.isArray(request.contact) ? request.contact[0] : request.contact;
                          return (
                            <option key={request.id} value={request.id}>
                              {(contact?.name || "Customer")} · {formatTriggerSource(request.trigger_source)}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </Field>
                  {selectedDemoRequest ? (
                    <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">
                      Routing <span className="text-[var(--foreground)]">{(Array.isArray(selectedDemoRequest.contact) ? selectedDemoRequest.contact[0] : selectedDemoRequest.contact)?.name || "Customer"}</span> through the intake route for <span className="text-[var(--foreground)]">{selectedDemoRequest.business_id}</span>. Scores below {settings.positiveThreshold} stay private; higher scores can move into approval-ready proof.
                    </div>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <Field label="Score">
                      <select
                        value={demoIntakeForm.score}
                        onChange={(event) => setDemoIntakeForm((current) => ({ ...current, score: event.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                      >
                        {["5", "4", "3", "2", "1"].map((scoreOption) => (
                          <option key={scoreOption} value={scoreOption}>{scoreOption} / 5</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Optional feedback">
                      <Textarea value={demoIntakeForm.feedbackText} onChange={(event) => setDemoIntakeForm((current) => ({ ...current, feedbackText: event.target.value }))} className="min-h-24" placeholder="Fast, friendly, and easy to work with." />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={submitDemoIntake} disabled={submittingIntake || pendingReplyRequests.length === 0 || !demoIntakeForm.requestId}>
                      {submittingIntake ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                      Submit reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template, index) => (
              <Card key={template.id} className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{template.icon}</span>
                    {template.categoryLabel}
                  </CardTitle>
                  <CardDescription>{template.category} template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 py-5">
                  <Textarea
                    value={template.templateText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTemplates((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, templateText: value } : item)));
                    }}
                    className="min-h-32"
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">Use {"{BUSINESS}"} as the merge field for the business name.</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={saveTemplates} disabled={savingTemplates}>
              {savingTemplates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save templates
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
            <CardHeader className="border-b border-white/10 py-5">
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-electric-500" /> Private Feedback Inbox</CardTitle>
              <CardDescription>Low-score replies stay actionable here before they become public trust damage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 py-5">
              {feedbackItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">No private feedback items yet. Once low-score requests come in, they’ll appear here for follow-up.</div>
              ) : (
                feedbackItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                    {(() => {
                      const draft = feedbackDrafts[item.id] ?? buildFeedbackDraft(item);
                      const hasChanges =
                        draft.assignedOwnerName !== (item.assigned_owner_name ?? "") ||
                        draft.followUpDueDate !== (item.follow_up_due_date ?? "") ||
                        draft.followUpStatus !== item.follow_up_status ||
                        draft.recoveryOutcome !== (item.recovery_outcome ?? "pending") ||
                        draft.resolutionNotes !== (item.resolution_notes ?? "");

                      return (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          <span>{item.topic || "Private feedback"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{item.severity || "medium"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{formatWorkflowLabel(item.follow_up_status)}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{formatWorkflowLabel(item.recovery_outcome || "pending")}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.feedback_text}</p>
                        <div className="mt-3 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2">Owner: <span className="text-[var(--foreground)]">{item.assigned_owner_name || "Unassigned"}</span></div>
                          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2">Due: <span className="text-[var(--foreground)]">{item.follow_up_due_date || "Not set"}</span></div>
                          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2">Created: <span className="text-[var(--foreground)]">{new Date(item.created_at).toLocaleDateString()}</span></div>
                          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2">Resolved: <span className="text-[var(--foreground)]">{item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : "Open"}</span></div>
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <Field label="Owner">
                            <Input
                              value={draft.assignedOwnerName}
                              onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, assignedOwnerName: event.target.value } }))}
                              placeholder="Taylor"
                            />
                          </Field>
                          <Field label="Follow-up due date">
                            <Input
                              type="date"
                              value={draft.followUpDueDate}
                              onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, followUpDueDate: event.target.value } }))}
                            />
                          </Field>
                          <Field label="Status">
                            <select
                              value={draft.followUpStatus}
                              onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, followUpStatus: event.target.value } }))}
                              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                            >
                              {FEEDBACK_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Recovery outcome">
                            <select
                              value={draft.recoveryOutcome}
                              onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, recoveryOutcome: event.target.value } }))}
                              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
                            >
                              {FEEDBACK_OUTCOME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className="mt-4">
                          <Field label="Resolution notes" hint="Capture the follow-up plan, fix promised, or save-the-account outcome.">
                            <Textarea
                              value={draft.resolutionNotes}
                              onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, resolutionNotes: event.target.value } }))}
                              className="min-h-24"
                              placeholder="Called same day, scheduled a redo visit for Tuesday, and offered a service credit."
                            />
                          </Field>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:min-w-[170px]">
                        <Button variant="outline" size="sm" onClick={() => setFeedbackDrafts((current) => ({ ...current, [item.id]: { ...draft, followUpStatus: "waiting_on_customer" } }))}>Waiting on customer</Button>
                        <Button size="sm" disabled={!hasChanges || savingFeedbackId === item.id} onClick={() => saveFeedbackRecovery(item)}>
                          {savingFeedbackId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save recovery plan
                        </Button>
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proof" className="space-y-4">
          <ProofShowcase
            summary={{
              totalRequests: metrics.total,
              publicReady: metrics.publicReady,
              awaitingReply: metrics.awaitingReply,
              averageScore: recentRequests.filter((item) => typeof item.score === "number").length
                ? Number((recentRequests.filter((item) => typeof item.score === "number").reduce((sum, item) => sum + Number(item.score || 0), 0) / recentRequests.filter((item) => typeof item.score === "number").length).toFixed(1))
                : null,
              approvedProofCount: metrics.approvedProofCount,
              pendingProofCount: metrics.pendingProofCount,
              proofAssets,
              analytics: analytics ?? {
                requestsSent: 0,
                repliedCount: 0,
                positiveCount: 0,
                proofGeneratedCount: 0,
                replyRate: 0,
                positiveRate: 0,
                proofGenerationRate: 0,
                recovery: {
                  totalFeedback: 0,
                  unresolved: 0,
                  reviewing: 0,
                  resolved: 0,
                  highSeverity: 0,
                },
                sourcePerformance: [],
              },
            }}
            title="Trust Proof Pipeline"
            description="Positive replies now create proof candidates you can approve before they surface across your public profile and dashboard trust surfaces."
          />

          <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
            <CardHeader className="border-b border-white/10 py-5">
              <CardTitle className="flex items-center gap-2"><Workflow className="h-4 w-4 text-electric-500" /> Approval workflow</CardTitle>
              <CardDescription>Keep publishable proof clean: review pending snippets, then promote approved ones into the live trust stack.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-5">
              <div className="grid gap-3 lg:grid-cols-3">
                {[
                  { label: "Capture", detail: "Positive written replies create proof candidates automatically." },
                  { label: "Review", detail: "Pending snippets stay separate until the wording feels client-safe." },
                  { label: "Publish", detail: "Approved snippets now feed the public profile and dashboard surfaces." },
                ].map((step) => (
                  <div key={step.label} className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-electric-300">{step.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{step.detail}</p>
                  </div>
                ))}
              </div>

              {proofAssets.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">No proof assets yet. Capture a positive written reply from the intake flow to populate this queue.</div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-[var(--muted)]/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">Awaiting approval</div>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Keep this queue tight. Promote only the snippets you would feel good publishing.</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{pendingProofAssets.length}</span>
                    </div>
                    {pendingProofAssets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-sm text-[var(--muted-foreground)]">Nothing waiting right now. New positive replies will land here first.</div>
                    ) : pendingProofAssets.map((asset) => (
                      <div key={asset.id} className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                              <span>{asset.topic || "Proof snippet"}</span>
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">Pending approval</span>
                            </div>
                            <p className="text-sm leading-6 text-[var(--foreground)]">“{asset.snippet}”</p>
                            <p className="text-xs text-[var(--muted-foreground)]">Created {new Date(asset.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={proofMutationId === asset.id}
                              onClick={() => updateProofApproval(asset.id, true)}
                            >
                              {proofMutationId === asset.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                              Approve for trust surfaces
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">Approved + live-ready</div>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">These assets are ready to reinforce trust anywhere Geothority shows proof.</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{approvedProofAssets.length}</span>
                    </div>
                    {approvedProofAssets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-sm text-[var(--muted-foreground)]">Approve your first proof snippet to start populating the live trust surfaces.</div>
                    ) : approvedProofAssets.map((asset) => (
                      <div key={asset.id} className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                              <span>{asset.topic || "Proof snippet"}</span>
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">Approved</span>
                              <span className="rounded-full border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">{asset.published_to?.length ? asset.published_to.map(formatTriggerSource).join(", ") : "Ready to publish"}</span>
                            </div>
                            <p className="text-sm leading-6 text-[var(--foreground)]">“{asset.snippet}”</p>
                            <p className="text-xs text-[var(--muted-foreground)]">Created {new Date(asset.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={proofMutationId === asset.id}
                              onClick={() => updateProofApproval(asset.id, false)}
                            >
                              {proofMutationId === asset.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Move to pending
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
            <CardHeader className="border-b border-white/10 py-5">
              <CardTitle>Review automation settings</CardTitle>
              <CardDescription>Geothority-native controls backed by the new reputation tables.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 py-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="Google review link" hint="Used for the public one-tap review destination.">
                  <Input value={settings.googleReviewLink} onChange={(event) => setSettings((current) => ({ ...current, googleReviewLink: event.target.value }))} placeholder="https://g.page/r/your-place-id/review" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Delay (minutes)">
                    <Input type="number" min={5} value={settings.smsDelayMinutes} onChange={(event) => setSettings((current) => ({ ...current, smsDelayMinutes: Number(event.target.value || 60) }))} />
                  </Field>
                  <Field label="Positive threshold">
                    <Input type="number" min={1} max={5} value={settings.positiveThreshold} onChange={(event) => setSettings((current) => ({ ...current, positiveThreshold: Number(event.target.value || 4) }))} />
                  </Field>
                </div>
                <Field label="SMS template" hint="Merge fields: {customer_name}, {business_name}">
                  <Textarea value={settings.smsTemplate} onChange={(event) => setSettings((current) => ({ ...current, smsTemplate: event.target.value }))} className="min-h-32" />
                </Field>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--muted)]/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Activate review automation</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Manual sends work now. Leave this off until your event-source automations are ready.</p>
                  </div>
                  <Switch checked={settings.active} onCheckedChange={(checked) => setSettings((current) => ({ ...current, active: checked }))} />
                </div>
              </div>

              <div className="space-y-4">
                <Card className="rounded-2xl border-white/10 bg-[var(--muted)]/20 py-0">
                  <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-sm">Preview flow</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 py-4 text-sm">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[var(--foreground)]">{previewSms}</div>
                    <div className="rounded-xl border border-white/10 bg-background/40 p-3 text-[var(--muted-foreground)]">
                      Scores {settings.positiveThreshold}-5 → public review page + proof approval queue<br />
                      Scores 1-{Math.max(1, settings.positiveThreshold - 1)} → private feedback inbox
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-white/10 bg-[var(--muted)]/20 py-0">
                  <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-sm">Current engine state</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 py-4 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Send job route is wired and executes the current delivery path</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Low-score replies create private feedback items</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Positive written replies create proof snippets</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Approved proof assets can surface on the public profile and dashboard</div>
                    <div className="flex items-center gap-2">
                      {liveDeliveryEnabled ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                      {liveDeliveryEnabled
                        ? "Live Twilio delivery is active for the reputation send path"
                        : transportDiagnostics?.mode === "simulated"
                          ? "Delivery is intentionally simulated in this environment"
                          : "Twilio is not fully configured, so delivery is falling back to simulation"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</div>
        {hint ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</div> : null}
      </div>
      {children}
    </label>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]"><Icon className="h-3.5 w-3.5 text-electric-500" /> {label}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--muted-foreground)]">{detail}</div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value}%`;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-right">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</div>
      <div className="font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "blue" | "amber" | "slate" }) {
  const toneMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    slate: "border-white/10 bg-[var(--muted)]/20 text-[var(--foreground)]",
  } as const;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-[-0.03em]">{value}</div>
    </div>
  );
}

function ChecklistItem({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={`h-4 w-4 ${checked ? "text-emerald-400" : "text-[var(--muted-foreground)] opacity-40"}`} />
      <span>{children}</span>
    </div>
  );
}
