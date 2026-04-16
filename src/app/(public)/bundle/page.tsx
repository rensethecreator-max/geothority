import { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Star,
  Zap,
  ArrowRight,
  Check,
  TrendingUp,
  Users,
  Globe,
  Brain,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Clock,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export const metadata: Metadata = {
  title: "Local Dominance Bundle — Geothority + Starcepta + 4MinuteSEO",
  description:
    "The complete local business growth platform. Scan your SEO, collect reviews, and automate your campaigns — all in one package. Save $96/mo.",
};

const geothorityFeatures = [
  "Trust Stack Score",
  "Citation Checker (68+ dirs)",
  "AI Overview (4 engines)",
  "Schema Generator",
  "Fix Everything button",
  "Weekly auto-scan",
];

const starceptaFeatures = [
  "One-Tap Review Templates",
  "SMS Feedback",
  "Negative Routing",
  "Review Analytics",
  "Square Integration",
];

const fourMinuteFeatures = [
  "Tiered Backlink Campaigns",
  "Blog Generator",
  "AI Citation Scanner",
  "Platform-Optimized Content",
  "Auto-Indexing",
];

const flywheelSteps = [
  {
    icon: Shield,
    color: "emerald",
    title: "Geothority Scans",
    desc: "Identify SEO weak spots, missing citations, schema errors, and trust gaps across 68+ directories.",
  },
  {
    icon: Zap,
    color: "blue",
    title: "4MinuteSEO Builds",
    desc: "Automated backlinks, AI-generated content, and topic clusters fill every gap Geothority finds.",
  },
  {
    icon: Star,
    color: "green",
    title: "Starcepta Collects",
    desc: "One-tap review templates turn real customers into a wall of 5-star social proof.",
  },
  {
    icon: TrendingUp,
    color: "emerald",
    title: "Geothority Monitors",
    desc: "Watch your Trust Stack score climb week over week as the flywheel compounds your authority.",
  },
];

const faqs = [
  {
    q: "Can I start with just one product?",
    a: "Yes — each product is available as a standalone subscription. Geothority starts at $97/mo, Starcepta at $49/mo, and 4MinuteSEO at $197/mo. The bundle saves you $96/mo when you use all three.",
  },
  {
    q: "Is there a free trial?",
    a: "Geothority offers a free scan so you can see exactly what's broken before you buy. We want you to see the value before committing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All plans are month-to-month with no lock-in contracts. Cancel anytime from your dashboard with one click.",
  },
  {
    q: "Do the products integrate with each other?",
    a: "They're designed to work together — Geothority's scan results feed directly into 4MinuteSEO's fix queue, and Starcepta's review data appears on your Geothority trust dashboard. One platform, zero friction.",
  },
  {
    q: "What if I already use one of the products?",
    a: "Contact us and we'll prorate the bundle price based on your existing subscription. You'll only pay the difference.",
  },
];

export default function BundlePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-teal-500/8 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-emerald-400 font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Save $96/mo — Limited Time Bundle Pricing
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
              The Complete Local Business
            </span>
            <br />
            <span className="text-white">Growth Platform</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop paying for 3 separate tools that don&apos;t talk to each other.
            Get Geothority, Starcepta, and 4MinuteSEO in one bundle — and save{" "}
            <span className="text-white font-semibold">$96 every month</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              Get the Bundle — $247/mo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-lg hover:bg-white/10 transition-all"
            >
              Or start with a free scan
            </Link>
          </div>

          {/* Social proof strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> No contracts
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Setup in minutes
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Save $1,152/year
            </span>
          </div>
        </div>
      </section>

      {/* ─── The Problem ──────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Running a local business is already hard enough.
            </h2>
            <p className="text-gray-400 text-lg mb-14 max-w-2xl mx-auto">
              Most agents juggle 3-4 different tools that don&apos;t talk to
              each other — wasting hours and leaving money on the table every
              week.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Globe,
                  color: "text-red-400",
                  bg: "bg-red-500/10 border-red-500/20",
                  title: "Can't be found in search",
                  desc: "Your competitors show up on Google Maps and AI overviews. You don't. Every month you miss is leads you'll never recover.",
                },
                {
                  icon: MessageSquare,
                  color: "text-orange-400",
                  bg: "bg-orange-500/10 border-orange-500/20",
                  title: "Not enough reviews",
                  desc: "Prospects see 3 reviews and move on. You know your customers are happy — you just can't get them to say so publicly.",
                },
                {
                  icon: Clock,
                  color: "text-yellow-400",
                  bg: "bg-yellow-500/10 border-yellow-500/20",
                  title: "No time for content",
                  desc: "Backlinks and blog posts build authority — but who has time? Your SEO sits stagnant while competitors pull ahead.",
                },
              ].map((pain) => (
                <div
                  key={pain.title}
                  className={`rounded-2xl border p-6 text-left ${pain.bg}`}
                >
                  <pain.icon className={`w-8 h-8 ${pain.color} mb-4`} />
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {pain.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {pain.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Three Products, One Platform ─────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Three products.{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  One platform.
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Each tool solves a different piece of the local growth puzzle.
                Together, they&apos;re unstoppable.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Geothority Card */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-7 flex flex-col">
                <div className="p-3 rounded-xl bg-emerald-500/15 w-fit mb-5">
                  <Shield className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
                  Geothority
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Local SEO Scanner & Fixer
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Trust Stack scoring, 68+ directory checks, AI visibility
                  monitoring, schema generation, content creation, listing sync.
                  We scan, fix, and monitor — automatically.
                </p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-500 mb-4">
                    Standalone:{" "}
                    <span className="text-white font-medium">$97/mo</span>
                  </div>
                  <ul className="space-y-2">
                    {geothorityFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Starcepta Card */}
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-7 flex flex-col">
                <div className="p-3 rounded-xl bg-green-500/15 w-fit mb-5">
                  <Star className="w-7 h-7 text-green-400" />
                </div>
                <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1">
                  Starcepta
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Automated Review Collection
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Turn every customer into a 5-star story. One-Tap Reviews let
                  customers leave a review in 3 seconds. Route negative feedback
                  privately before it hits the internet.
                </p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-500 mb-4">
                    Standalone:{" "}
                    <span className="text-white font-medium">$49/mo</span>
                  </div>
                  <ul className="space-y-2">
                    {starceptaFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4MinuteSEO Card */}
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-7 flex flex-col">
                <div className="p-3 rounded-xl bg-blue-500/15 w-fit mb-5">
                  <Zap className="w-7 h-7 text-blue-400" />
                </div>
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
                  4MinuteSEO
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  SEO Campaign Automation
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Automated backlink building, AI content generation, topic
                  clusters, and indexing. The engine that drives your local
                  authority on autopilot.
                </p>
                <div className="mt-auto">
                  <div className="text-sm text-gray-500 mb-4">
                    Standalone:{" "}
                    <span className="text-white font-medium">$197/mo</span>
                  </div>
                  <ul className="space-y-2">
                    {fourMinuteFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Flywheel ─────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How they work{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  together
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Each product feeds the next. The result is a compounding flywheel
                that grows your local authority month after month — automatically.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line on desktop */}
              <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-emerald-500/40 via-blue-500/40 to-emerald-500/40" />

              <div className="space-y-6">
                {flywheelSteps.map((step, idx) => {
                  const isLeft = idx % 2 === 0;
                  const colorMap: Record<string, string> = {
                    emerald:
                      "border-emerald-500/30 bg-emerald-500/8 text-emerald-400",
                    blue: "border-blue-500/30 bg-blue-500/8 text-blue-400",
                    green: "border-green-500/30 bg-green-500/8 text-green-400",
                  };
                  const iconColor: Record<string, string> = {
                    emerald: "text-emerald-400",
                    blue: "text-blue-400",
                    green: "text-green-400",
                  };
                  return (
                    <div
                      key={step.title}
                      className={`flex items-center gap-6 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
                    >
                      <div className="flex-1 rounded-2xl border p-6 bg-white/3 border-white/10 hover:bg-white/5 transition-colors">
                        <div
                          className={`inline-flex items-center gap-2 text-sm font-semibold mb-2 ${iconColor[step.color]}`}
                        >
                          <step.icon className="w-4 h-4" />
                          Step {idx + 1}
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">
                          {step.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                      {/* Center node */}
                      <div
                        className={`hidden md:flex w-12 h-12 rounded-full border-2 items-center justify-center shrink-0 ${colorMap[step.color]}`}
                      >
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 hidden md:block" />
                    </div>
                  );
                })}
              </div>

              {/* Cycle indicator */}
              <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Cycle repeats — compounding your local authority month after month
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Bundle Pricing ───────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                One price.{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Everything included.
                </span>
              </h2>
              <p className="text-gray-400 text-lg">
                Stop paying separately. Start growing together.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-stretch">
              {/* Buy separately */}
              <div className="rounded-2xl border border-white/10 bg-white/3 p-8">
                <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-4">
                  Buy Separately
                </div>
                <div className="text-4xl font-bold text-white mb-1">
                  $343
                  <span className="text-xl font-normal text-gray-400">/mo</span>
                </div>
                <p className="text-gray-500 text-sm mb-8">
                  Three disconnected tools, three separate bills
                </p>

                <ul className="space-y-3">
                  {[
                    { label: "Geothority", price: "$97/mo" },
                    { label: "Starcepta", price: "$49/mo" },
                    { label: "4MinuteSEO", price: "$197/mo" },
                    { label: "No integration", price: "—" },
                    { label: "No unified dashboard", price: "—" },
                  ].map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between text-sm border-b border-white/5 pb-3"
                    >
                      <span className="text-gray-400">{row.label}</span>
                      <span className="text-gray-500 font-mono">{row.price}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bundle */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-8 relative overflow-hidden">
                {/* Best value badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider">
                  Best Value
                </div>

                <div className="text-sm text-emerald-400 uppercase tracking-widest font-semibold mb-4">
                  Local Dominance Bundle
                </div>
                <div className="text-4xl font-bold text-white mb-1">
                  $247
                  <span className="text-xl font-normal text-gray-400">/mo</span>
                </div>
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-emerald-400 text-sm font-medium">
                    Save $96/mo · $1,152/year
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    { label: "Geothority", price: "✓ Included" },
                    { label: "Starcepta", price: "✓ Included" },
                    { label: "4MinuteSEO", price: "✓ Included" },
                    { label: "Native integration", price: "✓ Included" },
                    { label: "Unified dashboard", price: "✓ Included" },
                  ].map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between text-sm border-b border-white/5 pb-3"
                    >
                      <span className="text-gray-300">{row.label}</span>
                      <span className="text-emerald-400 font-medium">
                        {row.price}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#"
                  className="block w-full text-center py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 mb-4"
                >
                  Get the Bundle — $247/mo
                </Link>

                {/* Annual upsell */}
                <div className="text-center text-sm text-gray-400">
                  Or save even more —{" "}
                  <span className="text-white font-medium">$197/mo</span>{" "}
                  billed annually
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Who Is This For? ─────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for local businesses{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  that mean business
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                If ranking #1 in your market matters, this bundle was made for
                you.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  emoji: "🏦",
                  title: "Insurance Agents",
                  desc: "Dominate your local market before the big national carriers crowd you out. Own the map pack, own the reviews, own the search.",
                },
                {
                  icon: Users,
                  emoji: "🏠",
                  title: "Real Estate Agents",
                  desc: "Competing in crowded cities? Your Trust Stack score is the difference between being found and being invisible to every buyer searching online.",
                },
                {
                  icon: Globe,
                  emoji: "🏪",
                  title: "Any Local Business",
                  desc: "Restaurants, contractors, dentists, lawyers — if your customers search locally before they buy, this bundle builds the authority that wins them.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/8 bg-white/3 p-7 hover:bg-white/5 transition-colors"
                >
                  <div className="text-3xl mb-4">{card.emoji}</div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently asked questions
              </h2>
              <p className="text-gray-400">
                Still on the fence? Here&apos;s what most people ask first.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">
                        {faq.q}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center relative">
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium mb-8">
                <AlertCircle className="w-4 h-4" />
                Start with zero risk — free scan, no credit card
              </div>

              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                Ready to Dominate Your{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
                  Local Market?
                </span>
              </h2>

              <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Start with a free Geothority scan. See exactly what&apos;s
                broken, what you&apos;re missing, and how far behind your
                competitors you are — before you spend a dollar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  Get the Bundle — $247/mo
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-lg hover:bg-white/10 transition-all"
                >
                  Start Free Scan
                </Link>
              </div>

              <p className="mt-6 text-gray-600 text-sm">
                No credit card required for the free scan. Cancel bundle anytime.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
