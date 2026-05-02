"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
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

interface ApiState {
  setupRequired: boolean;
}

export function ReputationEngine() {
  const [settings, setSettings] = useState<ReputationSettings>(DEFAULT_REPUTATION_SETTINGS);
  const [templates, setTemplates] = useState<ReputationTemplate[]>(DEFAULT_REPUTATION_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [apiState, setApiState] = useState<ApiState>({ setupRequired: false });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [settingsRes, templatesRes] = await Promise.all([
          fetch("/api/reputation/settings", { cache: "no-store" }),
          fetch("/api/reputation/templates", { cache: "no-store" }),
        ]);

        const settingsJson = await settingsRes.json();
        const templatesJson = await templatesRes.json();

        if (!mounted) return;

        if (!settingsRes.ok) throw new Error(settingsJson.error || "Failed to load reputation settings");
        if (!templatesRes.ok) throw new Error(templatesJson.error || "Failed to load reputation templates");

        setSettings(settingsJson.settings ?? DEFAULT_REPUTATION_SETTINGS);
        setTemplates(templatesJson.templates ?? DEFAULT_REPUTATION_TEMPLATES);
        setApiState({ setupRequired: Boolean(settingsJson.setupRequired || templatesJson.setupRequired) });
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
    () =>
      settings.smsTemplate
        .replace("{customer_name}", "Alex")
        .replace("{business_name}", "Your business"),
    [settings.smsTemplate],
  );

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
            This is the first Geothority-native reputation layer. Use it to turn review health from a passive score input into an active authority lever.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
          <StatCard label="Review health" value={settings.active ? "Active" : "Idle"} tone={settings.active ? "emerald" : "slate"} />
          <StatCard label="Campaign delay" value={`${settings.smsDelayMinutes}m`} tone="blue" />
          <StatCard label="Public threshold" value={`${settings.positiveThreshold}+★`} tone="amber" />
        </div>
      </div>

      {apiState.setupRequired && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-200">Database setup still required</p>
              <p className="mt-1 text-amber-100/90">
                The UI is live, but the new reputation tables have not been installed in Supabase yet. Run the reputation migration before expecting persistence in production.
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
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
              <CardHeader className="border-b border-white/10 py-5">
                <CardTitle>Review Health snapshot</CardTitle>
                <CardDescription>Native review automation becomes another trust lever, not a separate product detour.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 py-5 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Automation" value={settings.active ? "On" : "Off"} detail={settings.active ? "Requests can be scheduled" : "No requests will be sent"} icon={ShieldCheck} />
                <Metric label="Review route" value={`${settings.positiveThreshold}+ stars`} detail="Lower scores stay private" icon={Star} />
                <Metric label="Delay" value={`${settings.smsDelayMinutes} minutes`} detail="Time after transaction" icon={TrendingUp} />
                <Metric label="Proof mode" value="Ready" detail="Positive review snippets can feed trust pages next" icon={Sparkles} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
              <CardHeader className="border-b border-white/10 py-5">
                <CardTitle>What ships in this slice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-5 text-sm text-[var(--muted-foreground)]">
                <ChecklistItem checked>Native Reputation nav + dashboard surface</ChecklistItem>
                <ChecklistItem checked>Persisted settings API</ChecklistItem>
                <ChecklistItem checked>Template library persistence</ChecklistItem>
                <ChecklistItem checked>Reusable scheduler service port</ChecklistItem>
                <ChecklistItem checked={false}>Private feedback inbox (next)</ChecklistItem>
                <ChecklistItem checked={false}>Public one-tap review page (next)</ChecklistItem>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
            <CardHeader className="border-b border-white/10 py-5">
              <CardTitle>Campaign controls</CardTitle>
              <CardDescription>Operator-simple first pass. Event sources and feedback routing come next.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 py-5 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Initial SMS preview</label>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-[var(--foreground)]">
                  {previewSms}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Automation status</label>
                <div className="rounded-2xl border border-white/10 bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">
                  <p>
                    When automation is active, Geothority can schedule review requests after transaction or trigger events, keep low-score feedback private, and later route positive proof into trust assets.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Switch checked={settings.active} onCheckedChange={(checked) => setSettings((current) => ({ ...current, active: checked }))} />
                    <span className="font-medium text-[var(--foreground)]">{settings.active ? "Automation enabled" : "Automation disabled"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <PlaceholderCard
            icon={MessageSquare}
            title="Private Feedback Inbox"
            description="Low-score replies and complaints will land here next. This keeps unhappy experiences actionable before they become public trust damage."
            bullets={["Status lanes for new / reviewing / resolved", "Topic + severity tagging", "Action Center hooks for operator follow-up"]}
          />
        </TabsContent>

        <TabsContent value="proof" className="space-y-4">
          <PlaceholderCard
            icon={Sparkles}
            title="Trust Proof Pipeline"
            description="Positive reviews should become reusable proof blocks for trust pages, city pages, and benchmark assets. This is where the self-marketing loop gets real."
            bullets={["Approve standout snippets", "Tag by service / city / topic", "Publish into public authority surfaces"]}
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
                    <Input
                      type="number"
                      min={5}
                      value={settings.smsDelayMinutes}
                      onChange={(event) => setSettings((current) => ({ ...current, smsDelayMinutes: Number(event.target.value || 60) }))}
                    />
                  </Field>
                  <Field label="Positive threshold">
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={settings.positiveThreshold}
                      onChange={(event) => setSettings((current) => ({ ...current, positiveThreshold: Number(event.target.value || 4) }))}
                    />
                  </Field>
                </div>
                <Field label="SMS template" hint="Merge fields: {customer_name}, {business_name}">
                  <Textarea value={settings.smsTemplate} onChange={(event) => setSettings((current) => ({ ...current, smsTemplate: event.target.value }))} className="min-h-32" />
                </Field>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--muted)]/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Activate review automation</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Keep this off until the event source and migration are ready.</p>
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
                    <CardTitle className="text-sm">Next integrations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 py-4 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> QStash-ready scheduler service ported</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Template persistence scaffolded</div>
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Send job route still needs implementation</div>
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Event-source connectors still need wiring</div>
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

function PlaceholderCard({ icon: Icon, title, description, bullets }: { icon: any; title: string; description: string; bullets: string[] }) {
  return (
    <Card className="rounded-3xl border-white/10 bg-[var(--card)]/95 py-0">
      <CardHeader className="border-b border-white/10 py-5">
        <CardTitle className="flex items-center gap-2"><Icon className="h-4 w-4 text-electric-500" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 py-5 text-sm text-[var(--muted-foreground)]">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {bullet}</div>
        ))}
      </CardContent>
    </Card>
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
