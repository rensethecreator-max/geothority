"use client";

import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/public-header";
import { WillChatbot } from "@/components/chat/will-chatbot";
import {
  Search, BarChart3, FileText, Eye, Zap, ArrowRight, Star, Shield, Bot,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Search,
    title: "90-Second Website Audit",
    description: "Enter your URL and instantly see your Local Trust Stack™ — a 5-layer analysis showing exactly where you're invisible in search and AI.",
    image: "/cards/audit.jpg",
    result: "See your exact score in under 2 minutes",
  },
  {
    icon: Zap,
    title: "Quick Win Cards",
    description: "Get the single highest-impact fix with copy-pasteable code and content. No developer needed — just Copy & Go.",
    image: "/cards/quickwin.jpg",
    result: "First quick win implementable in 5 minutes",
  },
  {
    icon: FileText,
    title: "AI Content Generator",
    description: "Generate SEO-optimized city/service landing pages with local landmarks, trust signals, and schema markup. 800-1200 words in seconds.",
    image: "/cards/content.jpg",
    result: "Publish a new ranking page in under 10 minutes",
  },
  {
    icon: Eye,
    title: "Competitor Watchdog",
    description: "Track what your competitors are doing — new pages, review bursts, rank changes. Hit 'Match This' to instantly counter their moves.",
    image: "/cards/watchdog.jpg",
    result: "Never get outmaneuvered by a competitor again",
  },
  {
    icon: BarChart3,
    title: "Local Trust Stack™",
    description: "Our proprietary 5-layer framework scores your Foundation, Trust Pages, Geo Content, Reviews, and AI Optimization from 0-100.",
    image: "/cards/truststack.jpg",
    result: "Know exactly what to fix and in what order",
  },
  {
    icon: Bot,
    title: "AI-Ready Optimization",
    description: "Schema markup, entity density, FAQ schema — everything you need so AI assistants recommend you, not your competitor.",
    image: "/cards/ai-ready.jpg",
    result: "Get cited in ChatGPT, Perplexity & Google AI Overviews",
  },
];

const testimonials = [
  {
    name: "Beta User",
    title: "Independent Insurance Agent",
    quote: "We're in early access. Be one of our first agents and share your story — founding users get 3 months free.",
    rating: 5,
    isCTA: true,
  },
  {
    name: "Join the Waitlist",
    title: "Get Early Access",
    quote: "Geothority is built specifically for independent insurance agents who are tired of being outranked. Get in early and help shape the product.",
    rating: 5,
    isCTA: true,
  },
  {
    name: "Founding Agent Program",
    title: "3 Months Free · Limited Spots",
    quote: "First 50 agents get founding pricing locked in forever. We build the features you need. You get results you can measure.",
    rating: 5,
    isCTA: true,
  },
];

const trustStackLayers = [
  { num: 1, name: "Foundation", desc: "NAP/GBP Consistency", color: "#EF4444" },
  { num: 2, name: "Trust Pages", desc: "About, Service Areas, FAQ", color: "#F59E0B" },
  { num: 3, name: "Geo Content", desc: "City/Service Landing Pages", color: "#F59E0B" },
  { num: 4, name: "Reviews", desc: "Velocity, Recency, Response", color: "#10B981" },
  { num: 5, name: "AI Optimization", desc: "Schema, Entities, GEO", color: "#3B82F6" },
];

function FlipCard({ feature }: { feature: typeof features[0] }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="group relative h-72 cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-full transition-all duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col hover:border-electric-500/50 transition-colors"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-11 h-11 rounded-xl bg-electric-500/10 flex items-center justify-center mb-4">
            <feature.icon className="w-5 h-5 text-electric-500" />
          </div>
          <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed flex-1">{feature.description}</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-electric-400 font-medium">
            <span>See it in action</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-electric-500/50"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white font-semibold text-sm leading-snug">{feature.result}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-electric-500/10 text-electric-400 rounded-full text-sm font-medium mb-6 border border-electric-500/20">
            <Shield className="w-4 h-4" />
            Built exclusively for independent insurance agents
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Discover Why You&apos;re{" "}
            <span className="text-electric-500">Invisible</span> in Local Search
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto mb-8 leading-relaxed">
            Stop burning money on Google Ads. Geothority scans your website in 90 seconds and shows exactly what&apos;s missing — then generates the trust signals, content, and optimizations that make you the default local answer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-electric-500/25"
            >
              Scan Your Website Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl text-lg font-medium transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Free scan — no credit card required</p>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto border-t border-[var(--border)] pt-12">
            {[
              { num: "90s", label: "to your first scan" },
              { num: "5-layer", label: "Trust Stack™ analysis" },
              { num: "3x", label: "avg organic lead increase" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-electric-500">{s.num}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Stack Explainer */}
      <section id="features" className="py-20 px-4 bg-[var(--card)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">The Local Trust Stack™</h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Our proprietary 5-layer framework reveals exactly where your agency is weak — and what to fix first.
            </p>
          </div>
          <div className="space-y-3 max-w-2xl mx-auto">
            {trustStackLayers.map((layer) => (
              <div key={layer.num} className="flex items-center gap-4 bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: layer.color }}>
                  L{layer.num}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{layer.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{layer.desc}</div>
                </div>
                <div className="h-3 flex-1 max-w-[200px] bg-[var(--muted)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: layer.color, width: `${30 + layer.num * 12}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Flip Cards */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Dominate Local Search</h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto mb-2">
              From audit to action — we find the gaps and fill them for you.
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Hover each card to see the end result</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {features.map((feature) => (
              <FlipCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-[var(--card)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Agents Are Getting Results</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)]">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-[var(--foreground)] mb-4 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Become the Default Local Answer?</h2>
          <p className="text-[var(--muted-foreground)] mb-8 text-lg">Your competitors already know what&apos;s wrong with your website. Shouldn&apos;t you?</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-electric-500 hover:bg-electric-600 text-white rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-electric-500/25">
            Scan Your Website Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">No credit card · Takes 90 seconds</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Geothority" className="h-8 w-auto object-contain" />
              <span className="font-semibold">Geothority</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
              <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
              <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</Link>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} Geothority. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <WillChatbot />
    </div>
  );
}
