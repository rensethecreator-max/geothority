"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { WillChatbot } from "@/components/chat/will-chatbot";
import { PLANS } from "@/lib/stripe";
import { CheckCircle2, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const planKeys = ["audit", "starter", "pro"] as const;

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Not logged in — redirect to login first
        window.location.href = `/login?redirect=/pricing`;
      }
    } catch {
      window.location.href = "/login?redirect=/pricing";
    }
    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-electric-500/10 text-electric-400 rounded-full text-sm font-medium mb-4 border border-electric-500/20">
              <Zap className="w-4 h-4" />
              Pays for itself with 2 extra organic leads/month
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Stop spending $2,500/mo on Google Ads with nothing to show. Invest in organic visibility that compounds month after month.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {planKeys.map((key) => {
              const plan = PLANS[key];
              const isPopular = "popular" in plan && plan.popular;
              const isLoading = loadingPlan === key;

              return (
                <div
                  key={key}
                  className={`relative rounded-2xl p-7 border transition-all ${
                    isPopular
                      ? "border-electric-500 bg-electric-500/5 shadow-xl shadow-electric-500/10 scale-105"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-electric-500/30"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-electric-500 text-white text-xs font-bold rounded-full shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-5xl font-black">${plan.price}</span>
                      <span className="text-[var(--muted-foreground)] text-lg">/mo</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">
                      {key === "audit" && "Perfect for getting started"}
                      {key === "starter" && "Best for active agents ready to grow"}
                      {key === "pro" && "For serious agents dominating their market"}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[var(--muted-foreground)]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(key)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                      isPopular
                        ? "bg-electric-500 hover:bg-electric-600 text-white shadow-lg shadow-electric-500/25"
                        : "bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]"
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Free website scan included</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Cancel anytime</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />No contracts</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />30-day money-back guarantee</span>
          </div>

          {/* ROI calculator callout */}
          <div className="mt-16 max-w-2xl mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold mb-3">The Math Is Simple</h3>
            <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
              If Geothority helps you get just <strong className="text-[var(--foreground)]">2 extra organic leads per month</strong> (worth $170 in saved ad spend at $85/click), the Starter plan pays for itself. Most agents see <strong className="text-[var(--foreground)]">10-15 additional monthly leads</strong> within 90 days — replacing $850-1,275/mo in ad spend.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link href="/login" className="text-electric-500 font-semibold text-sm hover:underline flex items-center gap-1">
                Start with a free scan <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-electric-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">G</span>
            </div>
            <span className="font-semibold text-sm">Geothority</span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link>
          </div>
        </div>
      </footer>

      <WillChatbot />
    </div>
  );
}
