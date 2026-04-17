"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Search, BarChart2, Target, CheckCircle2,
} from "lucide-react";
import OnboardingWizard, { type WizardStep } from "@/components/saas/OnboardingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "geothority_onboarding_completed_steps";

const ONBOARDING_STEPS: WizardStep[] = [
  {
    id: "welcome",
    title: "Welcome to Geothority",
    description: "Your local SEO command center for insurance agents",
    icon: <div className="w-10 h-10 rounded-lg bg-electric-500/20 flex items-center justify-center"><span className="text-xl">🗺️</span></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Geothority gives you complete visibility into your local SEO presence - and a clear roadmap to dominate local search and AI results.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔍", title: "90-Second Audit", desc: "See exactly why you're invisible in local search" },
            { icon: "📊", title: "Trust Stack™ Score", desc: "5-layer local authority measurement" },
            { icon: "👁️", title: "Competitor Watchdog", desc: "Monitor rivals' ranking moves" },
            { icon: "✍️", title: "AI Content Engine", desc: "Generate city/service landing pages" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
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
    icon: <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><MapPin className="h-5 w-5 text-emerald-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Head to Settings to enter your business name, city, and website URL. This helps us personalize your audits and competitor analysis.
        </p>
        <div className="bg-muted/20 border border-border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">What to fill in:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
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
    icon: <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><Search className="h-5 w-5 text-blue-400" /></div>,
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
              <span className="text-xs font-mono text-muted-foreground w-16 flex-shrink-0">{item.layer}</span>
              <span className="font-medium w-32 flex-shrink-0">{item.name}</span>
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
    icon: <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><BarChart2 className="h-5 w-5 text-purple-400" /></div>,
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          After your first scan, your Trust Stack™ dashboard shows your score for each of the 5 layers - plus prioritized Quick Win cards with copy-paste fixes.
        </p>
        <div className="bg-muted/20 border border-border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Your score breakdown:</p>
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
    icon: <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Target className="h-5 w-5 text-amber-400" /></div>,
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
              <CheckCircle2 className="h-4 w-4 text-electric-400 flex-shrink-0 mt-0.5" />
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCompletedStepIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleStepComplete = (stepId: string) => {
    const set = new Set<string>(completedStepIds);
    set.add(stepId);
    const updated = Array.from(set);
    setCompletedStepIds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleFinish = async () => {
    const allIds = ONBOARDING_STEPS.map((s) => s.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    trackEvent("onboarding_completed");

    // Persist onboarding completion to the database so the middleware
    // auto-redirect does not fire again on any device.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
    } catch {
      // Non-fatal: localStorage fallback still prevents repeated redirect
    }

    router.push("/dashboard");
  };

  const completedCount = completedStepIds.length;
  const progressPct = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);
  const isComplete = completedCount >= ONBOARDING_STEPS.length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Getting Started</h1>
        <p className="text-muted-foreground">Complete your Geothority setup to start dominating local search.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Setup Progress</CardTitle>
            <span className="text-sm font-medium">{progressPct}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPct} className="h-2" />

          <div className="space-y-2">
            {ONBOARDING_STEPS.map((step) => {
              const done = completedStepIds.includes(step.id);
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    done ? "bg-muted/20 border-electric-500/20" : "border-border"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {done
                      ? <CheckCircle2 className="h-5 w-5 text-electric-400" />
                      : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            {!isComplete ? (
              <Button
                onClick={() => setWizardOpen(true)}
                className="flex-1 bg-electric-500 hover:bg-electric-400"
              >
                {completedCount > 0 ? "Continue Setup" : "Start Setup"}
              </Button>
            ) : (
              <Button onClick={() => router.push("/dashboard")} className="flex-1 bg-electric-500 hover:bg-electric-400">
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
