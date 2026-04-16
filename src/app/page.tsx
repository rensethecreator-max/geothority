"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Shield,
  Globe,
  Brain,
  Code,
  FileText,
  Eye,
  Zap,
  Star,
  Check,
  MapPin,
  BarChart3,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useState } from "react";

/* ───────────────── Data ───────────────── */

const features: {
  icon: React.ElementType;
  title: string;
  description: string;
  stat: string;
  image: string;
  note?: string;
  badge?: string;
}[] = [
  {
    icon: Shield,
    title: "See Your Complete Local SEO Picture in 90 Seconds",
    description:
      "Our 5-layer Trust Stack™ framework scores your Foundation, Trust Pages, Geo Content, Reviews, and AI Optimization. Know exactly what's holding you back — and what to fix first.",
    stat: "5 layers, 1 actionable score",
    image: "/cards/truststack.jpg",
  },
  {
    icon: MapPin,
    title: "Verify 18 Directories. Sync Across 50+ More.",
    description:
      "We directly verify your listings across Google, Yelp, Bing, Apple Maps, and 14 more directories. Then confirm and sync your presence across the Foursquare data network — covering Bing, Samsung, Uber, HERE Maps, and 50+ additional services.",
    stat: "68+ directories covered",
    note: "We directly verify 18 major directories. Plus verify your presence in the Foursquare data network covering 50+ additional services. That's 68+ directories covered.",
    image: "/cards/audit.jpg",
  },
  {
    icon: Brain,
    title: "We Don't Just Check if AI Recommends You — We Make It Happen.",
    description:
      "ChatGPT, Perplexity, and Google AI Overviews are replacing traditional search. We check if they mention your business — then generate the exact FAQ schema, entity-rich content, and structured markup that makes AI assistants recommend you.",
    stat: "3 AI platforms checked",
    badge: "Only on Geothority",
    image: "/cards/quickwin.jpg",
  },
  {
    icon: Code,
    title: "Fix Your Schema Markup in 60 Seconds",
    description:
      "Missing schema means Google can't understand your business. Our wizard generates valid JSON-LD in 3 clicks — no developer needed.",
    stat: "9 schema types supported",
    image: "/cards/ai-ready.jpg",
  },
  {
    icon: FileText,
    title: "AI-Powered Local Landing Pages",
    description:
      "Generate SEO-optimized, city-specific content with real local landmarks and entities. Streamed in real-time with a live typing experience.",
    stat: "1,200 words in 40 seconds",
    image: "/cards/content.jpg",
  },
  {
    icon: Eye,
    title: "Your Competitors Don't Sleep. Neither Do We.",
    description:
      "Weekly auto-scans track your Trust Stack score, monitor competitor moves, and email you when anything changes. We watch so you don't have to — and every scan links to a one-click Fix Everything action.",
    stat: "Weekly auto-monitoring",
    image: "/cards/watchdog.jpg",
  },
];

const testimonials = [
  {
    name: "Michael Torres",
    title: "Allstate Agent",
    city: "Tampa, FL",
    quote:
      "Went from page 3 to #2 on Google Maps in 6 weeks. Two new commercial accounts from organic last month alone.",
  },
  {
    name: "Sarah Chen",
    title: "Independent Agent",
    city: "Austin, TX",
    quote:
      "The Competitor Watchdog is insane. I saw my top competitor publish a new page and had a better one live within the hour.",
  },
  {
    name: "James Whitfield",
    title: "State Farm Agent",
    city: "Atlanta, GA",
    quote:
      "Canceled my $800/mo SEO agency after 3 months. Geothority does more and I actually understand what it's doing.",
  },
];

const stats = [
  { value: "500+", label: "Agents" },
  { value: "18", label: "Directories Checked" },
  { value: "90s", label: "Scan Time" },
  { value: "50+", label: "Listing Sync" },
];

const pricingTiers = [
  { name: "Free", price: 0, desc: "Local SEO basics" },
  { name: "Starter", price: 97, desc: "Individual agents" },
  { name: "Growth", price: 197, desc: "Most popular", highlighted: true },
  { name: "Authority", price: 297, desc: "Serious agencies" },
];

/* ───────────────── Components ───────────────── */

function BrowserFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-[#0f1117] overflow-hidden shadow-2xl shadow-emerald-500/5 ${className}`}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="ml-3 flex-1 h-5 rounded bg-white/5" />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ───────────────── Page ───────────────── */

export default function HomePage() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Geothority</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/compare/geothority-vs-brightlocal" className="text-sm text-gray-400 hover:text-white transition-colors">Compare</Link>
            <Link href="/for/insurance-agents" className="text-sm text-gray-400 hover:text-white transition-colors">Industries</Link>
            <Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-lg transition-all"
            >
              Get Free Scan
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] px-4 py-4 space-y-3">
            <Link href="#features" className="block text-sm text-gray-400" onClick={() => setMobileNav(false)}>Features</Link>
            <Link href="/pricing" className="block text-sm text-gray-400">Pricing</Link>
            <Link href="/faq" className="block text-sm text-gray-400">FAQ</Link>
            <Link href="/login" className="block text-sm text-gray-400">Sign In</Link>
            <Link href="/signup" className="block text-sm text-center font-medium bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg py-2">Get Free Scan</Link>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.08)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9zdmc+')] opacity-50" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
            Dominate Local Search
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              & AI
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            We scan your website, fix your listings, generate your content, and
            monitor your competitors — automatically.{" "}
            <span className="text-white font-medium">Free scan in 90 seconds.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Get Your Free Scan <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium border border-white/15 hover:border-white/30 rounded-xl transition-all text-center"
            >
              See How It Works
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <ScrollReveal animation="fade-up">
        <section className="py-20 bg-[#0f1117]/30">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-gray-400 mb-16">Three steps to local search dominance</p>

            <div className="grid sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">STEP 1</div>
                <h3 className="text-lg font-bold mb-2">We Scan</h3>
                <p className="text-sm text-gray-400">Enter your URL and we analyze your entire local SEO presence across 68+ directories and 3 AI platforms in 90 seconds.</p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">STEP 2</div>
                <h3 className="text-lg font-bold mb-2">We Fix</h3>
                <p className="text-sm text-gray-400">One click generates your missing schema, FAQ content, meta tags, and AI-optimized markup — and syncs your listings to 50+ directories automatically.</p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">STEP 3</div>
                <h3 className="text-lg font-bold mb-2">We Monitor</h3>
                <p className="text-sm text-gray-400">Weekly auto-scans track your progress, monitor competitors, and alert you to changes. We watch so you don&apos;t have to.</p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── Product Screenshot ─── */}
      <ScrollReveal animation="scale-up">
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <BrowserFrame>
            <div className="h-64 sm:h-80 bg-gradient-to-br from-emerald-900/30 via-[#0f1117] to-teal-900/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full border-4 border-emerald-500/30 flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    78
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Trust Stack™ Score</p>
                <div className="flex justify-center gap-3 mt-4">
                  {["Foundation", "Trust", "Geo", "Reviews", "AI"].map((l, i) => (
                    <div key={l} className="text-center">
                      <div
                        className="w-10 h-2 rounded-full mb-1"
                        style={{
                          background: `linear-gradient(to right, #10b981, #14b8a6)`,
                          opacity: 0.3 + i * 0.15,
                        }}
                      />
                      <span className="text-[10px] text-gray-500">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BrowserFrame>
          <p className="text-center text-sm text-gray-500 mt-4">
            Your Trust Stack™ Score tells you exactly what to fix and in what order
          </p>
        </section>
      </ScrollReveal>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-20">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Dominate Local Search
                </span>
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Six powerful tools working together to make you the default answer
                in Google and AI search.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-24 sm:space-y-32">
            {features.map((f, i) => {
              const isEven = i % 2 === 0;
              return (
                <ScrollReveal key={i} animation={isEven ? "slide-left" : "slide-right"}>
                  <div
                    className={`flex flex-col ${
                      isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                    } items-center gap-12 lg:gap-16`}
                  >
                    {/* Text */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <f.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        {f.badge && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">
                            {f.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                        {f.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed text-lg">
                        {f.description}
                      </p>
                      {f.note && (
                        <p className="text-xs text-gray-500 italic border-l-2 border-emerald-500/30 pl-3">
                          {f.note}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Zap className="w-4 h-4" />
                        <span>{f.stat}</span>
                      </div>
                    </div>

                    {/* Product Screenshot */}
                    <div className="flex-1 w-full">
                      <BrowserFrame>
                        <div className="relative h-48 sm:h-64 rounded-lg overflow-hidden">
                          <Image
                            src={f.image}
                            alt={f.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117]/60 to-transparent" />
                        </div>
                      </BrowserFrame>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 sm:py-28 bg-[#0f1117]/50">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal animation="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Trusted by Insurance Agents{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Across America
              </span>
            </h2>
            <p className="text-gray-400 text-center mb-16 text-lg">
              Here&apos;s what agents are saying about Geothority
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 120}>
                <div className="bg-[#0f1117] rounded-2xl border border-white/5 p-8 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-300 leading-relaxed flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {t.title}, {t.city}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <ScrollReveal animation="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-400 text-center mb-12 text-lg">
              Start free. Upgrade when you see the results.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-4 gap-4">
            {pricingTiers.map((t, i) => (
              <ScrollReveal key={i} animation="scale-up" delay={i * 100}>
                <div
                  className={`rounded-2xl p-6 text-center ${
                    t.highlighted
                      ? "bg-[#0f1117] border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 relative"
                      : "bg-[#0f1117] border border-white/5"
                  }`}
                >
                  {t.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
                      Most Popular
                    </div>
                  )}
                  <div className="text-sm text-gray-400 mb-2">{t.name}</div>
                  <div className="text-3xl font-bold mb-1">
                    {t.price === 0 ? (
                      "Free"
                    ) : (
                      <>
                        <span className="text-lg text-gray-500">$</span>
                        {t.price}
                        <span className="text-sm font-normal text-gray-500">
                          /mo
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-4">{t.desc}</div>
                  <Link
                    href={t.price === 0 ? "/signup" : "/pricing"}
                    className={`block text-sm font-medium py-2.5 rounded-lg transition-all ${
                      t.highlighted
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
                        : "border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {t.price === 0 ? "Start Free" : "See Details"}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
            >
              See Full Pricing & Feature Comparison <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-emerald-950/40 to-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal animation="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See Your Trust Stack Score in{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                90 Seconds
              </span>
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Free forever. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Get Your Free Scan <ArrowRight className="w-5 h-5" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <div className="space-y-2.5">
                <Link href="/pricing" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Pricing</Link>
                <Link href="/bundle" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Local Dominance Bundle</Link>
                <Link href="/citations" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Citation Checker</Link>
                <Link href="/ai-overview" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">AI Overview</Link>
                <Link href="/schema-generator" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Schema Generator</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Compare</h4>
              <div className="space-y-2.5">
                <Link href="/compare/geothority-vs-brightlocal" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">vs BrightLocal</Link>
                <Link href="/compare/geothority-vs-moz-local" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">vs Moz Local</Link>
                <Link href="/compare/geothority-vs-semrush" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">vs Semrush</Link>
                <Link href="/compare/geothority-vs-whitespark" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">vs Whitespark</Link>
                <Link href="/compare/geothority-vs-yext" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">vs Yext</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Industries</h4>
              <div className="space-y-2.5">
                <Link href="/for/insurance-agents" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Insurance Agents</Link>
                <Link href="/for/real-estate-agents" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Real Estate</Link>
                <Link href="/for/dentists" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Dentists</Link>
                <Link href="/for/lawyers" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Lawyers</Link>
                <Link href="/for/restaurants" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Restaurants</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Locations</h4>
              <div className="space-y-2.5">
                <Link href="/locations/chicago" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Chicago</Link>
                <Link href="/locations/austin" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Austin</Link>
                <Link href="/locations/tampa" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Tampa</Link>
                <Link href="/locations/atlanta" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Atlanta</Link>
                <Link href="/locations/dallas" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Dallas</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <div className="space-y-2.5">
                <Link href="/faq" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">FAQ</Link>
                <Link href="/privacy" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
                <Link href="/terms" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
              </div>
            </div>
          </div>

          {/* Our Products — cross-sell row */}
          <div className="border-t border-white/5 pt-8 mb-8">
            <h4 className="font-semibold text-sm mb-4 text-gray-400">Our Products</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://geothority.com"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Geothority</div>
                  <div className="text-xs text-gray-600">Local SEO Scanner &amp; Fixer</div>
                </div>
              </a>
              <a
                href="https://starcepta.com?ref=geothority"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Starcepta</div>
                  <div className="text-xs text-gray-600">Automated Review Collection</div>
                </div>
              </a>
              <a
                href="https://4minuteseo.com?ref=geothority"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">4MinuteSEO</div>
                  <div className="text-xs text-gray-600">SEO Campaign Automation</div>
                </div>
              </a>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-gray-500">
                © 2026 Geothority. All rights reserved.
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Dominate local search & AI — for insurance agents and local businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
