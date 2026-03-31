"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { WillChatbot } from "@/components/chat/will-chatbot";
import { PLANS } from "@/lib/stripe";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

const planKeys = ["audit", "starter", "pro"] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Stop spending $2,500/mo on Google Ads with nothing to show.
              Invest in organic visibility that compounds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {planKeys.map((key) => {
              const plan = PLANS[key];
              const isPopular = "popular" in plan && plan.popular;

              return (
                <div
                  key={key}
                  className={`relative rounded-2xl p-6 border ${
                    isPopular
                      ? "border-electric-500 bg-electric-500/5"
                      : "border-[var(--border)] bg-[var(--card)]"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-electric-500 text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-[var(--muted-foreground)]">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-score-good flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[var(--muted-foreground)]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login"
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isPopular
                        ? "bg-electric-500 hover:bg-electric-600 text-white"
                        : "bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)]"
                    }`}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              All plans include a free website scan. Cancel anytime. No contracts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-electric-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">LA</span>
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
