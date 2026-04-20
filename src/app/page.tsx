"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Brain,
  Code,
  FileText,
  Eye,
  Star,
  MapPin,
  Menu,
  X,
  Radar,
  ScanSearch,
  TrendingUp,
  Waypoints,
  ChevronRight,
  Zap,
  Bot,
  Wand2,
  Play,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { GeoTooltip } from "@/components/ui/geo-tooltip";
import { LayerInfoTooltip } from "@/components/ui/info-tooltip";
import { Logo } from "@/components/ui/logo";
import { AnimatedHero } from "@/components/home/animated-hero";

/* ───────────────── Animated Hero Video Component ───────────────── */

function HeroVideoLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentClip, setCurrentClip] = useState(0);

  const clips = [
    "/hero/scan-fix-monitor.mp4",
    "/hero/fix.mp4",
    "/hero/monitor.mp4",
    "/hero/ai-visibility.mp4",
    "/hero/content-engine.mp4",
  ];

  const handleClipEnd = () => {
    const next = (currentClip + 1) % clips.length;
    setCurrentClip(next);
    setVideoLoaded(false);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [currentClip]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#09111c] border border-white/10 shadow-[0_30px_120px_rgba(6,12,24,0.55)]">
      {/* Fallback gradient while video loads */}
      {!videoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-[#09111c] to-blue-500/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Radar className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-sm text-white/40">Loading demo...</div>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        onEnded={handleClipEnd}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
      >
        <source src={clips[currentClip]} type="video/mp4" />
      </video>
      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09111c] via-transparent to-transparent opacity-60" />
      {/* Bottom overlay with score animation */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Live Scan</div>
            <div className="text-white font-semibold text-lg">Trust Stack Score: <span className="text-emerald-400">78/100</span></div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto-monitoring active
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Animated Score Counter ───────────────── */

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}</span>;
}

/* ───────────────── Data ───────────────── */

const features: {
  icon: React.ElementType;
  title: string;
  description: string;
  theirWay: string;
  ourWay: string;
  stat: string;
  image: string;
  video?: string;
  note?: string;
  badge?: string;
  statTip?: string;
}[] = [
  {
    icon: Shield,
    title: "We Don't Just Show Problems — We Fix Them Automatically",
    description:
      "Other tools show you 47 issues and say \"fix these.\" Geothority shows you your #1 quick win and handles it with one click. Schema missing? Fixed. NAP inconsistent? Synced. No developer, no agency, no waiting.",
    theirWay: "Here are your issues. Fix them yourself.",
    ourWay: "Fix Automatically — one click, done.",
    stat: "1 click to fix most issues",
    badge: "Only on Geothority",
    image: "/cards/truststack.jpg",
    video: "/hero/scan-fix-monitor.mp4",
    statTip: "Most SEO tools just list problems. We actually fix them — automatically or with a single click. That's the difference between a report and a solution.",
  },
  {
    icon: MapPin,
    title: "68+ Directories Verified and Synced — Automatically",
    description:
      "We check your listings across Google, Yelp, Bing, Apple Maps, and 14 more directories. When we find inconsistencies, we don't just flag them — we push your correct info across 50+ services via the Foursquare network.",
    theirWay: "Your listings are inconsistent. Good luck fixing them.",
    ourWay: "Inconsistencies found. Push correct NAP now?",
    stat: "68+ directories covered",
    image: "/cards/audit.jpg",
    video: "/hero/fix.mp4",
    statTip: "Inconsistent listings confuse Google and hurt your rankings. We verify AND sync — most tools only verify.",
  },
  {
    icon: Brain,
    title: "AI Assistants Don't Recommend You? We Make Them.",
    description:
      "ChatGPT, Perplexity, and Google AI are replacing traditional search. We check if they mention your business — then we generate the exact FAQ schema, entity-rich content, and structured markup that makes AI assistants recommend you.",
    theirWay: "Track your AI visibility score.",
    ourWay: "Generate the content that makes AI recommend you.",
    stat: "3 AI platforms optimized",
    badge: "Only on Geothority",
    image: "/cards/quickwin.jpg",
    video: "/hero/ai-visibility.mp4",
    statTip: "Tracking your AI score is nice. Generating the content that improves it is better. We do both.",
  },
  {
    icon: Code,
    title: "Schema Generated and Deployed in 60 Seconds",
    description:
      "Missing schema means Google can't understand your business. Other tools tell you it's missing. Our wizard generates valid JSON-LD for 9 business types in 3 clicks — and we can deploy it for you.",
    theirWay: "Schema missing. Add it manually.",
    ourWay: "Schema generated. Deploy it now?",
    stat: "9 schema types, 3 clicks",
    image: "/cards/ai-ready.jpg",
    statTip: "Schema is the code that tells Google what your business does. Without it, you're invisible in rich results and AI answers. We generate AND deploy it.",
  },
  {
    icon: FileText,
    title: "City Pages Written by AI, Optimized by Data",
    description:
      "We don't just generate content — we generate the RIGHT content. Our Content Adaptation Engine analyzes your visibility gaps and writes city-specific pages targeting the exact keywords and locations where you're losing ground.",
    theirWay: "Write more content. Maybe it'll rank.",
    ourWay: "Here's what to write, where, and why — generated and ready to publish.",
    stat: "1,200 words in 40 seconds",
    image: "/cards/content.jpg",
    video: "/hero/content-engine.mp4",
    statTip: "Generic AI content doesn't rank. Our engine writes city-specific pages with real local landmarks and entities — content that Google and AI assistants trust.",
  },
  {
    icon: Eye,
    title: "Competitors Make a Move? We Counter Automatically.",
    description:
      "Weekly auto-scans track competitor changes — new photos, new reviews, new pages. When they gain ground, we don't just email you an alert. We generate the counter-move: a new page, a review push, a schema update. You approve or we auto-execute.",
    theirWay: "Your competitor added 4 photos. Just so you know.",
    ourWay: "Competitor gained on reviews. Counter-move ready — approve to deploy.",
    stat: "Auto-countermove generated",
    badge: "Only on Geothority",
    image: "/cards/watchdog.jpg",
    video: "/hero/monitor.mp4",
    statTip: "Alerts without actions are just noise. Every competitor alert comes with a recommended counter-move ready to deploy.",
  },
];

const testimonials = [
  {
    name: "Michael Torres",
    title: "Allstate Agent",
    city: "Tampa, FL",
    metric: "Map Pack #8 → #2",
    impact: "+2 commercial policies in 30 days",
    quote:
      "Went from page 3 to #2 on Google Maps in 6 weeks. Two new commercial accounts from organic last month alone.",
  },
  {
    name: "Sarah Chen",
    title: "Independent Agent",
    city: "Austin, TX",
    metric: "Response speed under 1 hour",
    impact: "Out-shipped her top competitor the same day",
    quote:
      "The Competitor Watchdog is insane. I saw my top competitor publish a new page and had a better one live within the hour.",
  },
  {
    name: "James Whitfield",
    title: "State Farm Agent",
    city: "Atlanta, GA",
    metric: "$800/mo agency replaced",
    impact: "Clearer visibility with lower spend",
    quote:
      "Canceled my $800/mo SEO agency after 3 months. Geothority does more and I actually understand what it's doing.",
  },
];

const stats = [
  { value: "500+", label: "Insurance professionals" },
  { value: "68+", label: "Authority signals mapped" },
  { value: "90s", label: "Time to first scan" },
  { value: "3", label: "AI platforms optimized" },
];

const pricingTiers = [
  { name: "Free", price: 0, desc: "See your authority gaps", tip: "Get your free Trust Stack scan and see where you stand. No credit card needed — just clarity." },
  { name: "Starter", price: 97, desc: "Best for individual agents", tip: "One business location fully managed: scans, fixes, schema, content, and weekly monitoring." },
  { name: "Growth", price: 197, desc: "Most popular", highlighted: true, tip: "Everything in Starter plus competitor tracking, AI optimization, priority support, and unlimited content generation." },
  { name: "Authority", price: 297, desc: "Multi-location control", tip: "Manage 2+ locations from one dashboard. Agency-grade tools with volume pricing for businesses with multiple locations." },
];

const commandMetrics = [
  { label: "Trust Stack", value: "78", detail: "+14 this month", tip: "Your composite Trust Stack score across all 5 authority layers. Higher means more trust signals working for you in local search." },
  { label: "AI recommendations", value: "3/3", detail: "ChatGPT, Perplexity, Google", tip: "You are recommended by all 3 major AI assistants when customers ask about your services. This is the new frontier of local search." },
  { label: "Competitor delta", value: "+22", detail: "ahead of local median", tip: "You are 22 points ahead of the average competitor in your market area. A positive delta means you are winning the authority game." },
];

const authoritySectors = [
  { name: "Northwest", score: 84, status: "Owned", tip: "Your visibility strength in the northwest area of your market — listings, content, and review coverage combined." },
  { name: "Central", score: 71, status: "Contested", tip: "The central core of your market where competition is fiercest. Contested means competitors are actively challenging your position." },
  { name: "South", score: 63, status: "Exposed", tip: "Your southern market area has gaps. Exposed means competitors outperform you here." },
  { name: "AI Recommendations", score: 88, status: "Advancing", tip: "Whether AI assistants like ChatGPT and Perplexity recommend your business. Advancing means you are gaining ground." },
];

/* ───────────────── Versus Card Component ───────────────── */

function VersusCard({ theirWay, ourWay }: { theirWay: string; ourWay: string }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-red-400/70 mb-1.5">Other tools</div>
        <div className="text-sm text-white/55">{theirWay}</div>
      </div>
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/8 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80 mb-1.5 flex items-center gap-1">
          <Wand2 className="w-3 h-3" /> Geothority
        </div>
        <div className="text-sm text-white font-medium">{ourWay}</div>
      </div>
    </div>
  );
}

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
      className={`geo-panel rounded-[28px] overflow-hidden shadow-[0_30px_120px_rgba(6,12,24,0.55)] ${className}`}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-300/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-300/60" />
        <div className="ml-3 flex-1 h-5 rounded-full bg-white/5" />
      </div>
      <div className="p-6 sm:p-7">{children}</div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8ddccb]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#7ce6c7] shadow-[0_0_16px_rgba(124,230,199,0.7)]" />
      {children}
    </div>
  );
}

function SignalChip({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="group/chip rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-colors hover:border-white/16 hover:bg-white/[0.05]">
      <div className="flex items-center gap-1.5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</div>
        {tip && <GeoTooltip tip={tip} side="top" iconClassName="w-3 h-3 opacity-40 group-hover/chip:opacity-80 transition-opacity" />}
      </div>
      <div className="mt-1 text-sm font-medium text-white/90">{value}</div>
    </div>
  );
}

function CommandSurface() {
  return (
    <div className="geo-command-surface geo-surface-ambient relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1322]/92 p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 geo-territory-grid opacity-55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(92,230,186,0.18),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(143,148,255,0.16),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(75,132,255,0.12),transparent_30%)]" />
      <div className="pointer-events-none absolute left-6 top-6 text-[10px] uppercase tracking-[0.34em] text-white/15">Live</div>
      <div className="pointer-events-none absolute bottom-6 right-6 text-[10px] uppercase tracking-[0.34em] text-white/15">Active</div>

      <div className="relative mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/36">Dashboard</div>
          <div className="mt-1 text-lg font-semibold text-white">Your local SEO, at a glance</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#7ce6c7]/25 bg-[#7ce6c7]/10 px-3 py-1 text-xs font-medium text-[#9be8d2] geo-breathe">
          Live
        </div>
      </div>

      <div className="relative grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Trust Stack</div>
              <div className="mt-1 text-sm text-white/75">Score by layer</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
              <Waypoints className="h-3.5 w-3.5 text-[#7ce6c7]" />
              Synced
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {[
              ["Foundation", 61, 1],
              ["Trust", 74, 2],
              ["Geo", 82, 3],
              ["Reviews", 79, 4],
              ["AI", 88, 5],
            ].map(([label, score, layer]) => (
              <div key={label as string} className="group/layer rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-white/14 hover:bg-white/[0.06]">
                <div className="mx-auto mb-3 h-20 w-2 rounded-full bg-white/8">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-[#5ce6ba] via-[#85ead3] to-[#d6fff3] geo-signal-pulse"
                    style={{ height: `${score}%`, marginTop: `${100 - Number(score)}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
                  <LayerInfoTooltip layerNum={layer as number} side="top" />
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{score}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="geo-radar-shell rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Authority sectors</div>
              <div className="mt-1 text-sm text-white/68">A map-like view of where your visibility holds and where it breaks.</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Map</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="geo-radar-grid relative mx-auto aspect-square w-full max-w-[220px] rounded-full border border-white/10 hidden sm:block">
              <div className="absolute inset-[12%] rounded-full border border-white/10" />
              <div className="absolute inset-[24%] rounded-full border border-white/10" />
              <div className="absolute inset-[36%] rounded-full border border-white/10" />
              <div className="absolute inset-x-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-white/10" />
              <div className="absolute inset-y-1/2 left-3 right-3 h-px -translate-y-1/2 bg-white/10" />
              <div className="absolute left-1/2 top-[16%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#7ce6c7] shadow-[0_0_18px_rgba(124,230,199,0.8)] geo-breathe" />
              <div className="absolute right-[18%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#8f94ff] shadow-[0_0_18px_rgba(143,148,255,0.65)] geo-breathe" />
              <div className="absolute bottom-[18%] left-[36%] h-2.5 w-2.5 rounded-full bg-[#7ce6c7] shadow-[0_0_18px_rgba(124,230,199,0.55)]" />
              <div className="absolute left-[18%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#ffb86d] shadow-[0_0_18px_rgba(255,184,109,0.45)]" />
              <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full">
                <path d="M110 38 L169 110 L110 164 L54 110 Z" fill="rgba(124,230,199,0.12)" stroke="rgba(124,230,199,0.7)" strokeWidth="2" />
              </svg>
            </div>

            <div className="space-y-3">
              {authoritySectors.map((sector) => (
                <div key={sector.name} className="group/sector rounded-2xl border border-white/8 bg-black/20 px-4 py-3 transition-colors hover:border-white/14">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium text-white">{sector.name}</div>
                        <GeoTooltip tip={sector.tip} side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{sector.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">{sector.score}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">sector score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {commandMetrics.map((metric) => (
              <div key={metric.label} className="group/metric rounded-[22px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-white/14 hover:bg-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{metric.label}</div>
                  <GeoTooltip tip={metric.tip} side="right" iconClassName="w-3 h-3" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">{metric.value}</div>
                <div className="mt-1 text-sm text-white/55">{metric.detail}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-3 flex items-center justify-between text-sm text-white/70">
              <span className="flex items-center gap-1.5">Competitor activity <GeoTooltip tip="Tracks how your local visibility has changed relative to competitors over the past 30 days." side="right" iconClassName="w-3 h-3" /></span>
              <span className="flex items-center gap-1 rounded-full bg-[#7ce6c7]/10 px-2.5 py-1 text-xs text-[#9be8d2]">+12% visibility <GeoTooltip tip="Your overall local search visibility improved 12% this month — more calls, more clicks, more customers finding you." side="bottom" iconClassName="w-2.5 h-2.5" /></span>
            </div>
            <div className="relative h-24 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/10" />
              <div className="absolute left-3 top-3 text-[9px] uppercase tracking-[0.28em] text-white/22">30 day slope</div>
              <svg viewBox="0 0 260 80" className="h-full w-full">
                <path d="M8 62 C40 58, 52 50, 78 52 S125 64, 150 42 S192 16, 252 18" fill="none" stroke="url(#geoTrend)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="252" cy="18" r="4" fill="#8f94ff" className="geo-breathe" />
                <defs>
                  <linearGradient id="geoTrend" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5ce6ba" />
                    <stop offset="100%" stopColor="#8f94ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
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
          <Logo href="/" size={32} className="text-white" />

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
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] px-4 py-4 space-y-1">
            <Link href="#features" className="block text-base py-3 text-gray-400" onClick={() => setMobileNav(false)}>Features</Link>
            <Link href="/pricing" className="block text-base py-3 text-gray-400">Pricing</Link>
            <Link href="/faq" className="block text-base py-3 text-gray-400">FAQ</Link>
            <Link href="/login" className="block text-base py-3 text-gray-400">Sign In</Link>
            <Link href="/signup" className="block text-base text-center font-medium bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg py-3 mt-2">Get Free Scan</Link>
          </div>
        )}
      </nav>

      {/* ─── Hero with Animated Video ─── */}
      <section className="geo-hero relative overflow-hidden pt-28 pb-16 sm:pt-40 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(92,230,186,0.14),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(110,116,255,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-0 geo-territory-grid opacity-40" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <SectionEyebrow>Local SEO, automated</SectionEyebrow>

            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4rem] xl:text-[4.6rem]">
              Other tools show you problems. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5ce6ba] to-[#77d9ca]">We fix them.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
              Geothority scans your local presence, finds what&apos;s broken, and handles the fixes — automatically or with one click. <span className="font-medium text-white">Your first scan is free and ready in 90 seconds.</span>
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5ce6ba] to-[#77d9ca] px-7 py-4 text-base font-semibold text-[#071019] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_45px_rgba(92,230,186,0.22)]"
              >
                Get Your Free Scan <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#story"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-7 py-4 text-base font-medium text-white/85 transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                <Play className="h-4 w-4" /> See how it works
              </Link>
            </div>

            <div className="mt-8 hidden sm:grid gap-3 grid-cols-3 max-w-2xl">
              <SignalChip label="Issues fixed automatically" value="80%+" tip="4 out of 5 common local SEO issues can be fixed automatically by Geothority — no developer needed." />
              <SignalChip label="Time to first fix" value="60s" tip="From finding the issue to fixing it: about 60 seconds. Other tools just list problems." />
              <SignalChip label="AI platforms optimized" value="3" tip="We make sure ChatGPT, Perplexity, and Google AI Overviews recommend your business." />
            </div>

            <div className="mt-8 grid gap-2 grid-cols-2 sm:hidden">
              <SignalChip label="Auto-fixed" value="80%+" tip="4 out of 5 issues fixed automatically." />
              <SignalChip label="Time to fix" value="60s" tip="From issue to fix in about a minute." />
            </div>
          </div>

          <div className="relative">
            <AnimatedHero />
          </div>
        </div>
      </section>

      {/* ─── Quick flow: 3 steps ─── */}
      <ScrollReveal animation="fade-up">
        <section className="py-10 sm:py-14 bg-[#0f1117]/25">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'We scan',
                  copy: 'Your entire local presence — Google, 68+ directories, AI mentions, competitor moves — in about 90 seconds.',
                },
                {
                  step: '02',
                  title: 'We fix',
                  copy: 'One-click fixes for schema, NAP sync, content generation. Or set it to auto-fix and we handle everything.',
                },
                {
                  step: '03',
                  title: 'We monitor',
                  copy: 'Weekly scans, competitor alerts with counter-moves ready to deploy, and email alerts when anything changes.',
                },
              ].map((item) => (
                <div key={item.step} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#8ddccb]">Step {item.step}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── Features: Problem → Auto-Fix ─── */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal animation="fade-up">
            <div className="mb-16 max-w-3xl">
              <SectionEyebrow>What makes us different</SectionEyebrow>
              <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Every other tool shows problems. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5ce6ba] to-[#8f94ff]">We solve them.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
                SEO tools have been doing the same thing for a decade: scan, report, and leave you to figure it out. Geothority is different — we fix things for you.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-10">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const reverse = index % 2 === 1;
              return (
                <ScrollReveal key={feature.title} animation={reverse ? "slide-right" : "slide-left"}>
                  <div className={`grid gap-6 lg:grid-cols-[1fr_1fr] ${reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
                    <div className="geo-feature-shell rounded-[30px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        {feature.badge && (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
                        {feature.title}
                      </h3>
                      <p className="mt-4 text-base leading-7 text-white/60">
                        {feature.description}
                      </p>
                      <VersusCard theirWay={feature.theirWay} ourWay={feature.ourWay} />
                    </div>

                    <BrowserFrame className="h-full">
                      <div className="relative h-full min-h-[280px] overflow-hidden rounded-[24px] border border-white/8 bg-[#09111a]">
                        {feature.video ? (
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover opacity-52 scale-[1.02] [filter:brightness(0.58)_contrast(1.14)_saturate(0.9)]"
                          >
                            <source src={feature.video} type="video/mp4" />
                          </video>
                        ) : (
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            className="object-cover opacity-78"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        )}
                        <div
                          className={feature.video
                            ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,20,0.30),rgba(5,10,20,0.58)_42%,rgba(5,10,20,0.88))]"
                            : "absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,24,0.15),rgba(8,14,24,0.86))]"
                          }
                        />
                        <div className="absolute inset-x-0 bottom-0 p-6">
                          <div className={feature.video
                            ? "max-w-md rounded-[24px] border border-white/12 bg-[rgba(6,10,18,0.72)] p-5 backdrop-blur-xl shadow-[0_18px_60px_rgba(6,10,18,0.48)]"
                            : "max-w-md rounded-[24px] border border-white/10 bg-black/35 p-5 backdrop-blur-md shadow-[0_18px_60px_rgba(6,10,18,0.38)]"
                          }>
                            <div className="flex items-center gap-2 mb-2">
                              <Wand2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80">Auto-fix available</span>
                            </div>
                            <div className="text-lg font-semibold text-white">{feature.stat}</div>
                            <p className="mt-2 text-sm text-white/60">{feature.statTip}</p>
                          </div>
                        </div>
                      </div>
                    </BrowserFrame>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Trust Stack flagship ─── */}
      <ScrollReveal animation="scale-up">
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
          <BrowserFrame>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <SectionEyebrow>Trust Stack 2.0</SectionEyebrow>
                <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                  One score. Prioritized fixes. Auto-execution.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                  The Trust Stack scores your business across 5 key areas and tells you exactly what to fix — then fixes it for you. No more guessing what matters.
                </p>
                <div className="mt-6 space-y-3 text-sm text-white/72">
                  {[
                    "Technical foundation scored and auto-fixable",
                    "Listings, content, reviews, and AI — all scored in one place",
                    "A prioritized queue of fixes we can execute for you",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <Wand2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="geo-feature-shell rounded-[30px] border border-white/10 bg-[#09111c] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">Trust Stack Object</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Your local SEO, scored and auto-fixable.</div>
                  </div>
                  <div className="rounded-full border border-[#7ce6c7]/20 bg-[#7ce6c7]/10 px-3 py-1 text-xs text-[#9be8d2]">Priority view</div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
                  <div className="geo-stack-core rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Overall score</div>
                          <GeoTooltip tip="Your composite authority score from 0-100 across all 5 Trust Stack layers." side="right" iconClassName="w-3 h-3" />
                        </div>
                        <div className="mt-2 text-5xl font-semibold text-white"><AnimatedCounter target={78} /></div>
                      </div>
                      <div className="rounded-full border border-[#7ce6c7]/20 bg-[#7ce6c7]/10 px-3 py-1 text-xs text-[#9be8d2]">
                        +14 this month
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 grid-cols-3 sm:grid-cols-5">
                      {[
                        ["Foundation", "61", 1],
                        ["Trust", "74", 2],
                        ["Geo", "82", 3],
                        ["Reviews", "79", 4],
                        ["AI", "88", 5],
                      ].map(([label, value, layer], index) => (
                        <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</div>
                            <LayerInfoTooltip layerNum={layer as number} side="top" />
                          </div>
                          <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
                          <div className="mt-3 h-1.5 rounded-full bg-white/8">
                            <div
                              className="geo-signal-pulse h-1.5 rounded-full bg-gradient-to-r from-[#5ce6ba] via-[#83f1d6] to-[#8f94ff]"
                              style={{ width: `${58 + index * 8}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[22px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Top priorities</div>
                        <GeoTooltip tip="Your ranked action queue. We handle these in order for the fastest visibility gains." side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-3 space-y-2">
                        {[
                          { text: "Improving trust page structure", fixable: true },
                          { text: "Repairing Apple Maps entity mismatch", fixable: true },
                          { text: "Expanding Tampa landing coverage", fixable: false },
                        ].map((item) => (
                          <div key={item.text} className="flex items-center justify-between gap-2">
                            <span className={`rounded-full px-3 py-1.5 text-xs ${item.fixable ? "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border border-white/10 bg-white/[0.03] text-white/62"}`}>
                              {item.text}
                            </span>
                            {item.fixable && (
                              <button className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                                Fix Now →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">What&apos;s working, what&apos;s not</div>
                        <GeoTooltip tip="Shows which authority layers are actively improving your rankings and which are holding you back." side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full border border-white/10 bg-[#0b1726] flex items-center justify-center">
                          <span className="text-lg font-semibold text-white">High</span>
                        </div>
                        <p className="text-sm leading-6 text-white/60">AI visibility and directory listings are pulling you up. Trust pages are the main thing holding you back.</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-4">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                        <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">Recommended fix</div>
                      </div>
                      <div className="mt-3 text-sm font-medium text-white">Publish two city trust pages and repair the Apple Maps entity mismatch</div>
                      <div className="mt-2 text-sm text-emerald-400/70">Estimated impact: +7 to +11 visibility points</div>
                      <button className="mt-3 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors">
                        Fix Automatically
                      </button>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(143,148,255,0.09),rgba(255,255,255,0.03))] p-4">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Weekly update</div>
                      <p className="mt-3 text-sm leading-6 text-white/65">Your Trust Stack updates every week with fresh data and new priorities — and we can auto-execute fixes based on your preferences.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BrowserFrame>
        </section>
      </ScrollReveal>

      {/* ─── Proof ─── */}
      <section className="bg-[#0e141f]/55 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal animation="fade-up">
            <div className="mb-14 max-w-3xl">
              <SectionEyebrow>Real results from real businesses</SectionEyebrow>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                Insurance professionals who replaced agencies and outranked competitors.
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-5 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 120}>
                <div className="geo-proof-card h-full rounded-[30px] border border-white/10 bg-white/[0.03] p-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/38">
                      Results
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-300 text-amber-300" />
                      ))}
                    </div>
                  </div>

                  <div className="mb-5 rounded-[24px] border border-white/8 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">{t.city}</div>
                    <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{t.metric}</div>
                    <div className="mt-2 text-sm text-[#8de7d0]">{t.impact}</div>
                  </div>

                  <p className="mb-7 text-base leading-7 text-white/72">&ldquo;{t.quote}&rdquo;</p>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/8 pt-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">Agent</div>
                      <div className="mt-2 text-sm font-medium text-white">{t.name}</div>
                      <div className="mt-1 text-sm text-white/45">{t.title}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">Market</div>
                      <div className="mt-2 text-sm font-medium text-white">{t.city}</div>
                      <div className="mt-1 text-sm text-white/45">Insurance vertical</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal animation="fade-up">
            <div className="mb-12 text-center">
              <SectionEyebrow>Simple pricing</SectionEyebrow>
              <h2 className="mt-5 mx-auto max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Start free. Upgrade when you want fixes handled for you.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
                Every plan starts with a free scan. Paid plans add automatic fixes, monitoring, and ongoing optimization.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 lg:grid-cols-4">
            {pricingTiers.map((t, i) => (
              <ScrollReveal key={i} animation="scale-up" delay={i * 100}>
                <div
                  className={`relative h-full rounded-[28px] border p-6 text-left ${
                    t.highlighted
                      ? "border-[#7ce6c7]/35 bg-[linear-gradient(180deg,rgba(124,230,199,0.1),rgba(255,255,255,0.03))] shadow-[0_20px_70px_rgba(92,230,186,0.14)]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {t.highlighted && (
                    <div className="absolute -top-3 left-6 rounded-full border border-[#7ce6c7]/25 bg-[#7ce6c7]/12 px-3 py-1 text-xs font-semibold text-[#9be8d2]">
                      Most Popular
                    </div>
                  )}
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">{t.name}</div>
                  <div className="mt-4 text-4xl font-semibold text-white">
                    {t.price === 0 ? (
                      "Free"
                    ) : (
                      <>
                        <span className="text-xl text-white/38">$</span>
                        {t.price}
                        <span className="text-sm font-normal text-white/35"> /mo</span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-white/58">{t.desc}</div>
                  <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-4 text-sm text-white/68">
                    {t.name === "Free" && "See your Trust Stack score and where you stand. No card needed."}
                    {t.name === "Starter" && "One location: scan, auto-fix schema, sync listings, weekly monitoring."}
                    {t.name === "Growth" && "The works: competitor tracking, AI optimization, auto-fix everything, unlimited content."}
                    {t.name === "Authority" && "Multi-location + agency tools + white-label reports + API access."}
                  </div>
                  <Link
                    href={t.price === 0 ? "/signup" : "/pricing"}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      t.highlighted
                        ? "bg-gradient-to-r from-[#5ce6ba] to-[#77d9ca] text-[#071019]"
                        : "border border-white/10 bg-white/[0.03] text-white/86 hover:bg-white/[0.05]"
                    }`}
                  >
                    {t.price === 0 ? "Start Free" : "Start 14-Day Trial"}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(92,230,186,0.14),_transparent_35%),linear-gradient(180deg,rgba(12,19,33,0.25),rgba(10,10,15,0.02))]" />
        <div className="pointer-events-none absolute inset-0 geo-territory-grid opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4">

          <ScrollReveal animation="fade-up">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 py-10 text-center shadow-[0_24px_100px_rgba(5,10,18,0.45)] sm:px-10 sm:py-14">
              <SectionEyebrow>Get your free scan</SectionEyebrow>
              <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Stop reading about problems. Start fixing them.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
                No credit card. No sales call. Just a clear view of where you stand and what we&apos;ll fix for you — in 90 seconds.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5ce6ba] to-[#77d9ca] px-8 py-4 text-base font-semibold text-[#071019] shadow-[0_18px_50px_rgba(92,230,186,0.2)] transition-all hover:translate-y-[-1px]"
              >
                Get Your Free Scan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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
                <Link href="/privacy" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 mb-8">
            <h4 className="font-semibold text-sm mb-4 text-gray-400">Our Products</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://geothority.com" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Geothority</div>
                  <div className="text-xs text-gray-600">Local SEO Scanner &amp; Auto-Fixer</div>
                </div>
              </a>
              <a href="https://starcepta.com?ref=geothority" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Starcepta</div>
                  <div className="text-xs text-gray-600">Automated Review Collection</div>
                </div>
              </a>
              <a href="https://4minuteseo.com?ref=geothority" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
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
              <Logo href="/" size={24} showText={false} />
              <span className="text-sm text-gray-500">
                © 2026 Geothority. All rights reserved.
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Dominate local search &amp; AI — for insurance agents and local businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
