"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Shield,
  Brain,
  Code,
  FileText,
  Eye,
  Zap,
  Star,
  MapPin,
  Menu,
  X,
  Radar,
  ScanSearch,
  TrendingUp,
  Waypoints,
  ChevronRight,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { GeoTooltip } from "@/components/ui/geo-tooltip";
import { LayerInfoTooltip } from "@/components/ui/info-tooltip";
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
  statTip?: string;
}[] = [
  {
    icon: Shield,
    title: "See Your Complete Local SEO Picture in 90 Seconds",
    description:
      "Our 5-layer Trust Stack™ framework scores your Foundation, Trust Pages, Geo Content, Reviews, and AI Optimization. Know exactly what's holding you back - and what we'll handle first.",
    stat: "5 layers, 1 actionable score",
    image: "/cards/truststack.jpg",
    statTip: "The Trust Stack scores your business across 5 authority layers and gives you one clear priority - so we always know what to handle first for you.",
  },
  {
    icon: MapPin,
    title: "Verify 18 Directories. Sync Across 50+ More.",
    description:
      "We directly verify your listings across Google, Yelp, Bing, Apple Maps, and 14 more directories. Then we confirm and sync your presence across the Foursquare data network - covering Bing, Samsung, Uber, HERE Maps, and 50+ additional services.",
    stat: "68+ directories covered",
    note: "We directly verify 18 major directories. Plus verify your presence in the Foursquare data network covering 50+ additional services. That's 68+ directories covered.",
    image: "/cards/audit.jpg",
    statTip: "Inconsistent listings confuse Google and hurt your rankings. We verify and sync your info across 68+ directories so search engines trust you.",
  },
  {
    icon: Brain,
    title: "We Don't Just Check if AI Recommends You - We Make It Happen.",
    description:
      "ChatGPT, Perplexity, and Google AI Overviews are replacing traditional search. We check if they mention your business - then we generate the exact FAQ schema, entity-rich content, and structured markup that makes AI assistants recommend you.",
    stat: "3 AI platforms checked",
    badge: "Only on Geothority",
    image: "/cards/quickwin.jpg",
    statTip: "More people ask AI assistants for local recommendations. We make sure ChatGPT, Perplexity, and Google AI actually mention your business.",
  },
  {
    icon: Code,
    title: "Your Schema Markup, Fixed in 60 Seconds",
    description:
      "Missing schema means Google can't understand your business. Our wizard generates valid JSON-LD for you in 3 clicks - no developer needed.",
    stat: "9 schema types supported",
    image: "/cards/ai-ready.jpg",
    statTip: "Schema is the technical code that tells Google what your business does. Without it, you are invisible in rich results and AI answers.",
  },
  {
    icon: FileText,
    title: "AI-Powered Local Landing Pages",
    description:
      "We generate SEO-optimized, city-specific content with real local landmarks and entities. Streamed in real-time with a live typing experience.",
    stat: "1,200 words in 40 seconds",
    image: "/cards/content.jpg",
    statTip: "City-specific landing pages rank for local searches - the #1 way new customers find you. AI generates them in seconds, not weeks.",
  },
  {
    icon: Eye,
    title: "Your Competitors Don't Sleep. Neither Do We.",
    description:
      "Weekly auto-scans track your Trust Stack score, monitor competitor moves, and email you when anything changes. We watch so you don't have to - and every scan links to a one-click action we handle for you.",
    stat: "Weekly auto-monitoring",
    image: "/cards/watchdog.jpg",
    statTip: "Set it and forget it. We scan your market weekly, detect competitor moves, and email you only when something needs attention - with the next step already queued up.",
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
  { value: "500+", label: "Insurance operators" },
  { value: "68+", label: "Authority signals mapped" },
  { value: "90s", label: "Time to first scan" },
  { value: "3", label: "AI surfaces monitored" },
];

const pricingTiers = [
  { name: "Scout", price: 0, desc: "See your authority gaps", tip: "Get your free Trust Stack scan and see where you stand. No credit card needed - just clarity." },
  { name: "Operator", price: 97, desc: "Single-location command", tip: "One business location fully managed: scans, fixes, schema, content, and weekly monitoring." },
  { name: "Command", price: 197, desc: "Most popular", highlighted: true, tip: "Everything in Operator plus competitor tracking, AI optimization, priority support, and unlimited content generation." },
  { name: "Network", price: 297, desc: "Multi-location control", tip: "Manage 2+ locations from one dashboard. Agency-grade tools with volume pricing for multi-location operators." },
];

const commandMetrics = [
  { label: "Trust Stack", value: "78", detail: "+14 this month", tip: "Your composite Trust Stack score across all 5 authority layers. Higher means more trust signals working for you in local search." },
  { label: "AI visibility", value: "3/3", detail: "ChatGPT, Perplexity, Google", tip: "You are mentioned by all 3 major AI assistants when customers ask about your services. This is the new frontier of local search." },
  { label: "Competitor delta", value: "+22", detail: "ahead of local median", tip: "You are 22 points ahead of the average competitor in your market area. A positive delta means you are winning the authority game." },
];

const authoritySectors = [
  { name: "Northwest", score: 84, status: "Owned", tip: "Your visibility strength in the northwest area of your market - listings, content, and review coverage combined." },
  { name: "Central", score: 71, status: "Contested", tip: "The central core of your market where competition is fiercest. Contested means competitors are actively challenging your position." },
  { name: "South", score: 63, status: "Exposed", tip: "Your southern market area has gaps. Exposed means competitors outperform you here." },
  { name: "AI Surface", score: 88, status: "Advancing", tip: "Whether AI assistants like ChatGPT and Perplexity recommend your business. Advancing means you are gaining AI mention ground." },
];

const storyChapters = [
  {
    eyebrow: "Diagnose",
    title: "See your local SEO like a map, not a guessing game.",
    description:
      "Geothority scans your entire local presence and shows you what's working, what's broken, and where competitors are beating you. No more guessing.",
    points: [
      "5-layer Trust Stack score with prioritized action plan",
      "Directory, reputation, geo-content, and AI mention coverage",
      "Signal gaps surfaced as specific actions we can handle for you",
    ],
    pointTips: [
      "Your Trust Stack score ranks all 5 authority layers so we know exactly what to handle first for maximum impact.",
      "We check directories, reviews, local content, and AI mentions so you see the full picture.",
      "Every gap comes with a specific action we can take for you - not vague advice. You always know the next step.",
    ],
    metric: "Signal coverage across 68+ sources",
    metricTip: "We monitor 68+ directories, AI platforms, and review sites for you so nothing slips through the cracks.",
    icon: Radar,
  },
  {
    eyebrow: "Deploy",
    title: "We handle problems fast - generating exactly what you need, ready to deploy.",
    description:
      "Instead of hiring agencies, wrestling with spreadsheets, or writing content from scratch, we generate your schema, local pages, and listing fixes from one dashboard - in minutes, not weeks.",
    points: [
      "Schema wizard and AI overview optimization",
      "Entity-rich local pages with real-time generation",
      "Listing sync and fix workflows designed for speed",
    ],
    pointTips: [
      "Our 3-click schema wizard generates search-engine-ready code for you. We also optimize your presence for AI answer engines.",
      "AI writes city-specific pages with real local landmarks - content that Google and AI assistants trust.",
      "We fix listing errors and sync across 50+ directories from one dashboard.",
    ],
    metric: "From issue found to handled in minutes",
    metricTip: "Most fixes take 2-3 clicks and we handle the rest. No waiting for an agency, no hiring a developer.",
    icon: ScanSearch,
  },
  {
    eyebrow: "Defend",
    title: "Stay ahead with monitoring that catches problems before they hurt you.",
    description:
      "We keep scanning after the initial fix. You'll see what changed, know when competitors make moves, and get notified with the exact next step - before your rankings slip.",
    points: [
      "Weekly auto-scans with movement alerts",
      "Competitor tracking tied to direct actions",
      "Evidence-based reporting instead of vanity dashboards",
    ],
    pointTips: [
      "Every week we re-scan your market. If anything changes, you get an email instantly.",
      "See a competitor move? We link you to a one-click response so we can match it the same day.",
      "Every metric ties to a real business outcome - more calls, more visibility, more authority.",
    ],
    metric: "Fresh data every week, not a stale report",
    metricTip: "Your dashboard updates weekly with fresh data. No stale screenshots.",
    icon: TrendingUp,
  },
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
      <div className="pointer-events-none absolute left-6 top-6 text-[10px] uppercase tracking-[0.34em] text-white/15">Sector 04 · East Grid · Live</div>
      <div className="pointer-events-none absolute bottom-6 right-6 text-[10px] uppercase tracking-[0.34em] text-white/15">Authority mesh active</div>

      <div className="relative mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/36">Geothority Dashboard</div>
          <div className="mt-1 text-lg font-semibold text-white">Your local SEO, at a glance</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#7ce6c7]/25 bg-[#7ce6c7]/10 px-3 py-1 text-xs font-medium text-[#9be8d2] geo-breathe">
          Live intelligence
          <GeoTooltip tip="Your command surface updates with every scan, showing real-time authority data." side="left" iconClassName="w-3 h-3" />
        </div>
      </div>

      <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Trust Stack</div>
              <div className="mt-1 text-sm text-white/75">Territory strength by layer</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
              <Waypoints className="h-3.5 w-3.5 text-[#7ce6c7]" />
              Synced
              <GeoTooltip tip="All 68+ directory and platform data is synced and up to date from your latest scan." side="bottom" iconClassName="w-3 h-3" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-3">
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
            <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Geo mesh</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="geo-radar-grid relative mx-auto aspect-square w-full max-w-[220px] rounded-full border border-white/10">
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
              <span className="flex items-center gap-1.5">Competitor movement <GeoTooltip tip="Tracks how your local visibility has changed relative to competitors over the past 30 days." side="right" iconClassName="w-3 h-3" /></span>
              <span className="flex items-center gap-1 rounded-full bg-[#7ce6c7]/10 px-2.5 py-1 text-xs text-[#9be8d2]">+12% visibility <GeoTooltip tip="Your overall local search visibility improved 12% this month - more calls, more clicks, more customers finding you." side="bottom" iconClassName="w-2.5 h-2.5" /></span>
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

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Scan summary</div>
                <GeoTooltip tip="Live intelligence from your latest scan. Unresolved gaps are ranked by impact so we handle what matters first." side="right" iconClassName="w-3 h-3" />
              </div>
                <div className="mt-2 text-sm text-white/72">12 issues found, 4 high priority</div>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#8f94ff]/25 bg-[#8f94ff]/10 px-2.5 py-1 text-xs text-[#c6c8ff]">Handle first <GeoTooltip tip="High-impact issues that will move the needle most - we handle them first." side="left" iconClassName="w-2.5 h-2.5" /></div>
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
      <section className="geo-hero relative overflow-hidden pt-28 pb-16 sm:pt-40 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(92,230,186,0.14),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(110,116,255,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-0 geo-territory-grid opacity-40" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <SectionEyebrow>Local SEO, simplified</SectionEyebrow>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.5rem] xl:text-[5.35rem]">
              Get found locally on Google, Maps, and AI. We handle the SEO work for you.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-white/58 sm:text-[1.15rem]">
              Geothority scans your business across Google, directories, reviews, and AI platforms, identifies what&apos;s holding you back, and helps get it handled for you. We take on the hard parts so you can stay focused on running the business. <span className="font-medium text-white">Your first scan is free and ready in 90 seconds.</span>
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
                See how it works <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SignalChip label="Insurance operators" value="500+" tip="Over 500 insurance professionals rely on Geothority to manage their local search visibility and AI presence." />
              <SignalChip label="Authority signals mapped" value="68+" tip="We scan 68+ directories, platforms, and AI surfaces to map every signal that affects your local rankings." />
              <SignalChip label="Time to first scan" value="90s" tip="Enter your business URL and get a complete Trust Stack diagnosis in under 90 seconds, with no setup and no waiting." />
              <SignalChip label="AI surfaces monitored" value="3" tip="We track whether ChatGPT, Perplexity, and Google AI Overviews recommend your business when customers ask." />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.2em] text-white/32">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">Trust map active <GeoTooltip tip="Your Trust Stack map updates with every scan, showing which authority layers are strong and which we need to address." iconClassName="w-2.5 h-2.5" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">Competitive drift tracked <GeoTooltip tip="We monitor competitor movements weekly and alert you when they gain ground in your market." iconClassName="w-2.5 h-2.5" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">AI recommendation surfaces monitored <GeoTooltip tip="ChatGPT, Perplexity, and Google AI Overviews are checked for your business mentions so you know if AI recommends you." iconClassName="w-2.5 h-2.5" /></span>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-x-10 top-6 h-24 rounded-full bg-[#5ce6ba]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-6 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border border-white/8 bg-white/[0.03] xl:block" />
            <CommandSurface />
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <ScrollReveal animation="fade-up">
        <section className="py-16 sm:py-20 bg-[#0f1117]/30">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-gray-400 mb-16">We handle local search in three steps</p>

            <div className="grid sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">STEP 1</div>
                <h3 className="text-lg font-bold mb-2">We Scan</h3>
                <p className="text-sm text-gray-400">Enter your URL and we analyze your entire local SEO presence across 68+ directories and 3 AI platforms in 90 seconds. There&apos;s almost no lift required from you.</p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 mb-2">STEP 2</div>
                <h3 className="text-lg font-bold mb-2">We Handle</h3>
                <p className="text-sm text-gray-400">With one approval, we generate your missing schema, FAQ content, meta tags, and AI-optimized markup, then sync your listings to 50+ directories automatically.</p>
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

      {/* ─── Trust Stack flagship ─── */}
      <ScrollReveal animation="scale-up">
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
          <BrowserFrame>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <SectionEyebrow>Trust Stack 2.0</SectionEyebrow>
                <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                  One score that tells us what to handle first, and how fast you&apos;re improving.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                  The Trust Stack scores your business across 5 key areas and ranks the highest-impact actions for you. No more guessing what matters. We always know the next step.
                </p>
                <div className="mt-6 space-y-3 text-sm text-white/72">
                  {[
                    "Technical foundation, so your site is set up for Google",
                    "Listings, content, reviews, and AI visibility, all scored in one place",
                    "A prioritized action plan so we always know what to handle next",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#7ce6c7]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="geo-feature-shell rounded-[30px] border border-white/10 bg-[#09111c] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">Trust Stack Object</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Your local SEO, scored and prioritized.</div>
                  </div>
                  <div className="rounded-full border border-[#7ce6c7]/20 bg-[#7ce6c7]/10 px-3 py-1 text-xs text-[#9be8d2]">Priority system</div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
                  <div className="geo-stack-core rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Authority score</div>
                    <GeoTooltip tip="Your composite authority score from 0-100 across all 5 Trust Stack layers. Higher means more trust signals working for you." side="right" iconClassName="w-3 h-3" />
                  </div>
                        <div className="mt-2 text-5xl font-semibold text-white">78</div>
                      </div>
                      <div className="rounded-full border border-[#7ce6c7]/20 bg-[#7ce6c7]/10 px-3 py-1 text-xs text-[#9be8d2]">
                        +14 this month
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-5">
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
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">We handle these first</div>
                        <GeoTooltip tip="Your ranked action queue. We handle these in order for the fastest visibility gains." side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          "Improving trust page structure",
                          "Repairing Apple Maps entity mismatch",
                          "Expanding Tampa landing coverage",
                        ].map((item, index) => (
                          <span key={item} className={`rounded-full px-3 py-2 text-xs ${index === 0 ? "border border-[#7ce6c7]/25 bg-[#7ce6c7]/10 text-[#9be8d2]" : "border border-white/10 bg-white/[0.03] text-white/62"}`}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">What&apos;s helping vs. hurting</div>
                        <GeoTooltip tip="Shows which authority layers are actively improving your rankings and which are holding you back. We tackle the bottlenecks first." side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full border border-white/10 bg-[#0b1726] flex items-center justify-center">
                          <span className="text-lg font-semibold text-white">High</span>
                        </div>
                        <p className="text-sm leading-6 text-white/60">AI visibility and directory listings are pulling you up. Trust pages are the main thing holding you back.</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Your next step</div>
                        <GeoTooltip tip="Based on your Trust Stack data, this is the single action that will improve your local visibility the most right now." side="right" iconClassName="w-3 h-3" />
                      </div>
                      <div className="mt-3 text-sm font-medium text-white">Publish two city trust pages and repair the Apple Maps entity mismatch</div>
                      <div className="mt-2 text-sm text-white/55">Estimated impact: +7 to +11 visibility points</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(143,148,255,0.09),rgba(255,255,255,0.03))] p-4">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Operator reading</div>
                      <p className="mt-3 text-sm leading-6 text-white/65">Your Trust Stack updates every week with fresh data and new priorities, so you always know where you stand and what we&apos;re handling next.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BrowserFrame>
        </section>
      </ScrollReveal>

      {/* ─── Story chapters ─── */}
      <section id="story" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal animation="fade-up">
            <div className="mb-16 max-w-3xl">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Three steps: <span className="text-white/72">we scan, we handle, we monitor.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
                Geothority isn&apos;t a pile of disconnected tools. It&apos;s one system that finds your problems, handles them for you, and keeps watching.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-10">
            {storyChapters.map((chapter, index) => {
              const Icon = chapter.icon;
              const reverse = index % 2 === 1;
              return (
                <ScrollReveal key={chapter.title} animation={reverse ? "slide-right" : "slide-left"}>
                  <div className={`grid gap-6 lg:grid-cols-[0.9fr_1.1fr] ${reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
                    <div className="geo-feature-shell rounded-[30px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                      <SectionEyebrow>{chapter.eyebrow}</SectionEyebrow>
                      <div className="mt-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#8de7d0]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-sm uppercase tracking-[0.18em] text-white/35">{chapter.metric}</div>
                      </div>
                      <h3 className="mt-5 max-w-xl text-2xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-4xl">
                        {chapter.title}
                      </h3>
                      <p className="mt-4 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                        {chapter.description}
                      </p>
                      <div className="mt-6 space-y-3">
                        {chapter.points.map((point) => (
                          <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-white/72">
                            <span className="mt-1 h-2 w-2 rounded-full bg-[#7ce6c7]" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <BrowserFrame className="h-full">
                      <div className="relative h-full min-h-[320px] overflow-hidden rounded-[24px] border border-white/8 bg-[#09111a]">
                        <Image
                          src={features[index * 2]?.image || features[index]?.image}
                          alt={chapter.title}
                          fill
                          className="object-cover opacity-78"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,24,0.15),rgba(8,14,24,0.86))]" />
                        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                          <div className="max-w-md rounded-[24px] border border-white/10 bg-black/35 p-5 backdrop-blur-md shadow-[0_18px_60px_rgba(6,10,18,0.38)]">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">What you see</div>
                            <div className="mt-2 text-xl font-semibold text-white">{chapter.eyebrow} the local market</div>
                            <p className="mt-3 text-sm leading-6 text-white/65">{chapter.metric}. Real data from your business, updated with every scan.</p>
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

      {/* ─── Proof ─── */}
      <section className="bg-[#0e141f]/55 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal animation="fade-up">
            <div className="mb-14 max-w-3xl">
              <SectionEyebrow>Real results from real businesses</SectionEyebrow>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                Trusted by insurance operators who care about measurable territory gains.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/60">
                These are actual results from Geothority users - not marketing fluff.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-5 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 120}>
                <div className="geo-proof-card h-full rounded-[30px] border border-white/10 bg-white/[0.03] p-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/38">
                      Evidence module
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
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">Operator</div>
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
                Pick the plan that fits your business.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
                Every plan includes a free scan. Paid plans add fixes, monitoring, and ongoing support.
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
                      Recommended
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
                    {t.name === "Scout" && "Get your free scan and see where you stand."}
                    {t.name === "Operator" && "Everything you need to manage one location."}
                    {t.name === "Command" && "The most popular plan - fixes, monitoring, AI optimization, and unlimited content."}
                    {t.name === "Network" && "Manage 2+ locations with agency-grade tools and volume pricing."}
                  </div>
                  <Link
                    href={t.price === 0 ? "/signup" : "/pricing"}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      t.highlighted
                        ? "bg-gradient-to-r from-[#5ce6ba] to-[#77d9ca] text-[#071019]"
                        : "border border-white/10 bg-white/[0.03] text-white/86 hover:bg-white/[0.05]"
                    }`}
                  >
                    {t.price === 0 ? "Start Free" : "See Details"}
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
                See your Trust Stack score, local weak spots, and AI readiness - free, in 90 seconds. We&apos;ll show you exactly what we&apos;ll handle.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
                No credit card. No sales call. Just a clear view of where you stand and what we&apos;ll handle next.
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

          {/* Our Products - cross-sell row */}
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
              Dominate local search & AI - for insurance agents and local businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
