"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import OnboardingWizard, { type WizardStep } from "@/components/saas/OnboardingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { markOnboardingComplete, ONBOARDING_STEPS_STORAGE_KEY } from "@/lib/onboarding";

const ONBOARDING_STEPS: WizardStep[] = [
  {
    id: "welcome",
    title: "Welcome to Geothority",
    description: "Your local SEO command center for insurance agents",
    icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-electric-500/20"><span className="text-xl">🗺️</span></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Geothority gives you a clear view of your local SEO presence - and a prioritized roadmap for improving search and AI visibility.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔍", title: "90-Second Audit", desc: "See where local trust and visibility are breaking down" },
            { icon: "📊", title: "Trust Stack™ Score", desc: "5-layer local authority measurement" },
            { icon: "👁️", title: "Competitor Watchdog", desc: "Monitor rivals&apos; ranking moves" },
            { icon: "✍️", title: "AI Content Engine", desc: "Generate city/service landing pages" },
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
    actionLabel: "Let's Go",
    canSkip: false,
  },
  {
    id: "business-details",
    title: "Enter Your Business Details",
    description: "Tell us about your insurance agency",
    icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20"><MapPin className="h-5 w-5 text-emerald-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Head to Settings to enter your business name, city, and website URL. This helps us personalize your audits and competitor analysis.
        </p>
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">What to fill in:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Business name (exact match with Google Business Profile)</li>
            <li>• Primary city and state</li>
            <li>• Website URL</li>
          </ul>
        </div>
      </div>
    ),
    actionLabel: "Go to Settings",
    actionPath: "/settings",
    canSkip: true,
  },
  {
    id: "first-audit",
    title: "Run Your First Audit",
    description: "Discover your local SEO Trust Stack™ score",
    icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20"><Search className="h-5 w-5 text-blue-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The 90-second scan analyzes your website across 5 layers of local authority &mdash; revealing exactly where you&apos;re losing visibility.
        </p>
        <div className="space-y-2">
          {[
            { layer: "Layer 1", name: "Foundation", desc: "NAP consistency & Google Business Profile" },
            { layer: "Layer 2", name: "Trust Pages", desc: "About, FAQ, Service Areas, Licensing" },
            { layer: "Layer 3", name: "Geo Content", desc: "City-specific & service landing pages" },
            { layer: "Layer 4", name: "Reviews", desc: "Velocity, recency & response rate" },
            { layer: "Layer 5", name: "AI Optimization", desc: "Schema markup & entity density" },
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
    actionLabel: "Run First Audit",
    actionPath: "/scan",
    canSkip: false,
  },
  {
    id: "trust-stack",
    title: "Review Your Trust Stack Score",
    description: "Understand your local authority gaps",
    icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20"><BarChart2 className="h-5 w-5 text-purple-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          After your first scan, your Trust Stack™ dashboard shows your score for each of the 5 layers - plus prioritized Quick Win cards with copy-paste fixes.
        </p>
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="mb-2 text-sm font-medium">Your score breakdown:</p>
          <div className="space-y-2">
            {[
              { name: "Foundation", score: 80 },
              { name: "Trust Pages", score: 45 },
              { name: "Geo Content", score: 20 },
              { name: "Reviews", score: 60 },
              { name: "AI Optimization", score: 30 },
            ].map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">(example)</span>
                </div>
                <Progress value={item.score} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    actionLabel: "View Dashboard",
    actionPath: "/dashboard",
    canSkip: true,
  },
  {
    id: "improvement-goals",
    title: "Set Improvement Goals",
    description: "Focus on your highest-impact opportunities",
    icon: <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><Target className="h-5 w-5 text-amber-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Your Quick Win cards show the specific actions that will have the biggest impact on your Trust Stack™ score this week.
        </p>
        <div className="space-y-2">
          {[
            "Add a city + state to your homepage title tag",
            "Create a Google Business Profile post this week",
            "Request reviews from your last 3 satisfied clients",
            "Add a local FAQ page to your website",
          ].map((win) => (
            <div key={win} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-electric-400" />
              <span>{win}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    actionLabel: "View Quick Wins",
    actionPath: "/dashboard",
    canSkip: true,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [wizardOpen, setWizardOpen] = useState(true);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(ONBOARDING_STEPS_STORAGE_KEY);
    if (saved) {
      try {
        setCompletedStepIds(JSON.parse(saved));
      } catch {
        setCompletedStepIds([]);
      }
    }
  }, []);

  const handleStepComplete = (stepId: string) => {
    const stepSet = new Set<string>(completedStepIds);
    stepSet.add(stepId);
    const updated = Array.from(stepSet);
    setCompletedStepIds(updated);
    localStorage.setItem(ONBOARDING_STEPS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleFinish = async () => {
    const allIds = ONBOARDING_STEPS.map((step) => step.id);
    markOnboardingComplete(allIds);
    trackEvent("onboarding_completed");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_profiles").update({ onboarding_completed: true }).eq("id", user.id);
      }
    } catch {
      // localStorage fallback still prevents repeated redirect
    }

    router.push("/dashboard");
  };

  const completedCount = completedStepIds.length;
  const progressPct = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);
  const isComplete = completedCount >= ONBOARDING_STEPS.length;
  const nextStep = ONBOARDING_STEPS.find((step) => !completedStepIds.includes(step.id));

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
              Finish your Geothority setup to unlock a cleaner dashboard, stronger scan context, and a launch-ready first impression.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Setup progress", value: `${progressPct}%`, icon: ShieldCheck },
              { label: "Completed steps", value: `${completedCount}/${ONBOARDING_STEPS.length}`, icon: CheckCircle2 },
              { label: "Time to finish", value: isComplete ? "Complete" : "~5 min", icon: Timer },
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
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Work through the core launch steps and we’ll keep your checklist synced locally.</p>
            </div>
            <span className="rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-sm font-semibold text-electric-400">
              {progressPct}%
            </span>
          </div>

          <Progress value={progressPct} className="h-2" />

          <div className="mt-5 space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
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
                "Cleaner dashboard context with your real business details",
                "Scans benchmarked against your market instead of generic defaults",
                "Sharper quick wins and reporting copy for stakeholders",
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
        steps={ONBOARDING_STEPS}
        onStepComplete={handleStepComplete}
        onFinish={handleFinish}
      />
    </div>
  );
}
