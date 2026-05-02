"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, Send, ShieldCheck, Sparkles, Star, TrendingUp, Workflow } from "lucide-react";
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
import { formatTriggerSource, ProofShowcase } from "@/components/reputation/proof-showcase";

interface ApiState {
  setupRequired: boolean;
}

interface FeedbackItem {
  id: string;
  severity: string | null;
  topic: string | null;
  feedback_text: string;
  follow_up_status: string;
  created_at: string;
}

interface RecentRequest {
  id: string;
  business_id: string;
  trigger_source: string;
  status: string;
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

interface ProofAsset {
  id: string;
  snippet: string;
  approved: boolean;
  created_at: string;
}

interface ReputationMetrics {
  total: number;
  awaitingReply: number;
  publicReady: number;
  unresolvedFeedback: number;
}

const EMPTY_METRICS: ReputationMetrics = {
  total: 0,
  awaitingReply: 0,
  publicReady: 0,
  unresolvedFeedback: 0,
};

const TRIGGER_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual send" },
  { value: "appointment_completed", label: "Appointment completed" },
  { value: "job_completed", label: "Job completed" },
  { value: "delivery_completed", label: "Delivery completed" },
  { value: "api", label: "API event" },
];

export function ReputationEngine() {
  const [settings, setSettings] = useState<ReputationSettings>(DEFAULT_REPUTATION_SETTINGS);
  const [templates, setTemplates] = useState<ReputationTemplate[]>(DEFAULT_REPUTATION_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [creatingEventRequest, setCreatingEventRequest] = useState(false);
  const [apiState, setApiState] = useState<ApiState>({ setupRequired: false });
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [proofAssets, setProofAssets] = useState<ProofAsset[]>([]);
  const [metrics, setMetrics] = useState<ReputationMetrics>(EMPTY_METRICS);
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
  });

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
    setRecentRequests(requestsJson.recentRequests ?? []);
    setProofAssets(requestsJson.proofAssets ?? []);
    setMetrics(requestsJson.metrics ?? EMPTY_METRICS);
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
      setupRequired: Boolean(feedbackJson.setupRequired || requestsJson.setupRequired),
    };
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
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
        setApiState({ setupRequired: Boolean(settingsJson.setupRequired || templatesJson.setupRequired || activityState.setupRequired) });
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

  useEffect(() => {
    setDemoIntakeForm((current) => {
      if (!pendingReplyRequests.length) return { ...current, requestId: "" };
      if (pendingReplyRequests.some((request) => request.id === current.requestId)) return current;
      return { ...current, requestId: pendingReplyRequests[0].id };
    });
  }, [pendingReplyRequests]);

  async function refreshActivity() {
    const activityState = await loadReputationActivity();
    setApiState((current) => ({ ...current, setupRequired: current.setupRequired || activityState.setupRequired }));
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
      setEventForm((current) => ({ ...current, customerName: "", phone: "" }));
      await refreshActivity();
      setMessage(`Event-triggered request queued from ${formatTriggerSource(json.triggerSource)}.`);
    } catch (err: any) {
      setError(err.message || "Failed to create event-driven request");
    } finally {
      setCreatingEventRequest(false);
    }
  }

  async function updateFeedbackStatus(id: string, followUpStatus: string) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reputation/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, followUpStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update feedback item");
      setFeedbackItems((current) => current.map((item) => (item.id === id ? { ...item, follow_up_status: followUpStatus } : item)));
      setMetrics((current) => ({
        ...current,
        unresolvedFeedback: Math.max(0, current.unresolvedFeedback + (followUpStatus === "resolved" ? -1 : 0)),
      }));
      setMessage("Feedback status updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update feedback item");
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
            Native request sending is live now: operators can launch requests manually, capture low-score feedback privately, and queue positive snippets for public proof.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
          <StatCard label="Automation" value={settings.active ? "Active" : "Idle"} tone={settings.active ? "emerald" : "slate"} />
          <StatCard label="Awaiting reply" value={`${metrics.awaitingReply}`} tone="blue" />
          <StatCard label="Public threshold" value={`${settings.positiveThreshold}+★`} tone="amber" />
        </div>
      </div>

      {apiState.setupRequired && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-200">Database setup still required</p>
              <p className="mt-1 text-amber-100/90">The UI is live, but the new reputation tables have not been installed in Supabase yet. Run the reputation migration before expecting persistence in production.</p>
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
                <Metric label="Proof mode" value={`${proofAssets.length} snippets`} detail="Positive feedback ready for proof" icon={Sparkles} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
              <CardHeader className="border-b border-white/10 py-5">
                <CardTitle>What ships in this slice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-5 text-sm text-[var(--muted-foreground)]">
                <ChecklistItem checked>Manual review request creation + simulated send</ChecklistItem>
                <ChecklistItem checked>Operator demo intake for recent requests</ChecklistItem>
                <ChecklistItem checked>Low-rating intake with private feedback capture</ChecklistItem>
                <ChecklistItem checked>Positive snippet proof asset creation</ChecklistItem>
                <ChecklistItem checked>Scoped event-triggered request posting route</ChecklistItem>
                <ChecklistItem checked={false}>Live SMS provider integration (next)</ChecklistItem>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
                <CardHeader className="border-b border-white/10 py-5">
                  <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-electric-500" /> Manual send</CardTitle>
                  <CardDescription>Create a review request now. It persists to the reputation tables, generates a token, and runs the simulated send job immediately.</CardDescription>
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
                  <CardDescription>Small but real: post a completed appointment, job, or delivery event into the same request pipeline without using the manual creation route.</CardDescription>
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
                  <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-xs leading-6 text-[var(--muted-foreground)]">
                    POST /api/reputation/events → {`{ businessName, customerName, phone, eventType }`}
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
                              </div>
                              <p className="mt-2 text-sm text-[var(--foreground)]">{request.business_id} · {contact?.phone || "No phone"}</p>
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Created {new Date(request.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right text-xs text-[var(--muted-foreground)]">
                              <div>{request.score ? `${request.score}/5 reply` : request.sent_at ? "Sent" : "Pending"}</div>
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
                  <CardDescription>Choose a recent request, simulate the customer score + feedback, and immediately refresh the inbox/proof state.</CardDescription>
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          <span>{item.topic || "Private feedback"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{item.severity || "medium"}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px]">{item.follow_up_status}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.feedback_text}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateFeedbackStatus(item.id, "reviewing")}>Reviewing</Button>
                        <Button size="sm" onClick={() => updateFeedbackStatus(item.id, "resolved")}>Resolve</Button>
                      </div>
                    </div>
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
              proofAssets,
            }}
            title="Trust Proof Pipeline"
            description="Positive replies can now create lightweight proof snippets for later approval and publishing."
          />
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
                      Scores {settings.positiveThreshold}-5 → public review page<br />
                      Scores 1-{Math.max(1, settings.positiveThreshold - 1)} → private feedback inbox
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-white/10 bg-[var(--muted)]/20 py-0">
                  <CardHeader className="border-b border-white/10 py-4">
                    <CardTitle className="text-sm">Current engine state</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 py-4 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Send job route now runs the simulated outbound log</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Low-score replies create private feedback items</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Positive written replies create proof snippets</div>
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Live provider delivery still intentionally simulated</div>
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
