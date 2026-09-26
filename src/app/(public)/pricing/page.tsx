"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Shield, ArrowRight, Sparkles, ChevronDown, Building2, Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { PublicHeader } from "@/components/layout/public-header";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  purpose: string;
  features: string[];
  popular?: boolean;
}

// Prices mirror the existing billing definitions in src/lib/stripe.ts.
const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Find your starting point.",
    purpose: "For a first look at your business's online visibility.",
    features: [
      "Website scan and visibility score",
      "Findings grouped by area",
      "Prioritized next steps",
      "Saved scans to review later",
      "No payment card required",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 97,
    annualPrice: 970,
    description: "Keep your business information in view.",
    purpose: "For one business building a consistent local presence.",
    features: [
      "Everything in Free",
      "Google Business Profile connection",
      "Business listing checks",
      "Visibility and profile health tools",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 197,
    annualPrice: 1970,
    description: "Follow through on more opportunities.",
    purpose: "For owners ready to track competitors and improve local discovery.",
    popular: true,
    features: [
      "Everything in Starter",
      "AI visibility checks on supported sources",
      "Local competitor tracking",
      "Google Business Profile post tools",
      "Supported business listing sync",
      "Review request workflows and priority support",
    ],
  },
  {
    id: "authority",
    name: "Authority",
    monthlyPrice: 297,
    annualPrice: 2970,
    description: "Turn your findings into useful content.",
    purpose: "For businesses ready to build out service and local information.",
    features: [
      "Everything in Growth",
      "Local and service page drafts",
      "FAQ, about-page, and blog drafts",
      "Content briefs based on your business",
      "Reporting exports",
      "Dedicated onboarding call",
    ],
  },
];

const faqs = [
  {
    q: "What do I get for free?",
    a: "Create a free account, add your business details and website, and run a scan. You can review your visibility score, findings, and prioritized next steps without entering a payment card. Creating a free account does not start a paid subscription.",
  },
  {
    q: "How does the paid trial work?",
    a: "After signing up, choose a paid plan from Billing. Paid checkout includes a 14-day trial and asks for a payment card. Your chosen subscription starts billing automatically when the trial ends unless you cancel first. Review the amount and renewal date at checkout.",
  },
  {
    q: "Why would I keep a monthly subscription?",
    a: "Your first scan establishes a starting point. A subscription gives you continuing access to the tools in your plan so you can review changes, work through priorities, and follow up on new findings. Growth adds competitor and AI visibility checks; Authority adds content drafts you can review and publish. Connections and setup are required for connected services.",
  },
  {
    q: "Does Geothority make every change for me?",
    a: "Geothority prepares findings, recommendations, and supported actions. You confirm business details and approve customer-facing work. Direct publishing or updates depend on a supported, authorized connection. Other changes need to be applied in your website builder or passed to your website provider.",
  },
  {
    q: "Are there usage limits?",
    a: "Website scans currently allow up to 3 requests in a rolling 24-hour window per account, including paid accounts. Other tools can have separate limits and connection requirements. If a limit is reached, wait for earlier requests to leave that window before trying again. A higher plan unlocks tools; it does not remove every usage limit.",
  },
  {
    q: "How does annual billing work?",
    a: "Where available at checkout, annual billing is $970 for Starter, $1,970 for Growth, or $2,970 for Authority, paid for the year. That is the cost of 10 monthly payments. The monthly equivalents shown here are for comparison; annual billing is one annual payment.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Manage your subscription through Billing in your account. Cancellation keeps access through the current billing period. Review any plan-change amount and effective date before confirming. Refund eligibility is described in the Terms of Service.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Paid checkout accepts credit and debit cards through Stripe. The Free plan does not require a card.",
  },
];

const comparisonRows = [
  { label: "Website scan, score, and priorities", values: ["Included", "Included", "Included", "Included"] },
  { label: "Google Business Profile connection", values: ["—", "Included", "Included", "Included"] },
  { label: "AI visibility and competitor checks", values: ["—", "—", "Included", "Included"] },
  { label: "Supported listing sync and Google posts", values: ["—", "—", "Included", "Included"] },
  { label: "Local, service, and FAQ content drafts", values: ["—", "—", "—", "Included"] },
  { label: "Support", values: ["Self-service", "Email", "Priority", "Onboarding + priority"] },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const displayPrice = (plan: Plan) =>
    annual && plan.annualPrice > 0 ? (plan.annualPrice / 12).toFixed(2) : String(plan.monthlyPrice);

  return (
    <>
    <PublicHeader />
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.06] rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" /> Start with a free scan
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
              Find your gaps.<br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Choose your next step.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-5">
              Clear priorities for local businesses that want to be easier to find and choose.
              Start free, then choose the tools that fit the work you want to do.
            </p>
            <p className="text-sm text-gray-400 mb-8">Free account required. No card for your free scan. Paid plans are a separate choice.</p>
            <div className="inline-flex flex-wrap justify-center items-center gap-2 bg-[#0f1117] border border-white/10 rounded-2xl sm:rounded-full px-2 py-2" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"}`}>Monthly</button>
              <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"}`}>
                Annual <span className="bg-emerald-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">Save 2 months</span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative flex flex-col rounded-2xl p-6 border ${plan.popular ? "bg-[#0f1117] border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-[#0f1117] border-white/10"}`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold px-4 py-1.5 rounded-full"><Star className="w-3 h-3" /> For ongoing growth</span>
                  </div>
                )}
                <h2 className={`text-lg font-bold mb-2 pt-2 ${plan.popular ? "text-emerald-400" : "text-white"}`}>{plan.name}</h2>
                <p className="text-base font-medium text-gray-200 min-h-12">{plan.description}</p>
                <p className="text-sm text-gray-400 mt-2 mb-5 min-h-16">{plan.purpose}</p>
                <div className="mb-5">
                  <div className="flex items-end gap-1"><span className="text-4xl font-black">${displayPrice(plan)}</span><span className="text-gray-400 mb-1.5">/mo</span></div>
                  <p className="text-xs text-gray-400 mt-2 min-h-8">{plan.monthlyPrice === 0 ? "Free account. No payment card." : annual ? `$${plan.annualPrice.toLocaleString("en-US")} billed annually where available` : "Billed monthly after your trial"}</p>
                </div>
                <Link href={plan.id === "free" ? "/signup" : "/signup?redirect=%2Fbilling"} className={`w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-semibold text-sm mb-3 transition-colors ${plan.popular ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-white text-black hover:bg-gray-100"}`}>
                  {plan.id === "free" ? "Get my free scan" : "Create account to choose"}<ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
                <p className="text-xs text-gray-400 mb-6">{plan.id === "free" ? "Add your business and website after signup." : "14-day trial at paid checkout. Card required."}</p>
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />{feature}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-gray-400 max-w-4xl mx-auto text-center mb-16">
            Connected features require setup and authorization. Coverage depends on the available source and connection.
            Website scans currently allow 3 requests in a rolling 24-hour window per account on every plan. Content drafts need your review before use.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-7">What changes as you move up?</h2>
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <caption className="sr-only">Geothority plan features</caption>
                <thead><tr className="border-b border-white/10"><th scope="col" className="text-left p-5 text-gray-400">Tools for your next step</th>{plans.map((plan) => <th scope="col" key={plan.id} className="p-5 text-left">{plan.name}</th>)}</tr></thead>
                <tbody>{comparisonRows.map((row) => <tr key={row.label} className="border-b border-white/5 last:border-0"><th scope="row" className="text-left font-medium p-5 text-gray-300">{row.label}</th>{row.values.map((value, index) => <td key={plans[index].id} className="p-5 text-gray-400">{value}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="rounded-2xl border border-white/10 bg-[#0f1117] p-7">
              <Shield className="w-6 h-6 text-emerald-400 mb-4" />
              <h2 className="text-xl font-bold mb-3">You stay in control</h2>
              <p className="text-gray-400 leading-relaxed">Confirm your business details and review customer-facing content. Geothority can prepare work and use supported connections; website changes may need your website provider. Your subscription gives you tools and follow-through, with no promise of a particular ranking or number of leads.</p>
              <Link href="/service-facts" className="inline-flex items-center gap-2 text-emerald-400 mt-5 font-medium">See how the work is shared <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0f1117] p-7">
              <Building2 className="w-6 h-6 text-emerald-400 mb-4" />
              <h2 className="text-xl font-bold mb-3">More than one business or location?</h2>
              <p className="text-gray-400 leading-relaxed">The standard account is designed for one business. Contact us before signing up for multiple businesses, locations, team seats, white-label reports, or API access so we can confirm what your rollout requires.</p>
              <Link href="mailto:hello@geothority.io" className="inline-flex items-center gap-2 text-emerald-400 mt-5 font-medium">Discuss your setup <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-center mb-8">A few things to know before you start</h2>
            <div className="space-y-3">{faqs.map((faq) => (
              <details key={faq.q} className="group border border-white/10 rounded-xl bg-[#0f1117] overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none font-medium hover:text-emerald-400">{faq.q}<ChevronDown className="w-5 h-5 flex-shrink-0 text-gray-400 group-open:rotate-180" /></summary>
                <p className="px-5 pb-5 text-gray-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}</div>
            <p className="mt-5 text-sm text-gray-400">For subscription and refund terms, read our <Link href="/terms" className="text-emerald-400 underline underline-offset-4">Terms of Service</Link>.</p>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="text-center rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start by seeing what needs attention.</h2>
            <p className="text-lg text-gray-400 mb-7 max-w-xl mx-auto">Your free scan gives you a starting point and practical priorities. Choose a paid plan when you are ready for its tools.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-emerald-500 text-slate-950 font-semibold px-7 py-4 rounded-xl hover:bg-emerald-400">Check my business’s visibility <ArrowRight className="w-5 h-5" /></Link>
            <p className="text-gray-400 text-sm mt-5">Free account required. No card for the free scan.</p>
          </section>
        </ScrollReveal>
      </div>
      <footer className="relative border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Geothority. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-5"><Link href="/" className="hover:text-white">Home</Link><Link href="/faq" className="hover:text-white">FAQ</Link><Link href="/service-facts" className="hover:text-white">What You Get</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div>
        </div>
      </footer>
    </main>
    </>
  );
}
