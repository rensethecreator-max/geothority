"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Shield, ArrowRight, Sparkles, ChevronDown, ChevronUp, Building2, Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { GeoTooltip } from "@/components/ui/geo-tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureValue = boolean | string;

interface PlanFeatures {
  // Scanning & Analysis
  dailyScans: string;
  trustStackScore: boolean;
  layerBreakdown: boolean;
  quickWins: boolean;
  competitorAnalysis: string;
  // Citations & Listings
  citationCheck: boolean;
  listingSync: boolean;
  fixThisLinks: boolean;
  napMonitoring: string;
  // Content & AI
  aiContentGen: string;
  schemaGenerator: boolean;
  aiOverviewChecker: string;
  // Monitoring & Alerts
  gbpMonitor: string;
  competitorAlerts: boolean;
  scoreHistory: string;
  // Support
  willAiAssistant: boolean;
  emailSupport: string;
  pdfReports: string;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  cta: string;
  ctaHref: string;
  popular: boolean;
  features: PlanFeatures;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    description: "Get started with local SEO basics",
    cta: "Start Free",
    ctaHref: "/signup",
    popular: false,
    features: {
      dailyScans: "3",
      trustStackScore: true,
      layerBreakdown: true,
      quickWins: true,
      competitorAnalysis: "Basic",
      citationCheck: true,
      listingSync: false,
      fixThisLinks: true,
      napMonitoring: "None",
      aiContentGen: "1 / mo",
      schemaGenerator: true,
      aiOverviewChecker: "Demo",
      gbpMonitor: "None",
      competitorAlerts: false,
      scoreHistory: "30 days",
      willAiAssistant: true,
      emailSupport: "None",
      pdfReports: "None",
    },
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 97,
    description: "Best for individual agents",
    cta: "Start 14-Day Trial",
    ctaHref: "/signup",
    popular: false,
    features: {
      dailyScans: "10",
      trustStackScore: true,
      layerBreakdown: true,
      quickWins: true,
      competitorAnalysis: "Full",
      citationCheck: true,
      listingSync: false,
      fixThisLinks: true,
      napMonitoring: "Weekly",
      aiContentGen: "5 / mo",
      schemaGenerator: true,
      aiOverviewChecker: "Full",
      gbpMonitor: "Weekly",
      competitorAlerts: false,
      scoreHistory: "90 days",
      willAiAssistant: true,
      emailSupport: "✓",
      pdfReports: "✓",
    },
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 197,
    description: "Most Popular - everything you need",
    cta: "Start 14-Day Trial",
    ctaHref: "/signup",
    popular: true,
    features: {
      dailyScans: "Unlimited",
      trustStackScore: true,
      layerBreakdown: true,
      quickWins: true,
      competitorAnalysis: "Full + Alerts",
      citationCheck: true,
      listingSync: true,
      fixThisLinks: true,
      napMonitoring: "Daily",
      aiContentGen: "Unlimited",
      schemaGenerator: true,
      aiOverviewChecker: "Full",
      gbpMonitor: "Daily",
      competitorAlerts: true,
      scoreHistory: "1 year",
      willAiAssistant: true,
      emailSupport: "Priority",
      pdfReports: "Branded",
    },
  },
  {
    id: "authority",
    name: "Authority",
    monthlyPrice: 297,
    description: "For multi-location businesses",
    cta: "Start 14-Day Trial",
    ctaHref: "/signup",
    popular: false,
    features: {
      dailyScans: "Unlimited",
      trustStackScore: true,
      layerBreakdown: true,
      quickWins: true,
      competitorAnalysis: "Full + Alerts",
      citationCheck: true,
      listingSync: true,
      fixThisLinks: true,
      napMonitoring: "Real-time",
      aiContentGen: "Unlimited",
      schemaGenerator: true,
      aiOverviewChecker: "Full + Monitor",
      gbpMonitor: "Real-time",
      competitorAlerts: true,
      scoreHistory: "Unlimited",
      willAiAssistant: true,
      emailSupport: "Dedicated",
      pdfReports: "White-label",
    },
  },
];

const faqs = [
  {
    q: "Can I switch plans?",
    a: "Absolutely. You can upgrade or downgrade at any time. When you upgrade, we prorate the difference immediately so you get access right away. Downgrades take effect at your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes - every paid plan comes with a 14-day free trial, no credit card required. You get full access to all features in your plan so you can see the value before you commit.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) as well as ACH bank transfers for annual plans. All payments are processed securely through Stripe.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no contracts or lock-ins. Cancel from your dashboard in under 60 seconds. You keep access until the end of your current billing period.",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes - save 20% when you pay annually. For the Growth plan that's over $480 back in your pocket each year. Discounts apply to all paid plans.",
  },
  {
    q: "What happens when I hit my scan limit?",
    a: "On the Free plan, scans reset daily at midnight UTC. If you reach your limit before then, you'll see a prompt to upgrade. Paid plans come with generous limits - Growth and Authority are completely unlimited.",
  },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-gray-600 mx-auto" />
    );
  }
  if (value === "None") return <X className="w-5 h-5 text-gray-600 mx-auto" />;
  if (value === "✓") return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
  return <span className="text-sm text-gray-300 text-center block">{value}</span>;
}

function FeatureRow({
  label,
  free,
  starter,
  growth,
  authority,
  tip,
}: {
  label: string;
  free: FeatureValue;
  starter: FeatureValue;
  growth: FeatureValue;
  authority: FeatureValue;
  tip?: string;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 pr-4 text-sm text-gray-400 font-medium">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {tip && <GeoTooltip tip={tip} side="right" iconClassName="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />}
        </span>
      </td>
      <td className="py-3 text-center px-2"><FeatureCell value={free} /></td>
      <td className="py-3 text-center px-2"><FeatureCell value={starter} /></td>
      <td className="py-3 text-center px-2 relative">
        <div className="absolute inset-0 bg-emerald-500/[0.04] pointer-events-none" />
        <FeatureCell value={growth} />
      </td>
      <td className="py-3 text-center px-2"><FeatureCell value={authority} /></td>
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={5} className="pt-6 pb-2">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      </td>
    </tr>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl bg-[#0f1117] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-5 text-left hover:bg-white/5 transition-colors min-h-[56px]"
      >
        <span className="text-white font-medium pr-4 text-[15px] leading-relaxed">{q}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-gray-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const displayPrice = (plan: Plan) => {
    if (plan.monthlyPrice === 0) return "$0";
    const price = annual
      ? Math.round(plan.monthlyPrice * 0.8)
      : plan.monthlyPrice;
    return `$${price}`;
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Radial background glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">

        {/* ═══════════════════════════════════════════════════
            SECTION 1 - Header
        ════════════════════════════════════════════════════ */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              Plans for every local business
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Simple, Transparent
              </span>{" "}
              <br />
              <span className="text-white">Pricing</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-10">
              Start free. Upgrade when you&apos;re ready. Cancel anytime.
            </p>

            {/* Monthly / Annual toggle */}
            <div className="inline-flex items-center gap-4 bg-[#0f1117] border border-white/10 rounded-full px-2 py-2">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !annual
                    ? "bg-white text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  annual
                    ? "bg-white text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Annual
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            SECTION 2 - Pricing Cards
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 border transition-all duration-300 ${
                  plan.popular
                    ? "bg-[#0f1117] border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "bg-[#0f1117] border-white/10 hover:border-white/20"
                }`}
              >
                {/* Most Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                      <Star className="w-3 h-3 fill-current" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-4 pt-2">
                  <h2 className={`text-lg font-bold mb-1 ${plan.popular ? "text-emerald-400" : "text-white"}`}>
                    {plan.name}
                  </h2>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">
                      {displayPrice(plan)}
                    </span>
                    <span className="text-gray-500 mb-1.5">/mo</span>
                  </div>
                  {annual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Billed annually (${Math.round(plan.monthlyPrice * 0.8 * 12)}/yr)
                    </p>
                  )}
                  {!annual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-emerald-500 mt-1">
                      ${Math.round(plan.monthlyPrice * 0.8)}/mo billed annually
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all mb-6 ${
                    plan.popular
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]"
                      : plan.id === "free"
                      ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {/* Feature list */}
                <ul className="space-y-2.5 flex-1">
                  {/* Scanning */}
                  <li className="text-xs uppercase tracking-wider text-gray-600 font-semibold pt-1">Scanning</li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {plan.features.dailyScans} daily scans
                    <GeoTooltip tip="More scans means more up-to-date data. Re-scan whenever you make changes to see the impact immediately." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    Trust Stack Score
                    <GeoTooltip tip="A single 0–100 score across 5 authority layers that tells you how strong your local presence is at a glance." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {plan.features.competitorAnalysis} competitor analysis
                    <GeoTooltip tip="See how your local authority compares to competitors. Alerts notify you when they make a move." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>

                  {/* Citations */}
                  <li className="text-xs uppercase tracking-wider text-gray-600 font-semibold pt-2">Citations</li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    Citation check (18 dirs)
                    <GeoTooltip tip="We verify your business info across 18 major directories so Google trusts your listings." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    {plan.features.listingSync ? (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                    <span className={plan.features.listingSync ? "text-gray-300" : "text-gray-600"}>
                      Listing sync (50+ dirs)
                    </span>
                    <GeoTooltip tip="Automatically push correct info to 50+ directories - no manual updates needed." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  {plan.features.napMonitoring !== "None" && (
                    <li className="flex items-center gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      NAP monitoring ({plan.features.napMonitoring.toLowerCase()})
                      <GeoTooltip tip="We watch your Name, Address, and Phone listings and alert you the moment something changes." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                    </li>
                  )}

                  {/* AI */}
                  <li className="text-xs uppercase tracking-wider text-gray-600 font-semibold pt-2">AI Content</li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {plan.features.aiContentGen} AI content
                    <GeoTooltip tip="AI writes city-specific pages and local content that Google trusts. More generations = more pages ranking for more searches." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {plan.features.aiOverviewChecker} AI answer checker
                    <GeoTooltip tip="Checks if ChatGPT, Perplexity, and Google AI mention your business when customers search for your services." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>

                  {/* Reports */}
                  <li className="text-xs uppercase tracking-wider text-gray-600 font-semibold pt-2">Reports</li>
                  <li className="flex items-center gap-2.5 text-sm">
                    {plan.features.pdfReports !== "None" ? (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                    <span className={plan.features.pdfReports !== "None" ? "text-gray-300" : "text-gray-600"}>
                      {plan.features.pdfReports !== "None" ? `${plan.features.pdfReports} PDF reports` : "No PDF reports"}
                    </span>
                    <GeoTooltip tip="Download professional reports. Branded includes your logo; White-label lets you use your own branding entirely." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {plan.features.scoreHistory} score history
                    <GeoTooltip tip="See how your Trust Stack has improved over time - proof your efforts are working." side="top" iconClassName="w-3 h-3 opacity-40 hover:opacity-100" />
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            Full Feature Comparison Table (desktop)
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={150}>
          <div className="hidden lg:block mb-20">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Full Feature Comparison
            </h2>
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-8 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 text-gray-500 font-medium text-sm w-48">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className={`text-center py-3 px-4 ${plan.popular ? "text-emerald-400" : "text-gray-300"} font-bold text-sm`}>
                        {plan.popular && <Star className="w-3.5 h-3.5 inline-block mr-1 fill-current" />}
                        {plan.name}
                        <div className="text-xs font-normal text-gray-500 mt-0.5 normal-case">
                          {plan.monthlyPrice === 0 ? "Free" : `$${annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice}/mo`}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <SectionHeader label="Scanning & Analysis" />
                  <FeatureRow label="Daily scans" free="3" starter="10" growth="Unlimited" authority="Unlimited" tip="More scans means more up-to-date data. Free gives you 3 daily scans to start; paid plans let you re-scan as often as you need." />
                  <FeatureRow label="Trust Stack Score" free={true} starter={true} growth={true} authority={true} tip="Your Trust Stack is a single 0–100 score across 5 authority layers - Foundation, Trust Pages, Geo Content, Reviews, and AI Optimization. It tells you at a glance how strong your local presence is." />
                  <FeatureRow label="Layer Breakdown" free={true} starter={true} growth={true} authority={true} tip="See exactly how you score on each of the 5 Trust Stack layers, so you know which specific area to fix first for the biggest ranking gains." />
                  <FeatureRow label="Quick Wins with Priority" free={true} starter={true} growth={true} authority={true} tip="We rank every issue by impact and effort. Quick Wins are the fixes that move your score the most with the least work - your fastest path to better visibility." />
                  <FeatureRow label="Competitor Analysis" free="Basic" starter="Full" growth="Full + Alerts" authority="Full + Alerts" tip="See how your local authority compares to competitors. Full adds detailed side-by-side breakdowns; Alerts emails you when a competitor makes a move." />

                  <SectionHeader label="Citations & Listings" />
                  <FeatureRow label="Citation Check (18 dirs)" free={true} starter={true} growth={true} authority={true} tip="We verify your business name, address, and phone across 18 major directories like Google, Yelp, Bing, and Apple Maps. Inconsistent listings confuse Google and cost you rankings." />
                  <FeatureRow label="Listing Sync (50+ dirs)" free={false} starter={false} growth={true} authority={true} tip="Automatically push correct business info to 50+ directories through the Foursquare data network - covering Bing, Uber, Samsung, HERE Maps, and more. No manual updates needed." />
                  <FeatureRow label="Fix This Direct Links" free={true} starter={true} growth={true} authority={true} tip="Every issue we find comes with a one-click link that takes you straight to the fix - no hunting through dashboards or guessing what to do next." />
                  <FeatureRow label="NAP Monitoring" free="None" starter="Weekly" growth="Daily" authority="Real-time" tip="NAP stands for Name, Address, Phone. We watch your listings around the clock and alert you the moment something changes - so your info stays consistent everywhere." />

                  <SectionHeader label="Content & AI" />
                  <FeatureRow label="AI Content Generation" free="1 / mo" starter="5 / mo" growth="Unlimited" authority="Unlimited" tip="AI writes city-specific landing pages, service descriptions, and local content that Google and AI assistants trust. More generations means more pages ranking for more local searches." />
                  <FeatureRow label="Schema Generator" free={true} starter={true} growth={true} authority={true} tip="Schema is the technical code that tells search engines exactly what your business does. Our 3-click wizard generates it for you - no developer needed." />
                  <FeatureRow label="AI Overview Checker" free="Demo" starter="Full" growth="Full" authority="Full + Monitor" tip="Checks whether ChatGPT, Perplexity, and Google AI Overviews mention your business when customers ask. Full + Monitor means we track changes over time and alert you." />

                  <SectionHeader label="Monitoring & Alerts" />
                  <FeatureRow label="GBP Monitor" free="None" starter="Weekly" growth="Daily" authority="Real-time" tip="Your Google Business Profile is the most important listing you have. We watch it for changes, suspensions, and optimization opportunities so you never lose ground." />
                  <FeatureRow label="Competitor Alerts" free={false} starter={false} growth={true} authority={true} tip="Get an email the moment a competitor publishes new content, gains reviews, or makes a move in your market - so you can respond the same day instead of finding out weeks later." />
                  <FeatureRow label="Score History" free="30 days" starter="90 days" growth="1 year" authority="Unlimited" tip="See how your Trust Stack score has changed over time. Longer history means better trend tracking and proof that your efforts are paying off." />

                  <SectionHeader label="Support" />
                  <FeatureRow label="Will AI Assistant" free={true} starter={true} growth={true} authority={true} tip="An AI assistant that answers your local SEO questions, explains your scan results, and suggests next steps - like having a local SEO expert on call 24/7." />
                  <FeatureRow label="Email Support" free="None" starter="✓" growth="Priority" authority="Dedicated" tip="Priority means faster response times. Dedicated means a named contact who knows your account and business goals." />
                  <FeatureRow label="PDF Reports" free="None" starter="✓" growth="Branded" authority="White-label" tip="Download professional reports to share with clients or stakeholders. Branded includes your logo; White-label lets you remove all Geothority branding and use your own." />
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            SECTION 3 - Enterprise / Agency
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={100}>
          <div className="relative mb-20 rounded-2xl overflow-hidden border border-white/10 bg-[#0f1117]">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
            <div className="relative px-8 py-12 sm:px-12 grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-4">
                  <Building2 className="w-4 h-4" />
                  Enterprise & Multi-Location
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  Need More? We&apos;ve Got You.
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Agency plan starting at <span className="text-white font-semibold">$997/mo</span> for multi-location businesses. Custom scan volumes, white-label dashboards, dedicated account management, and API access.
                </p>
              </div>
              <div className="flex sm:justify-end">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all"
                >
                  Contact Us
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            SECTION 4 - Money-Back Guarantee
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={100}>
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center text-center sm:text-left mb-20 p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">30-Day Money-Back Guarantee</h3>
              <p className="text-gray-400">
                Not satisfied? Get a full refund within 30 days. No questions asked. We stand behind our product wholeheartedly.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            SECTION 5 - FAQ
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={100}>
          <div className="max-w-3xl mx-auto mb-28">
            <h2 className="text-3xl font-bold text-white text-center mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500 text-center mb-10">
              Everything you need to know about pricing and plans.
            </p>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════
            SECTION 6 - Final CTA
        ════════════════════════════════════════════════════ */}
        <ScrollReveal delay={100}>
          <div className="relative text-center rounded-3xl overflow-hidden border border-white/10 bg-[#0f1117] px-8 py-20">
            {/* Glow blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4" />
                Start in under 60 seconds
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Ready to Dominate{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Local Search?
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
                Start with a free scan. Upgrade when you see the results.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all text-lg"
                >
                  Start Free - No Credit Card
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-xl border border-white/10 hover:bg-white/15 transition-all text-lg"
                >
                  View All Plans
                </Link>
              </div>
              <p className="text-gray-600 text-sm mt-6">
                30-day money-back guarantee · Cancel anytime · No contracts
              </p>
            </div>
          </div>
        </ScrollReveal>

      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Geothority. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
            <Link href="/faq" className="hover:text-gray-300 transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
