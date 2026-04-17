"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Building2, ArrowRight, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "geo-onboarding-done";

interface WelcomeFlowProps {
  /** Called when the user completes or dismisses the flow */
  onComplete?: () => void;
}

export function WelcomeFlow({ onComplete }: WelcomeFlowProps = {}) {
  const router = useRouter();
  // Start open immediately - the parent (dashboard) decides when to show this
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setOpen(false);
      onComplete?.();
      const params = new URLSearchParams();
      if (businessName) params.set("business", businessName);
      if (city) params.set("city", city);
      router.push(`/scan?${params.toString()}`);
    }
  };

  const steps = [
    // Step 0 - Welcome
    {
      content: (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-xl font-black text-emerald-500">G</span>
          </div>
          <h2 className="text-xl font-bold mb-3 tracking-tight">Welcome to Geothority</h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs mx-auto">
            The local SEO intelligence platform trusted by agencies to diagnose,
            fix, and dominate local search - in minutes.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "🔍", label: "5-Layer Audit" },
              { icon: "⚡", label: "Quick Wins" },
              { icon: "📊", label: "Track Progress" },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-[var(--muted)]/40 rounded-lg p-3 border border-[var(--border)]">
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
      action: "Get started",
      canSkip: false,
    },

    // Step 1 - Business info
    {
      content: (
        <div className="py-2">
          <h2 className="text-lg font-bold mb-1.5 tracking-tight">Tell us about your business</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-5">
            This pre-fills your first scan so you can start immediately.
          </p>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">
                <Building2 className="w-3.5 h-3.5" />
                Business name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Smith Insurance Agency"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5 text-[var(--muted-foreground)]">
                <MapPin className="w-3.5 h-3.5" />
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
        </div>
      ),
      action: "Continue",
      canSkip: true,
    },

    // Step 2 - Run first scan
    {
      content: (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-3 tracking-tight">You&apos;re ready</h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs mx-auto">
            Run your first Local Trust Stack™ audit. It takes about 90 seconds
            and shows exactly where you&apos;re losing local search ground.
          </p>
          {(businessName || city) && (
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/40 border border-[var(--border)] rounded-lg px-3 py-2">
              <MapPin className="w-3 h-3" />
              {[businessName, city].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      ),
      action: "Run my first scan",
      canSkip: false,
    },
  ];

  const current = steps[step];
  const totalSteps = steps.length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Opaque backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleDismiss}
      />
      {/* Modal panel */}
      <div className="relative w-full max-w-sm mx-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          {current.content}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-4 h-1.5 bg-emerald-500"
                    : i < step
                    ? "w-1.5 h-1.5 bg-emerald-500/40"
                    : "w-1.5 h-1.5 bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            {current.canSkip ? (
              <button
                onClick={handleNext}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Skip
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
            >
              {current.action}
              {step < totalSteps - 1 ? (
                <ArrowRight className="w-3.5 h-3.5" />
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
