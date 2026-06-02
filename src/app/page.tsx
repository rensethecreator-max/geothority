"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  Eye,
  FileText,
  Layers3,
  LineChart,
  MapPin,
  Menu,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

type WalkthroughTab = "scan" | "trust" | "ai" | "competitors" | "fixes";

const trustMetrics = [
  { value: "90s", label: "first scan", detail: "Fast enough to start immediately" },
  { value: "68+", label: "authority signals", detail: "Mapped across your visibility stack" },
  { value: "15", label: "AI surfaces", detail: "Track where your business appears" },
  { value: "Weekly", label: "competitor monitoring", detail: "Turn movement into a response plan" },
];

const socialProof = [
  { label: "Built for", value: "Insurance agencies" },
  { label: "Ideal for", value: "Local service operators" },
  { label: "Signature lens", value: "Trust + AI visibility" },
  { label: "Workflow", value: "Execution-first" },
];

const logoProof = ["Independent agencies", "Local operators", "Multi-location teams", "Visibility-led growth"];

const executionModes = [
  {
    title: "Automatic fixes",
    subtitle: "Handled directly where safe and supported",
    bullets: ["Schema deployment", "Monitoring updates", "Selected fix-engine actions"],
    accent: "from-emerald-400 to-teal-300",
  },
  {
    title: "One-click approval",
    subtitle: "Prepared for fast operator review",
    bullets: ["Content drafts", "Review pushes", "Priority response plans"],
    accent: "from-cyan-400 to-indigo-300",
  },
  {
    title: "Guided execution",
    subtitle: "Clear next step when full automation is not native",
    bullets: ["Deployment instructions", "Fix packages", "Action-ready priorities"],
    accent: "from-amber-300 to-orange-300",
  },
];

const workflowSteps = [
  {
    title: "Scan",
    icon: Search,
    text: "Scan your business across Google, Maps, listings, reviews, competitors, and AI answer surfaces.",
  },
  {
    title: "Diagnose",
    icon: Compass,
    text: "See what is suppressing visibility first, without digging through generic SEO noise.",
  },
  {
    title: "Fix",
    icon: Zap,
    text: "Run safe fixes automatically, approve the right actions, or follow a guided next step.",
  },
  {
    title: "Monitor",
    icon: Radar,
    text: "Track what changed, what improved, and where competitors are gaining ground over time.",
  },
];

const capabilities = [
  {
    title: "Trust Stack Scoring",
    icon: Layers3,
    text: "See how trust signals, content, listings, and AI visibility combine to shape your local presence.",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    title: "AI Visibility Monitoring",
    icon: Bot,
    text: "Track where AI assistants mention your business and what may be strengthening or suppressing that presence.",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    title: "Citation & Listing Review",
    icon: MapPin,
    text: "Find inconsistencies across important directories and see where supported sync can help.",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    title: "Schema Generation",
    icon: Code2,
    text: "Generate structured data faster so search engines can interpret your business more clearly.",
    accent: "from-amber-500 to-orange-500",
  },
  {
    title: "Local Content Drafting",
    icon: FileText,
    text: "Create city and service page drafts based on real visibility gaps and market opportunities.",
    accent: "from-rose-500 to-pink-500",
  },
  {
    title: "Competitor Monitoring",
    icon: Eye,
    text: "Spot competitor movement early and turn it into a response plan instead of a passive alert.",
    accent: "from-sky-500 to-indigo-500",
  },
];

const tabs: Record<WalkthroughTab, {
  label: string;
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  metric: string;
  icon: React.ElementType;
}> = {
  scan: {
    label: "Scan",
    eyebrow: "Visibility baseline",
    headline: "Start with a fast visibility scan.",
    body: "See where your business stands across local search, directories, reviews, and AI surfaces in about 90 seconds.",
    bullets: ["fast first scan", "immediate baseline", "broad visibility snapshot"],
    metric: "90s",
    icon: Search,
  },
  trust: {
    label: "Trust Stack",
    eyebrow: "Priority engine",
    headline: "See what is driving, or dragging, visibility.",
    body: "The Trust Stack shows which layers of authority are working, which are weak, and where to focus first.",
    bullets: ["multi-layer scoring", "clearer prioritization", "weekly updates"],
    metric: "78",
    icon: Layers3,
  },
  ai: {
    label: "AI Visibility",
    eyebrow: "Answer surfaces",
    headline: "Track your presence across AI answer surfaces.",
    body: "Monitor whether your business is being mentioned and identify the improvements most likely to strengthen that presence over time.",
    bullets: ["mention tracking", "competitor comparison", "guided next steps"],
    metric: "15",
    icon: Bot,
  },
  competitors: {
    label: "Competitors",
    eyebrow: "Market motion",
    headline: "See competitor movement before the gap widens.",
    body: "Track visible changes like new pages, listing updates, and review momentum so your team can respond more intelligently.",
    bullets: ["competitor snapshots", "change detection", "response planning"],
    metric: "+12",
    icon: Radar,
  },
  fixes: {
    label: "Fixes",
    eyebrow: "Execution path",
    headline: "Turn insight into supported action.",
    body: "Where supported, Geothority helps you generate, review, or deploy improvements instead of stopping at diagnosis.",
    bullets: ["schema generation", "content drafting", "clearer next actions"],
    metric: "3",
    icon: Zap,
  },
};

const pricing = [
  {
    name: "Starter",
    price: "$97",
    intro: "For single-location teams getting the fundamentals under control.",
    bullets: ["Visibility scan", "Trust Stack scoring", "Core issue detection", "Baseline monitoring"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Growth",
    price: "$197",
    intro: "For teams that need stronger monitoring and clearer operational follow-through.",
    bullets: ["Everything in Starter", "Deeper visibility tracking", "AI visibility monitoring", "Competitor monitoring"],
    cta: "Choose Growth",
    featured: true,
  },
  {
    name: "Authority",
    price: "$297",
    intro: "For serious operators who want the fullest Geothority workflow.",
    bullets: ["Everything in Growth", "Advanced tracking", "Stronger execution support", "Premium operating clarity"],
    cta: "Choose Authority",
    featured: false,
  },
];

function SectionIntro({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className="text-[13px] font-bold uppercase tracking-[0.22em] text-indigo-700">{eyebrow}</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-8 text-slate-700">{text}</p>}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-2xl lg:max-w-none">
      <div className="absolute -inset-8 rounded-[44px] bg-[radial-gradient(circle_at_30%_20%,rgba(129,140,248,0.38),transparent_38%),radial-gradient(circle_at_78%_70%,rgba(45,212,191,0.28),transparent_32%)] blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-3 shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(45,212,191,0.14),transparent_24%)]" />
        <div className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef4ff)] p-5 text-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">Executive visibility view</div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">Trust Stack Score</div>
              <div className="mt-1 text-sm text-slate-800">Find what is suppressing visibility, then move the right fix forward.</div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live</div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-[0.78fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(from_220deg,#60a5fa_0deg,#34d399_210deg,rgba(255,255,255,0.1)_210deg)] p-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute inset-2 rounded-full border border-emerald-300/12 border-t-emerald-300/40"
                />
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-50 text-slate-950">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.55 }}
                    className="text-5xl font-semibold tracking-[-0.07em]"
                  >
                    78
                  </motion.div>
                  <div className="mt-1 text-[13px] font-medium uppercase tracking-[0.18em] text-slate-900">out of 100</div>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2.4 }}
                    className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> scanning live
                  </motion.div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-[15px] font-semibold text-emerald-950 shadow-sm">
                +14 points available from safe fixes and queued actions
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["AI visibility", "Ahead of 2 local competitors after new entity coverage", "+12", "emerald"],
                ["Listings", "3 directories ready to sync. 1 mismatch still needs review.", "3 synced", "cyan"],
                ["Trust pages", "Priority gap detected this week. Draft and schema package ready.", "Ready", "amber"],
              ].map(([label, text, badge, color], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + index * 0.12, duration: 0.5 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-800">{label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-800">{text}</div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ repeat: Infinity, duration: 2.3, delay: index * 0.25 }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color === "emerald" ? "bg-emerald-50 text-emerald-700" : color === "cyan" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {badge}
                    </motion.div>
                  </div>
                </motion.div>
              ))}
              <div className="rounded-2xl border border-amber-300 bg-[linear-gradient(135deg,rgba(254,243,199,0.98),rgba(255,255,255,1))] p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-900">Operator brief</div>
                    <div className="mt-2 text-sm leading-6 text-slate-800">3 high-leverage moves queued for review</div>
                  </div>
                  <Sparkles className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-600">
              <span>Fix momentum</span>
              <span>Last 30 days</span>
            </div>
            <div className="flex h-12 items-end gap-2">
              {[34, 46, 38, 58, 52, 68, 61, 78, 72, 84, 79, 91].map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 8 }}
                  animate={{ height }}
                  transition={{ delay: 0.2 + index * 0.03, duration: 0.65 }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-emerald-400 shadow-[0_0_0_1px_rgba(255,255,255,0.28)]"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MiniProductPanel({ active }: { active: WalkthroughTab }) {
  const tab = tabs[active];
  const Icon = tab.icon;

  return (
    <motion.div
      key={active}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef4ff)] p-5 text-slate-950 shadow-xl shadow-slate-200/80"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.12),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm">
            <Icon className="h-4 w-4" /> {tab.eyebrow}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-2xl font-semibold tracking-[-0.06em] shadow-sm">{tab.metric}</div>
        </div>

        <div className="mt-8 grid gap-3">
          {tab.bullets.map((bullet, index) => (
            <div key={bullet} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">{index + 1}</span>
                  <span className="text-sm font-medium capitalize text-slate-800">{bullet}</span>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-600">
            <span>Fix progress</span>
            <span>This week</span>
          </div>
          <div className="flex h-24 items-end gap-2">
            {[28, 44, 37, 59, 53, 70, 64, 86].map((height, index) => (
              <div key={index} style={{ height }} className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-cyan-300" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ExecutionModeCard({ mode, index }: { mode: typeof executionModes[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className={`inline-flex rounded-full bg-gradient-to-r ${mode.accent} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-950`}>
        {mode.title}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-700">{mode.subtitle}</p>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-slate-900">
        <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-600">
          <span>Execution preview</span>
          <motion.span animate={{ opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 2.2 }}>
            {index === 0 ? "Live" : index === 1 ? "Awaiting approval" : "Guided"}
          </motion.span>
        </div>

        {index === 0 && (
          <div className="space-y-3">
            {[
              ["Schema package", "Deployed"],
              ["Weekly monitor", "Running"],
              ["Citation check", "Synced"],
            ].map(([label, status], row) => (
              <motion.div key={label} initial={{ opacity: 0.45 }} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ delay: row * 0.18, duration: 2.4, repeat: Infinity, repeatDelay: 0.6 }} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="text-sm text-slate-800">{label}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{status}</span>
              </motion.div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
              <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="h-1.5 w-6 rounded-full bg-emerald-300" />
              pushing fixes now
            </div>
          </div>
        )}

        {index === 1 && (
          <div className="space-y-3">
            {[
              ["Review campaign", "Approve"],
              ["City page draft", "Approve"],
              ["Competitor response", "Review"],
            ].map(([label, status], row) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="text-sm text-slate-800">{label}</span>
                <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2.2, delay: row * 0.2 }} className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">{status}</motion.span>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-700">
              <motion.span animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 1.4 }} className="h-2 w-2 rounded-full bg-cyan-300" />
              waiting on operator approval
            </div>
          </div>
        )}

        {index === 2 && (
          <div className="space-y-3">
            {[
              ["Trust page gap", 84],
              ["Directory mismatch", 62],
              ["GBP photo freshness", 46],
            ].map(([label, progress]) => (
              <div key={label as string} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-800">
                  <span>{label as string}</span>
                  <span className="text-slate-600">Next step ready</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-300" />
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-700">
              <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="h-1.5 w-6 rounded-full bg-amber-300" />
              packaged next step ready
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {mode.bullets.map((bullet) => (
          <div key={bullet} className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {bullet}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [activeTab, setActiveTab] = useState<WalkthroughTab>("scan");
  const active = tabs[activeTab];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(20,184,166,0.1),transparent_26%)]" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/82 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" size={32} className="text-slate-950" />

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Features</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">How It Works</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Pricing</Link>
            <Link href="/compare/geothority-vs-moz-local" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Compare</Link>
            <Link href="/service-facts" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">What You Get</Link>
            <Link href="/faq" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">FAQ</Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Sign In</Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/12 transition hover:-translate-y-0.5 hover:bg-slate-800">
              Get Free Scan
            </Link>
          </div>

          <button className="rounded-xl p-2 text-slate-950 md:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <Link href="#features" onClick={() => setMobileNav(false)} className="block py-3 text-base text-slate-700">Features</Link>
            <Link href="#how-it-works" onClick={() => setMobileNav(false)} className="block py-3 text-base text-slate-700">How It Works</Link>
            <Link href="/pricing" className="block py-3 text-base text-slate-700">Pricing</Link>
            <Link href="/compare/geothority-vs-moz-local" className="block py-3 text-base text-slate-700">Compare</Link>
            <Link href="/service-facts" className="block py-3 text-base text-slate-700">What You Get</Link>
            <Link href="/faq" className="block py-3 text-base text-slate-700">FAQ</Link>
            <Link href="/login" className="block py-3 text-base text-slate-700">Sign In</Link>
            <Link href="/signup" className="mt-2 block rounded-full bg-slate-950 py-3 text-center text-base font-semibold text-white">Get Free Scan</Link>
          </div>
        )}
      </nav>

      <main className="relative">
        <section className="overflow-hidden px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Visibility diagnosis + fix engine
              </div>
              <h1 className="mt-7 max-w-5xl text-[2.55rem] font-semibold leading-[0.96] tracking-[-0.07em] text-slate-950 sm:text-5xl lg:text-[5.15rem]">
                Find out why you&apos;re not visible, then fix what&apos;s holding you back.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
                Geothority scans your business across Google, Maps, directories, reviews, competitors, and AI search, then fixes what it can automatically, queues the right actions for approval, and guides the rest to completion.
              </p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                Built for teams that want resolution, not just reporting.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-950 px-7 py-[1.1rem] text-base font-semibold text-white shadow-xl shadow-indigo-950/18 transition hover:-translate-y-0.5 hover:bg-indigo-900">
                  Get Free Scan <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/service-facts" className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-7 py-4 text-base font-semibold text-indigo-950 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50">
                  What You Get <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="#platform" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-7 py-4 text-base font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-700">
                  See the Platform <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium text-slate-900">
                {[
                  "Automatic fixes where supported",
                  "One-click approvals for high-impact actions",
                ].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-slate-950 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-medium leading-6 text-slate-800">Built for insurance agencies and serious local operators who need a clearer path from problem to completed fix.</p>
            </motion.div>

            <HeroVisual />
          </div>
        </section>

        <section className="px-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-[30px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/5 sm:grid-cols-2 lg:grid-cols-4">
            {trustMetrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl bg-slate-50 px-5 py-5">
                <div className="text-3xl font-semibold tracking-[-0.06em] text-slate-950">{metric.value}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">{metric.label}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{metric.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-7xl rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.95))] p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Proof of fit</div>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Built for local operators who need clarity, not more dashboard noise.</h3>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {socialProof.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{item.label}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-4 sm:px-6 sm:pb-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 shadow-sm sm:text-[15px]">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">Trusted fit</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {logoProof.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              center
              eyebrow="How it works"
              title="Find what&apos;s suppressing visibility. Fix what can be fixed."
              text="Geothority helps your team move from scattered SEO effort to a more disciplined diagnose-and-fix workflow."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/7">
                    {index < workflowSteps.length - 1 && <div className="absolute left-[calc(100%-8px)] top-11 hidden h-px w-8 bg-gradient-to-r from-indigo-200 to-transparent md:block" />}
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><Icon className="h-5 w-5" /></div>
                    <div className="mt-6 text-[13px] font-bold uppercase tracking-[0.18em] text-indigo-700">Step {index + 1}</div>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-[15px] leading-6 text-slate-700">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Core capabilities"
              title="Diagnosis, prioritization, and fix execution in one platform."
              text="Geothority helps serious operators see what matters, resolve what they can fast, and move the rest forward with more precision."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="group overflow-hidden rounded-[30px] border border-slate-300 bg-white p-6 shadow-md shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/8">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-lg shadow-slate-950/12`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-[15px] leading-6 text-slate-700">{feature.text}</p>
                    <div className="mt-7 h-16 overflow-hidden rounded-2xl bg-slate-50 p-3">
                      {feature.title === "Trust Stack Scoring" && (
                        <div className="flex h-full items-center gap-2">
                          {[74, 68, 82, 57].map((score, index) => (
                            <div key={index} className="flex-1">
                              <div className="mb-1 h-2 rounded-full bg-slate-200">
                                <div style={{ width: `${score}%` }} className={`h-full rounded-full bg-gradient-to-r ${feature.accent}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "AI Visibility Monitoring" && (
                        <div className="flex h-full items-center justify-between px-1">
                          {["ChatGPT", "Gemini", "Perplexity"].map((label, index) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                              <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${feature.accent} ${index === 1 ? "scale-125" : "opacity-70"}`} />
                              <div className="text-[10px] font-medium text-slate-600">{label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Citation & Listing Review" && (
                        <div className="space-y-2">
                          {[true, false, true].map((matched, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${matched ? "bg-emerald-400" : "bg-rose-400"}`} />
                              <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                                <div className={`h-full rounded-full ${matched ? "bg-emerald-400 w-full" : "bg-rose-400 w-2/3"}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Schema Generation" && (
                        <div className="space-y-2 rounded-2xl bg-slate-950 px-3 py-2 text-[10px] text-emerald-300">
                          <div>{'{'}&quot;@type&quot;: &quot;LocalBusiness&quot;{'}'}</div>
                          <div>{'{'}&quot;areaServed&quot;: &quot;Tampa&quot;{'}'}</div>
                          <div>{'{'}&quot;sameAs&quot;: [ ... ]{'}'}</div>
                        </div>
                      )}
                      {feature.title === "Local Content Drafting" && (
                        <div className="space-y-2">
                          {["Tampa homeowners insurance", "Coverage options", "Why local trust matters"].map((line, index) => (
                            <div key={line} className="rounded-xl bg-white px-3 py-2 text-[10px] text-slate-600">
                              <div className={`h-1.5 rounded-full ${index === 0 ? "w-4/5 bg-rose-400" : index === 1 ? "w-3/5 bg-pink-400" : "w-2/3 bg-slate-300"}`} />
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Competitor Monitoring" && (
                        <div className="flex h-full items-end gap-1.5">
                          {[18, 24, 20, 42, 36, 58, 52].map((height, index) => (
                            <div key={index} style={{ height }} className={`flex-1 rounded-t bg-gradient-to-t ${feature.accent} ${index > 4 ? "opacity-100" : "opacity-60"}`} />
                          ))}
                        </div>
                      )}
                      {! ["Trust Stack Scoring", "AI Visibility Monitoring", "Citation & Listing Review", "Schema Generation", "Local Content Drafting", "Competitor Monitoring"].includes(feature.title) && (
                        <div className="flex h-full items-end gap-1.5">
                          {[24, 38, 30, 52, 46, 62, 58].map((height, index) => (
                            <div key={index} style={{ height }} className={`flex-1 rounded-t bg-gradient-to-t ${feature.accent} opacity-70 transition group-hover:opacity-100`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              center
              eyebrow="How Geothority helps you fix visibility"
              title="Not everything should be treated the same way."
              text="Geothority separates what can be fixed automatically, what should be queued for approval, and what still needs a guided operator step."
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {executionModes.map((mode, index) => (
                <ExecutionModeCard key={mode.title} mode={mode} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-[linear-gradient(180deg,#03101f_0%,#071427_48%,#081326_100%)] px-4 py-20 text-white sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-cyan-100">Signature framework</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.45)] sm:text-5xl">The Trust Stack shows why you&apos;re not visible, and what to fix first.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-100">
                Instead of scattered reports and disconnected tasks, Geothority shows what is helping, what is holding you back, what can be fixed now, and where the team should focus next.
              </p>
              <div className="mt-8 grid gap-3">
                {["Prioritize what matters most", "Separate signal from noise", "Spot fixable issues faster"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/18 bg-white/[0.1] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" /> {item}
                  </div>
                ))}
              </div>
              <Link href="#platform" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50">
                Explore the Platform <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm text-slate-200">Built to make visibility work feel more like a system and less like guesswork.</p>
            </div>

            <div className="rounded-[34px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80">
              <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eff6ff)] p-5 text-slate-950 shadow-lg shadow-slate-200/80">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-600">Trust Stack Object</div>
                    <div className="mt-1 text-lg font-semibold">Weekly authority map</div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">+14 available</div>
                </div>
                <div className="space-y-4">
                  {[
                    ["Trust", 74, "+2"],
                    ["Citations", 68, "Fix"],
                    ["AI Mentions", 82, "+12"],
                    ["Content Coverage", 57, "Draft"],
                    ["Competitor Pressure", 63, "Watch"],
                  ].map(([label, score, status]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-800">{label}</span>
                        <motion.span
                          animate={status === "Fix" || status === "Draft" ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
                          transition={{ repeat: Infinity, duration: 1.9 }}
                          className="text-slate-600"
                        >
                          {status}
                        </motion.span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-200">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700">Fix available</div>
                    <div className="mt-2 text-sm text-slate-800">Deploy trust-page schema and recover one of the lowest authority gaps first.</div>
                    <div className="mt-3 h-1.5 rounded-full bg-emerald-100">
                      <motion.div animate={{ width: ["24%", "61%", "24%"] }} transition={{ repeat: Infinity, duration: 3.4 }} className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-300" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-700">Competitive pressure</div>
                    <div className="mt-2 text-sm text-slate-800">2 nearby competitors increased review velocity this week. Response plan ready.</div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-700">
                      <motion.span animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 1.6 }} className="h-2 w-2 rounded-full bg-cyan-300" />
                      response package prepared
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro center eyebrow="Why teams switch" title="Most SEO tools stop at diagnosis. Geothority helps complete the work." />
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[32px] border border-rose-100 bg-white p-7 shadow-sm">
                <div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Typical SEO tools</div>
                <div className="mt-7 space-y-4">
                  {["find issues but stop at reporting", "generic recommendations without execution", "scattered dashboards across too many surfaces", "manual follow-up after the insight"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-slate-800"><span className="h-2 w-2 rounded-full bg-rose-500" /> {item}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-[32px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff,#ecfdf5)] p-7 text-slate-950 shadow-sm">
                <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Geothority</div>
                <div className="mt-7 grid gap-3">
                  {[
                    ["Automatic", "Run safe fixes where supported"],
                    ["Approval", "Queue content, campaigns, and response plans"],
                    ["Guided", "Package the next step when full automation is not native"],
                  ].map(([label, text], index) => (
                    <motion.div key={label} initial={{ opacity: 0.6 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.12, duration: 0.4 }} className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">{label}</div>
                          <div className="mt-1 text-sm text-slate-800">{text}</div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-8 text-center text-lg font-medium text-slate-700">Less reporting for its own sake. More clarity on what to do next.</p>
            <p className="mt-3 text-center text-sm text-slate-700">That means fewer scattered dashboards, fewer vague priorities, and a more actionable visibility workflow for the team actually doing the work.</p>
          </div>
        </section>

        <section id="platform" className="bg-white px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              center
              eyebrow="Platform walkthrough"
              title="See how Geothority works inside the platform."
              text="From first scan to completed fix path, every view is designed to make visibility easier to understand and easier to resolve."
            />
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {(Object.keys(tabs) as WalkthroughTab[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === key ? "bg-slate-950 text-white shadow-lg shadow-slate-950/12" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"}`}
                >
                  {tabs[key].label}
                </button>
              ))}
            </div>
            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">{active.eyebrow}</div>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">{active.headline}</h3>
                <p className="mt-5 text-lg leading-8 text-slate-600">{active.body}</p>
                <div className="mt-7 grid gap-2.5">
                  {active.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" /> <span className="capitalize">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
              <MiniProductPanel active={activeTab} />
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              center
              eyebrow="Built for serious operators"
              title="Designed for teams that need more than another dashboard."
              text="Geothority fits best where visibility matters, competition is active, and execution needs to be sharper."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ["Insurance Agencies", "For teams that need stronger trust signals, cleaner visibility, and a more disciplined operating view.", ShieldCheck],
                ["Local Service Businesses", "For operators who want a clearer path from visibility issues to practical next steps.", BarChart3],
                ["Multi-location Teams", "For businesses that need stronger oversight, consistency, and response planning across markets.", LineChart],
              ].map(([title, text, Icon]) => {
                const TypedIcon = Icon as React.ElementType;
                return (
                  <div key={title as string} className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><TypedIcon className="h-5 w-5" /></div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-slate-950">{title as string}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              center
              eyebrow="Simple plans"
              title="Choose the level of visibility support that matches your growth stage."
              text="Start with a scan, then grow into deeper monitoring, prioritization, and execution support."
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {pricing.map((plan) => (
                <div key={plan.name} className={`rounded-[32px] border p-7 ${plan.featured ? "border-slate-950 bg-slate-950 text-white shadow-2xl shadow-slate-950/18" : "border-slate-200 bg-white text-slate-950 shadow-sm"}`}>
                  {plan.featured && <div className="mb-4 inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Recommended</div>}
                  <h3 className="text-2xl font-semibold tracking-[-0.04em]">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <div className="text-4xl font-semibold tracking-[-0.06em]">{plan.price}</div>
                    <div className={`pb-1 text-sm ${plan.featured ? "text-white/78" : "text-slate-500"}`}>/month</div>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${plan.featured ? "text-white/88" : "text-slate-600"}`}>{plan.intro}</p>
                  <div className="mt-7 space-y-3">
                    {plan.bullets.map((bullet) => (
                      <div key={bullet} className={`flex items-center gap-3 text-sm ${plan.featured ? "text-white/92" : "text-slate-700"}`}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {bullet}
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing" className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold transition ${plan.featured ? "bg-white text-slate-950 hover:bg-emerald-50" : "bg-slate-950 text-white hover:bg-slate-800"}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">Need the full breakdown, annual pricing, or agency options? See the complete pricing page.</p>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[38px] bg-slate-950 px-6 py-16 text-center text-white shadow-2xl shadow-slate-950/18 sm:px-10">
            <div className="mx-auto max-w-3xl">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><TrendingUp className="h-6 w-6 text-emerald-300" /></div>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">See what is suppressing your visibility.</h2>
              <p className="mt-5 text-lg leading-8 text-white/90">Run your first scan in about 90 seconds and get a clearer action path across local search and AI visibility.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-50">Get Free Scan <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">See Pricing</Link>
              </div>
              <p className="mt-6 text-sm text-white/72">Built for ambitious local operators who want clarity, not more noise.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div>
              <Logo href="/" size={32} className="text-slate-950" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">Geothority helps local businesses turn visibility work into a clearer operating system for growth.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-950">Product</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link href="#features" className="block hover:text-slate-950">Features</Link>
                <Link href="#platform" className="block hover:text-slate-950">Platform</Link>
                <Link href="/pricing" className="block hover:text-slate-950">Pricing</Link>
                <Link href="/compare/geothority-vs-moz-local" className="block hover:text-slate-950">Compare</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-950">Resources</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link href="/faq" className="block hover:text-slate-950">FAQ</Link>
                <Link href="/service-facts" className="block hover:text-slate-950">What You Get</Link>
                <Link href="/contact" className="block hover:text-slate-950">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-950">Account</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link href="/login" className="block hover:text-slate-950">Sign In</Link>
                <Link href="/signup" className="block hover:text-slate-950">Get Free Scan</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-950">Legal</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link href="/privacy" className="block hover:text-slate-950">Privacy</Link>
                <Link href="/terms" className="block hover:text-slate-950">Terms</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">© 2026 Geothority. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
