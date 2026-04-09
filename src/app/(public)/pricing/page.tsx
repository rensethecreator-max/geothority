"use client";

import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";
import { useState } from "react";
import { Check, Zap, Star, Shield, Building2 } from "lucide-react";

const plans = [
  {
    id: "audit",
    name: "Audit Only",
    badge: "One-Time",
    badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    icon: <Shield className="w-5 h-5" />,
    iconBg: "bg-amber-500/10 text-amber-400",
    description: "Perfect for agents who want to know exactly where they stand before committing.",
    monthlyPrice: 47,
    annualPrice: 47,
    isOneTime: true,
    ctaText: "Get My Audit",
    ctaStyle: "border border-electric-500 text-electric-400 hover:bg-electric-500 hover:text-white",
    featured: false,
    features: [
      "Full 90-second website scan",
      "5-layer Trust Stack™ scoring",
      "Competitor gap analysis",
      "Quick Win cards (copy-paste fixes)",
      "AI search visibility check",
      "Email delivery of full report",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    badge: null,
    badgeColor: "",
    icon: <Zap className="w-5 h-5" />,
    iconBg: "bg-electric-500/10 text-electric-400",
    description: "Everything you need to stop being invisible in local search.",
    monthlyPrice: 97,
    annualPrice: 80,
    isOneTime: false,
    ctaText: "Get Started",
    ctaStyle: "border border-electric-500 text-electric-400 hover:bg-electric-500 hover:text-white",
    featured: false,
    features: [
      "GBP health audit & monitoring",
      "Local Authority Score™",
      "Citation scan (1 location)",
      "Quick Win card library",
      "Monthly Trust Stack™ report",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most Popular",
    badgeColor: "bg-electric-500/20 text-electric-400 border border-electric-500/30",
    icon: <Star className="w-5 h-5" />,
    iconBg: "bg-electric-500/10 text-electric-400",
    description: "For agents ready to dominate local search and AI results.",
    monthlyPrice: 197,
    annualPrice: 163,
    isOneTime: false,
    ctaText: "Get Started",
    ctaStyle: "bg-electric-500 hover:bg-electric-400 text-white shadow-lg shadow-electric-500/25",
    featured: true,
    features: [
      "Everything in Starter",
      "Weekly AI-written GBP posts",
      "Automated review request campaigns",
      "Competitor tracking (3 competitors)",
      "Citation sync across 80+ directories",
      "AI search optimization (GEO)",
      "Priority email & chat support",
    ],
  },
  {
    id: "authority",
    name: "Authority",
    badge: null,
    badgeColor: "",
    icon: <Shield className="w-5 h-5" />,
    iconBg: "bg-purple-500/10 text-purple-400",
    description: "Total market control for top producers.",
    monthlyPrice: 297,
    annualPrice: 246,
    isOneTime: false,
    ctaText: "Get Started",
    ctaStyle: "border border-electric-500 text-electric-400 hover:bg-electric-500 hover:text-white",
    featured: false,
    features: [
      "Everything in Growth",
      "Full Trust Stack™ dashboard",
      "AI content engine (city/service pages)",
      "Unlimited competitor tracking",
      "White-label PDF reports",
      "Dedicated onboarding call",
      "Advanced analytics",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    badge: null,
    badgeColor: "",
    icon: <Building2 className="w-5 h-5" />,
    iconBg: "bg-emerald-500/10 text-emerald-400",
    description: "For IMOs, agencies and multi-location teams.",
    monthlyPrice: 997,
    annualPrice: 827,
    isOneTime: false,
    ctaText: "Contact Sales",
    ctaStyle: "border border-electric-500 text-electric-400 hover:bg-electric-500 hover:text-white",
    featured: false,
    features: [
      "Everything in Authority",
      "10 agent seats included",
      "IMO/team dashboard",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Custom reporting",
    ],
  },
];

export default function PricingPage() {
  const [billingAnnual, setBillingAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-6 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-electric-500/10 text-electric-400 rounded-full text-sm font-medium mb-5 border border-electric-500/20">
          <Zap className="w-3.5 h-3.5" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Choose the plan that&apos;s right for you
        </h1>
        <p className="text-[var(--muted-foreground)] max-w-xl mx-auto mb-8">
          No long-term contracts. Cancel anytime. All plans include a free website scan.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-full p-1 mb-12">
          <button
            onClick={() => setBillingAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              !billingAnnual
                ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              billingAnnual
                ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Annual
            <span className="ml-1.5 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Save 17%</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
                plan.featured
                  ? "bg-[var(--card)] border-electric-500 shadow-xl shadow-electric-500/10 scale-[1.02]"
                  : "bg-[var(--card)] border-[var(--border)] hover:border-electric-500/40"
              }`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Icon + Name */}
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${plan.iconBg}`}>
                  {plan.icon}
                </div>
                <h2 className="text-lg font-bold leading-tight">{plan.name}</h2>
              </div>

              {/* Description */}
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed mb-5 min-h-[48px]">
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">
                    ${plan.isOneTime ? plan.monthlyPrice : (billingAnnual ? plan.annualPrice : plan.monthlyPrice)}
                  </span>
                  {!plan.isOneTime && (
                    <span className="text-[var(--muted-foreground)] text-sm mb-1">/mo</span>
                  )}
                  {plan.isOneTime && (
                    <span className="text-[var(--muted-foreground)] text-sm mb-1">one-time</span>
                  )}
                </div>
                {billingAnnual && !plan.isOneTime && (
                  <p className="text-xs text-emerald-400 mt-1">Billed ${plan.annualPrice * 12}/yr</p>
                )}
              </div>

              {/* Features — grows to fill space */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-electric-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--foreground)]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — always at bottom */}
              <Link
                href={plan.id === "agency" ? "mailto:hello@geothority.io" : "/login"}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-center transition-all block ${plan.ctaStyle}`}
              >
                {plan.ctaText}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="max-w-2xl mx-auto mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--muted-foreground)]">
          <span>✓ No credit card to scan</span>
          <span>✓ Cancel anytime</span>
          <span>✓ 30-day money-back guarantee</span>
          <span>✓ SOC 2 compliant</span>
        </div>
      </section>

      {/* Starcepta Bundle Banner */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-electric-500/10 to-amber-500/10 border border-electric-500/20 rounded-2xl p-8 text-center">
          <div className="text-2xl mb-2">🔗</div>
          <h2 className="text-2xl font-bold mb-2">The Insurance Agent Trust Stack</h2>
          <p className="text-[var(--muted-foreground)] mb-4">
            Geothority gets you found. Starcepta turns every client into a 5-star review.
            Together they make you unstoppable.
          </p>
          <p className="text-xl font-bold text-electric-400 mb-6">
            Growth + Starcepta Starter = <span className="line-through text-[var(--muted-foreground)] text-base font-normal mr-1">$272</span>$249/mo
          </p>
          <Link
            href="https://starcepta.com?ref=geothority-bundle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-electric-500 hover:bg-electric-400 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Get the Bundle → Save $23/mo
          </Link>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section className="py-16 px-4 bg-[var(--card)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">How We Compare</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10">
            At $197/mo, Geothority Growth delivers what $400+/mo tools can&apos;t — including the AI search edge they don&apos;t even have.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="text-left py-4 px-5 text-sm font-medium text-[var(--muted-foreground)]">Feature</th>
                  <th className="py-4 px-5 text-sm font-bold text-electric-400 bg-electric-500/5">Geothority Growth<br/><span className="text-xs font-normal text-electric-400/70">$197/mo</span></th>
                  <th className="py-4 px-5 text-sm font-medium text-[var(--muted-foreground)]">Birdeye<br/><span className="text-xs">$299/mo</span></th>
                  <th className="py-4 px-5 text-sm font-medium text-[var(--muted-foreground)]">Podium<br/><span className="text-xs">$399/mo</span></th>
                  <th className="py-4 px-5 text-sm font-medium text-[var(--muted-foreground)]">Moz Local<br/><span className="text-xs">$33/mo</span></th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["AI Search (GEO) Optimization", true, false, false, false],
                  ["Local SEO Audit & Scoring", true, false, false, true],
                  ["Competitor Watchdog", true, false, false, false],
                  ["AI Content Auto-Publish", true, false, false, false],
                  ["Insurance Agent Focused", true, false, false, false],
                  ["GBP Management", true, true, false, true],
                  ["Review Management", "Via Starcepta", true, true, true],
                ] as [string, boolean | string, boolean, boolean, boolean][]).map(([feature, geo, bird, pod, moz]) => (
                  <tr key={feature} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-3.5 px-5 text-sm">{feature}</td>
                    <td className="py-3.5 px-5 text-center bg-electric-500/5">
                      {geo === true ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : geo === false ? <span className="text-red-400 font-bold">✗</span> : <span className="text-xs text-[var(--muted-foreground)]">{geo}</span>}
                    </td>
                    <td className="py-3.5 px-5 text-center">{bird ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-red-400 font-bold">✗</span>}</td>
                    <td className="py-3.5 px-5 text-center">{pod ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-red-400 font-bold">✗</span>}</td>
                    <td className="py-3.5 px-5 text-center">{moz ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-red-400 font-bold">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Power-Ups</h2>
          <p className="text-center text-[var(--muted-foreground)] text-sm mb-8">Add to any plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "AI Content Engine", price: "+$49/mo", desc: "Unlimited city/service landing pages" },
              { name: "Citation Cleanup", price: "$199 one-time", desc: "Manually fix all NAP inconsistencies" },
              { name: "Review Rocket", price: "+$79/mo", desc: "Advanced review campaigns + SMS" },
              { name: "Competitor Intel", price: "+$49/mo", desc: "5 additional competitors tracked" },
            ].map((addon) => (
              <div key={addon.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex items-start gap-4 hover:border-electric-500/40 transition-colors">
                <Check className="w-5 h-5 text-electric-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">{addon.name}</div>
                  <div className="text-electric-400 text-sm font-medium">{addon.price}</div>
                  <div className="text-[var(--muted-foreground)] text-xs mt-0.5">{addon.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
