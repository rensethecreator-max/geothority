"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  BarChart2,
  Target,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Timer,
  Globe,
  Loader2,
} from "lucide-react";
import OnboardingWizard, { type WizardStep } from "@/components/saas/OnboardingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useActivationState } from "@/hooks/use-activation-state";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { DEFAULT_REPUTATION_SETTINGS, DEFAULT_REPUTATION_TEMPLATES } from "@/lib/reputation/defaults";
import { markOnboardingComplete, ONBOARDING_STEPS_STORAGE_KEY } from "@/lib/onboarding";

interface ProfileFormState {
  business_name: string;
  city: string;
  state: string;
  website_url: string;
}

function readStoredSteps() {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(ONBOARDING_STEPS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function persistStepIds(stepIds: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STEPS_STORAGE_KEY, JSON.stringify(stepIds));
}

function buildScanHref(profile: ProfileFormState) {
  const params = new URLSearchParams();
  if (profile.website_url.trim()) params.set("url", profile.website_url.trim());
  if (profile.business_name.trim()) params.set("business", profile.business_name.trim());
  if (profile.city.trim()) params.set("city", profile.city.trim());
  if (profile.state.trim()) params.set("state", profile.state.trim());
  const query = params.toString();
  return query ? `/scan?${query}` : "/scan";
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [wizardOpen, setWizardOpen] = useState(true);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    business_name: "",
    city: "",
    state: "",
    website_url: "",
  });
  const [loadingContext, setLoadingContext] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [hasCompletedScan, setHasCompletedScan] = useState(false);
  const [reputationSeeded, setReputationSeeded] = useState(false);
  const [reputationActivated, setReputationActivated] = useState(false);
  const [gbpConnected, setGbpConnected] = useState(false);
  const activationState = useActivationState();

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stepSet = new Set<string>(readStoredSteps());

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setLoadingContext(false);
          }
          return;
        }

        const [profileRes, reputationRes, templatesRes] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("business_name, city, state, website_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("reputation_settings")
            .select("user_id, google_review_link, active")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("reputation_templates")
            .select("id")
            .eq("user_id", user.id)
            .limit(1),
        ]);

        const profile = profileRes.data;
        const reputation = reputationRes.data;
        const templateCount = templatesRes.data?.length ?? 0;

        if (!cancelled && profile) {
          setProfileForm({
            business_name: profile.business_name ?? "",
            city: profile.city ?? "",
            state: profile.state ?? "",
            website_url: profile.website_url ?? "",
          });
        }

        if (profile?.business_name && profile?.city && profile?.state) {
          stepSet.add("business-details");
        }

        if (reputation) {
          setReputationSeeded(true);
        } else if (templateCount > 0) {
          setReputationSeeded(true);
        }
      } finally {
        if (!cancelled) {
          const updated = Array.from(stepSet);
          setCompletedStepIds(updated);
          persistStepIds(updated);
          setLoadingContext(false);
        }
      }
    }

    hydrate();
  }, [supabase]);

  useEffect(() => {
    const stepSet = new Set<string>(readStoredSteps());

    setGbpConnected(activationState.gbpConnected);
    setReputationActivated(activationState.reputationActivated);

    if (activationState.latestScan?.id) {
      setHasCompletedScan(true);
      stepSet.add("first-audit");
      stepSet.add("trust-stack");
      if ((activationState.latestScan.quick_wins?.length ?? 0) > 0) {
        stepSet.add("improvement-goals");
      }
    } else {
      setHasCompletedScan(false);
    }

    if (activationState.reputationActivated) {
      stepSet.add("reputation-engine");
    }

    if (activationState.gbpConnected) {
      stepSet.add("gbp-connection");
    }

    const updated = Array.from(stepSet);
    setCompletedStepIds(updated);
    persistStepIds(updated);
  }, [activationState.gbpConnected, activationState.reputationActivated, activationState.latestScan]);

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  const handleStepComplete = (stepId: string) => {
    setCompletedStepIds((current) => {
      if (current.includes(stepId)) return current;
      const updated = [...current, stepId];
      persistStepIds(updated);
      return updated;
    });
  };

  const saveBusinessSetup = useCallback(async () => {
    const businessName = profileForm.business_name.trim();
    const city = profileForm.city.trim();
    const state = profileForm.state.trim();
    const website = profileForm.website_url.trim();

    if (!businessName || !city || !state) {
      setBusinessError("Business name, city, and state are required before we can personalize your launch.");
      return { preventAdvance: true };
    }

    setSavingBusiness(true);
    setBusinessError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setBusinessError("Your session expired. Please sign in again.");
        return { preventAdvance: true };
      }

      const [{ data: existingReputation }, { data: existingTemplates }] = await Promise.all([
        supabase
          .from("reputation_settings")
          .select("user_id, google_review_link, active")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("reputation_templates")
          .select("id")
          .eq("user_id", user.id)
          .limit(1),
      ]);

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          business_name: businessName,
          city,
          state,
          website_url: website || null,
        })
        .eq("id", user.id);

      if (profileError) {
        setBusinessError(profileError.message);
        return { preventAdvance: true };
      }

      const businessProfileRes = await fetch("/api/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          city,
          state,
          website,
        }),
      });

      const businessProfileJson = await businessProfileRes.json().catch(() => ({}));
      if (!businessProfileRes.ok) {
        setBusinessError(businessProfileJson.error || "Failed to save your canonical business profile.");
        return { preventAdvance: true };
      }

      if (!existingReputation) {
        const reputationRes = await fetch("/api/reputation/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...DEFAULT_REPUTATION_SETTINGS,
            active: false,
          }),
        });

        if (!reputationRes.ok && reputationRes.status !== 412) {
          const reputationJson = await reputationRes.json().catch(() => ({}));
          setBusinessError(reputationJson.error || "Business details saved, but reputation defaults could not be seeded yet.");
          return { preventAdvance: true };
        }
      }

      if ((existingTemplates?.length ?? 0) === 0) {
        const templatesRes = await fetch("/api/reputation/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templates: DEFAULT_REPUTATION_TEMPLATES }),
        });

        if (!templatesRes.ok && templatesRes.status !== 412) {
          const templatesJson = await templatesRes.json().catch(() => ({}));
          setBusinessError(templatesJson.error || "Business details saved, but review templates could not be seeded yet.");
          return { preventAdvance: true };
        }
      }

      setBusinessSaved(true);
      setReputationSeeded(true);
      trackEvent("onboarding_business_details_saved", {
        hasWebsite: Boolean(website),
        seededReputationDefaults: true,
      });
      return;
    } finally {
      setSavingBusiness(false);
    }
  }, [profileForm, supabase]);

  const handleFinish = async () => {
    const allIds = steps.map((step) => step.id);
    markOnboardingComplete(allIds);
    trackEvent("onboarding_completed");

    try {
      await fetch("/api/activation/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: "onboarding_completed" }),
      });
    } catch {
      // localStorage fallback still prevents repeated redirect
    }

    router.push("/dashboard");
  };

  const steps = useMemo<WizardStep[]>(() => [
    {
      id: "welcome",
      title: "Welcome to Geothority",
      description: "Your local search and AEO command center",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-electric-500/20"><span className="text-xl">🗺️</span></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Geothority gives you a clear view of your local trust signals, AI-search visibility, and the exact moves that raise your score fastest.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🔍", title: "90-Second Audit", desc: "See where visibility and trust are breaking down" },
              { icon: "📊", title: "Trust Stack™ Score", desc: "5-layer authority measurement" },
              { icon: "🤖", title: "AEO Readiness", desc: "See how AI assistants perceive your business" },
              { icon: "⭐", title: "Reputation Engine", desc: "Turn happy customers into review momentum" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      actionLabel: "Start Setup",
      markCompleteOnAction: true,
      canSkip: false,
    },
    {
      id: "business-details",
      title: "Set Up Your Business Identity",
      description: "Save the details the rest of the platform should trust",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20"><MapPin className="h-5 w-5 text-emerald-400" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This writes your real business identity into Geothority so scans, trust scoring, and reputation workflows stop guessing.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Business name</label>
              <Input
                value={profileForm.business_name}
                onChange={(event) => setProfileForm((current) => ({ ...current, business_name: event.target.value }))}
                placeholder="Smith Insurance Agency"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input
                value={profileForm.city}
                onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Austin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Input
                value={profileForm.state}
                onChange={(event) => setProfileForm((current) => ({ ...current, state: event.target.value }))}
                placeholder="TX"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Website URL</label>
              <Input
                value={profileForm.website_url}
                onChange={(event) => setProfileForm((current) => ({ ...current, website_url: event.target.value }))}
                placeholder="https://www.example.com"
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Saving this step updates both your main user profile and your canonical business profile, then seeds default Reputation Engine settings for later activation.
          </div>
          {savingBusiness && (
            <div className="flex items-center gap-2 text-sm text-electric-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving your launch context…
            </div>
          )}
          {businessError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {businessError}
            </div>
          )}
          {businessSaved && !businessError && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Business setup saved. Geothority now has durable context to personalize your first audit.
            </div>
          )}
        </div>
      ),
      actionLabel: "Save & Continue",
      onAction: saveBusinessSetup,
      markCompleteOnAction: true,
      canSkip: false,
    },
    {
      id: "first-audit",
      title: "Run Your First Audit",
      description: "Establish the baseline that powers every next move",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20"><Search className="h-5 w-5 text-blue-400" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your first scan is where Geothority stops being setup and starts being useful. We’ll prefill the scan with the business identity you just saved.
          </p>
          <div className="space-y-2">
            {[
              { layer: "Layer 1", name: "Foundation", desc: "NAP consistency & Google Business Profile" },
              { layer: "Layer 2", name: "Trust Pages", desc: "About, FAQ, service area, licensing signals" },
              { layer: "Layer 3", name: "Geo Content", desc: "Location and service coverage pages" },
              { layer: "Layer 4", name: "Reviews", desc: "Velocity, recency, and response health" },
              { layer: "Layer 5", name: "AI Optimization", desc: "Schema, entities, and AEO signals" },
            ].map((item) => (
              <div key={item.layer} className="flex items-center gap-3 text-sm">
                <span className="w-16 flex-shrink-0 text-xs font-mono text-muted-foreground">{item.layer}</span>
                <span className="w-32 flex-shrink-0 font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      actionLabel: hasCompletedScan ? "Run Another Scan" : "Run First Audit",
      onAction: () => ({ redirectTo: buildScanHref(profileForm) }),
      markCompleteOnAction: false,
      canSkip: false,
    },
    {
      id: "trust-stack",
      title: "Review Your Trust Stack Score",
      description: "Turn the audit into a ranked improvement map",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20"><BarChart2 className="h-5 w-5 text-purple-400" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Once a scan exists, Geothority can show you exactly which layer is strongest, which one is leaking trust, and where the first score lift should come from.
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="mb-2 text-sm font-medium">What you get after the scan:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Overall Trust Stack™ score and layer breakdown</div>
              <div>• Quick wins ranked by likely impact</div>
              <div>• Reputation and proof signals blended into trust analysis</div>
            </div>
          </div>
        </div>
      ),
      actionLabel: "Open Dashboard",
      actionPath: "/dashboard",
      markCompleteOnAction: false,
      canSkip: true,
    },
    {
      id: "gbp-connection",
      title: "Connect Google Business Profile",
      description: "Give Geothority live local authority data instead of just website signals",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20"><Globe className="h-5 w-5 text-cyan-300" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            GBP connection unlocks a much richer trust model: profile monitoring, post automation, review awareness, and better layer-1 diagnostics.
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            {gbpConnected
              ? "GBP is already connected or synced. You can still open the health center to verify refresh reliability."
              : "If you have a Google Business Profile, connect it now so Geothority can stop relying on public-only assumptions."}
          </div>
        </div>
      ),
      actionLabel: gbpConnected ? "Check GBP Health" : "Connect GBP",
      actionPath: "/gbp-health",
      markCompleteOnAction: false,
      canSkip: true,
    },
    {
      id: "reputation-engine",
      title: "Seed Your Reputation Engine",
      description: "Prepare the review pipeline before you ask for the first review",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><Globe className="h-5 w-5 text-amber-400" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Geothority now has your default reputation settings and starter templates in place. The next move is to add your Google review link, turn automation on, and test the first request.
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            {reputationActivated
              ? "Reputation Engine is already activated. Open it to send, monitor, and recover review momentum."
              : reputationSeeded
                ? "Defaults are seeded. You can go straight into the Reputation Engine and finish activation."
                : "Business setup seeds the defaults automatically so you can activate reviews without starting from scratch."}
          </div>
        </div>
      ),
      actionLabel: reputationActivated ? "Manage Reputation Engine" : "Activate Reputation Engine",
      actionPath: "/reputation",
      markCompleteOnAction: false,
      canSkip: true,
    },
    {
      id: "improvement-goals",
      title: "Set Improvement Goals",
      description: "Use the quick wins to create momentum fast",
      icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><Target className="h-5 w-5 text-amber-400" /></div>,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The best onboarding close isn’t “you’re configured.” It’s “you know the next three actions most likely to move the score.”
          </p>
          <div className="space-y-2">
            {[
              "Finish the first scan and inspect the weakest layer",
              "Connect GBP or at least verify its health if it already exists",
              "Open the Reputation Engine and prepare your first review request",
              "Use the first two quick wins as your 7-day launch sprint",
            ].map((win) => (
              <div key={win} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-electric-400" />
                <span>{win}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      actionLabel: "Finish Setup",
      markCompleteOnAction: false,
      canSkip: true,
    },
  ], [businessError, businessSaved, gbpConnected, hasCompletedScan, profileForm, reputationActivated, reputationSeeded, saveBusinessSetup, savingBusiness]);

  const completedCount = completedStepIds.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);
  const isComplete = completedCount >= steps.length;
  const nextStep = steps.find((step) => !completedStepIds.includes(step.id));
  const nextStepIndex = nextStep ? steps.findIndex((step) => step.id === nextStep.id) : steps.length - 1;

  if (loadingContext) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-electric-400" />
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading your launch context…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-500">
              <Sparkles className="h-3.5 w-3.5" />
              Launch sequence
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Getting Started</h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              This setup now saves real business context, seeds downstream systems, and pushes you toward the first useful result instead of leaving you in documentation limbo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Setup progress", value: `${progressPct}%`, icon: ShieldCheck },
              { label: "Completed steps", value: `${completedCount}/${steps.length}`, icon: CheckCircle2 },
              { label: "Time to finish", value: isComplete ? "Complete" : "~6 min", icon: Timer },
            ].map((item) => (
              <div key={item.label} className="geo-premium-muted min-w-[170px] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <item.icon className="h-3.5 w-3.5 text-electric-500" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="geo-premium-card rounded-3xl p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Setup Progress</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">The checklist below is now driven by real saved state where possible, not just button clicks.</p>
            </div>
            <span className="rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-sm font-semibold text-electric-400">
              {progressPct}%
            </span>
          </div>

          <Progress value={progressPct} className="h-2" />

          <div className="mt-5 space-y-3">
            {steps.map((step, index) => {
              const done = completedStepIds.includes(step.id);
              const current = nextStep?.id === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    done
                      ? "border-electric-500/20 bg-electric-500/5"
                      : current
                        ? "border-white/15 bg-white/[0.03]"
                        : "border-[var(--border)] bg-[var(--background)]/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-electric-400" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--muted-foreground)] text-[10px] font-semibold text-[var(--muted-foreground)]">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${done ? "text-[var(--muted-foreground)] line-through" : "text-[var(--foreground)]"}`}>
                          {step.title}
                        </p>
                        {current && !done && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-electric-400">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-3 pt-2">
            {!isComplete ? (
              <Button onClick={() => setWizardOpen(true)} className="flex-1 bg-electric-500 hover:bg-electric-400">
                {completedCount > 0 ? "Continue Setup" : "Start Setup"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => router.push("/dashboard")} className="flex-1 bg-electric-500 hover:bg-electric-400">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="geo-premium-card rounded-3xl border-0 bg-transparent py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-base">What unlocks after setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6">
              {[
                "Cleaner dashboard context with your real business identity",
                "Scans prefilled from durable profile data instead of blank forms",
                "Reputation Engine defaults seeded before you activate review requests",
                "Better chance of journeys and next-step guidance matching reality",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-electric-400" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="geo-premium-card rounded-3xl border-0 bg-transparent py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-base">Recommended next step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                {nextStep
                  ? `${nextStep.title} is the highest-leverage move right now.`
                  : "You’re fully configured — head to the dashboard and start acting on the top quick wins."}
              </p>
              <Button
                variant="outline"
                onClick={() => (isComplete ? router.push("/dashboard") : setWizardOpen(true))}
                className="w-full"
              >
                {isComplete ? "Open Dashboard" : "Resume Wizard"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <OnboardingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        steps={steps}
        initialStepIndex={Math.max(nextStepIndex, 0)}
        onStepComplete={handleStepComplete}
        onFinish={handleFinish}
      />
    </div>
  );
}
