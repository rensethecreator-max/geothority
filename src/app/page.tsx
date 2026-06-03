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
  Star,
  Target,
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

const outcomePillars = [
  {
    title: "Local SEO",
    eyebrow: "Google + Maps",
    text: "Improve Google Business Profile strength, local pages, citations, directories, service-area coverage, and the signals that help nearby buyers find you.",
    proof: ["Google Maps readiness", "Citation cleanup", "Service-area content"],
    icon: Search,
    accent: "from-indigo-500 to-cyan-400",
  },
  {
    title: "AEO",
    eyebrow: "AI engine optimization",
    text: "Make your business easier for ChatGPT, Gemini, Perplexity, AI Overviews, and other AI answer engines to understand, trust, and mention.",
    proof: ["Entity clarity", "Schema + FAQ structure", "AI visibility checks"],
    icon: Bot,
    accent: "from-cyan-500 to-emerald-400",
  },
  {
    title: "5-Star Review Growth",
    eyebrow: "Google reputation",
    text: "Turn happy customers into fresh Google reviews, route private feedback before it hurts you, and keep proof signals moving in the right direction.",
    proof: ["Review requests", "Private feedback capture", "Proof assets"],
    icon: Star,
    accent: "from-amber-400 to-rose-400",
  },
];

const aiEngines = [
  { id: "chatgpt", name: "ChatGPT", signal: "Mention checks", tone: "from-emerald-400 to-teal-300", color: "#10a37f" },
  { id: "perplexity", name: "Perplexity", signal: "Citation coverage", tone: "from-cyan-300 to-sky-400", color: "#20b8cd" },
  { id: "claude", name: "Claude", signal: "Entity clarity", tone: "from-orange-300 to-rose-300", color: "#d97757" },
  { id: "gemini", name: "Gemini", signal: "AI answers", tone: "from-blue-400 to-indigo-300", color: "#4f7cff" },
  { id: "copilot", name: "Copilot", signal: "Search answers", tone: "from-fuchsia-400 to-cyan-300", color: "#6d5dfc" },
  { id: "grok", name: "Grok", signal: "Brand recall", tone: "from-slate-500 to-slate-300", color: "#0f172a" },
  { id: "deepseek", name: "DeepSeek", signal: "Structured facts", tone: "from-blue-400 to-sky-300", color: "#3b82f6" },
  { id: "meta", name: "Meta AI", signal: "Local context", tone: "from-blue-500 to-indigo-300", color: "#1c64f2" },
  { id: "you", name: "You.com", signal: "Answer coverage", tone: "from-blue-400 to-cyan-300", color: "#2563eb" },
  { id: "mistral", name: "Mistral", signal: "Model recall", tone: "from-amber-400 to-red-400", color: "#f59e0b" },
  { id: "brave", name: "Brave", signal: "Search surface", tone: "from-orange-500 to-amber-300", color: "#fb542b" },
  { id: "phind", name: "Phind", signal: "Technical queries", tone: "from-slate-700 to-slate-400", color: "#111827" },
  { id: "iask", name: "iAsk", signal: "Intent checks", tone: "from-teal-400 to-emerald-300", color: "#0f9f8f" },
  { id: "qwen", name: "Qwen", signal: "LLM recall", tone: "from-indigo-500 to-violet-300", color: "#635bff" },
  { id: "cohere", name: "Cohere", signal: "Semantic match", tone: "from-indigo-500 to-blue-300", color: "#4f46e5" },
];

const automationStats = [
  { value: "90", label: "seconds", detail: "Scan your business before a manual audit could even start.", icon: Search },
  { value: "100+", label: "data points", detail: "Analyze local SEO, AEO, listings, competitors, content, and reputation.", icon: BarChart3 },
  { value: "1000s", label: "opportunities", detail: "Surface gaps across pages, reviews, listings, schema, and AI readiness.", icon: Target },
  { value: "10x", label: "visibility potential", detail: "Focus every fix on better discoverability, not vanity reporting.", icon: TrendingUp },
  { value: "24/7", label: "monitoring", detail: "Keep watching the surfaces that change while the business is busy.", icon: ShieldCheck },
];

const automationLanes = [
  { value: 75, label: "Automatic", detail: "safe fixes and monitoring actions", color: "from-emerald-400 to-teal-300" },
  { value: 20, label: "One approval", detail: "content, review, and response packages", color: "from-cyan-400 to-indigo-300" },
  { value: 5, label: "Guided", detail: "operator steps where human control matters", color: "from-amber-300 to-orange-300" },
];

const automationWorkflow = [
  { title: "Audit", text: "Scan Google, AI engines, listings, competitors, reviews, content, and schema.", icon: Search },
  { title: "Repair plan", text: "Rank what can raise visibility fastest without drowning the team in noise.", icon: Compass },
  { title: "Generate fixes", text: "Prepare schema, content drafts, review campaigns, and listing actions.", icon: Sparkles },
  { title: "Execute + monitor", text: "Run supported work, queue approvals, and keep tracking momentum.", icon: Radar },
];

const whatGeothorityDoes = [
  { task: "Website audit", mode: "Automatic", detail: "Scanned in 90 seconds", outcome: "Analyzes 100+ website and visibility factors", icon: FileText },
  { task: "Find visibility problems", mode: "Automatic", detail: "Identified instantly", outcome: "Explains issues that cost Google and AI visibility", icon: Search },
  { task: "Prioritize fixes", mode: "Automatic", detail: "Ranked by impact", outcome: "Pushes highest-impact opportunities to the top", icon: TrendingUp },
  { task: "Create service pages", mode: "Automatic", detail: "Created for you", outcome: "Generates SEO-ready service pages", icon: FileText },
  { task: "Create location pages", mode: "Automatic", detail: "Created for you", outcome: "Builds local pages that attract nearby buyers", icon: MapPin },
  { task: "Create FAQ and trust pages", mode: "Automatic", detail: "Created for you", outcome: "Strengthens entity trust, schema, and buyer confidence", icon: ShieldCheck },
  { task: "AI and schema optimization", mode: "Automatic", detail: "Optimized for you", outcome: "Adds structured signals AI engines can understand", icon: Code2 },
  { task: "Local listings sync", mode: "Automatic", detail: "Synced for you", outcome: "Keeps NAP details consistent across directories", icon: Layers3 },
  { task: "Google Business Profile", mode: "Automatic", detail: "Watched 24/7", outcome: "Tracks insights, posts, engagement, and changes", icon: Eye },
  { task: "Review requests", mode: "Automatic", detail: "Sent for you", outcome: "Asks happy customers at the right moment", icon: Star },
  { task: "AI search visibility", mode: "Automatic", detail: "Tracked for you", outcome: "Monitors your presence in answer engines", icon: Bot },
  { task: "Publish and apply fixes", mode: "One approval", detail: "You approve, then we run it", outcome: "Keeps control in your hands where it matters", icon: Zap },
];

const comparisonRows = [
  ["AI visibility monitoring", "Automatic", "Limited", "Limited", "Partial"],
  ["Repair plan after scan", "Automatic", "Manual", "Manual", "Manual"],
  ["Service and location page generation", "Automatic", "Limited", "Limited", "Partial"],
  ["FAQ, trust pages, and schema assets", "Automatic", "Limited", "Manual", "Partial"],
  ["Local listings sync", "Automatic", "Automatic", "Manual", "Partial"],
  ["Google Business Profile monitoring", "Automatic", "Partial", "Manual", "Partial"],
  ["Review request workflow", "Automatic", "Limited", "Partial", "Limited"],
  ["Competitor monitoring", "Automatic", "Limited", "Partial", "Manual"],
  ["Growth opportunity discovery", "Automatic", "Limited", "Partial", "Partial"],
  ["Fix execution", "One approval", "Manual", "Manual", "Manual"],
];

const comparisonColumns = ["Geothority", "Yext", "BrightLocal", "Semrush Local"];

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
    title: "Local SEO System",
    icon: Search,
    text: "Find and prioritize the Google, Maps, citation, service-area, and content gaps that suppress local demand.",
    accent: "from-indigo-500 to-violet-500",
  },
  {
    title: "AEO Monitoring",
    icon: Bot,
    text: "Track whether AI engines mention your business and what needs to improve for AI answer-engine visibility.",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    title: "Google Review Growth",
    icon: Star,
    text: "Procure more fresh 5-star Google reviews, capture private feedback, and strengthen the proof buyers and algorithms rely on.",
    accent: "from-amber-500 to-rose-500",
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
    text: "Generate structured data faster so search engines and AI engines can interpret your business more clearly.",
    accent: "from-amber-500 to-orange-500",
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

function AnimatedMetricValue({ value }: { value: string }) {
  const numeric = Number.parseInt(value, 10);
  const suffix = value.replace(String(Number.isNaN(numeric) ? "" : numeric), "");

  if (Number.isNaN(numeric)) {
    return (
      <motion.span
        animate={{ opacity: [0.72, 1, 0.72] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
      >
        {value}
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {numeric}
      <motion.span
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      >
        {suffix}
      </motion.span>
    </motion.span>
  );
}

function EngineLogo({ id, color }: { id: string; color: string }) {
  const shared = {
    width: 34,
    height: 34,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (id) {
    case "chatgpt":
      return (
        <svg {...shared} stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          {[0, 60, 120, 180, 240, 300].map((rotation) => (
            <path key={rotation} d="M24 10c6 0 9 5 6 10l-6 10-6-10c-3-5 0-10 6-10Z" transform={`rotate(${rotation} 24 24)`} />
          ))}
        </svg>
      );
    case "perplexity":
      return (
        <svg {...shared} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 8v32M34 8v32M9 18h30M9 30h30M14 8l20 20M34 8 14 28M14 40l20-20M34 40 14 20" />
        </svg>
      );
    case "claude":
      return (
        <svg {...shared} fill={color}>
          {[0, 30, 60, 90, 120, 150].map((rotation) => (
            <ellipse key={rotation} cx="24" cy="24" rx="5" ry="18" transform={`rotate(${rotation} 24 24)`} opacity="0.9" />
          ))}
        </svg>
      );
    case "gemini":
      return (
        <svg {...shared} fill={color}>
          <path d="M24 4c2.8 10.6 8.4 16.2 20 20-11.6 3.8-17.2 9.4-20 20-2.8-10.6-8.4-16.2-20-20C15.6 20.2 21.2 14.6 24 4Z" />
        </svg>
      );
    case "copilot":
      return (
        <svg {...shared}>
          <defs>
            <linearGradient id="copilotGradient" x1="8" x2="40" y1="8" y2="40">
              <stop stopColor="#00c2ff" />
              <stop offset="0.46" stopColor="#7c3aed" />
              <stop offset="1" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <path d="M15 10h12c5.8 0 10.5 4.7 10.5 10.5v7c0 5.8-4.7 10.5-10.5 10.5H15c-2.8 0-5-2.2-5-5V15c0-2.8 2.2-5 5-5Z" fill="url(#copilotGradient)" />
          <path d="M19 16h9c3.3 0 6 2.7 6 6v4c0 3.3-2.7 6-6 6h-9" stroke="white" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "grok":
      return (
        <svg {...shared} stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M37 11 11 37" />
          <path d="M14 18c5.5-8 17.5-8 22 0" />
          <path d="M34 30c-5.5 8-17.5 8-22 0" />
        </svg>
      );
    case "deepseek":
      return (
        <svg {...shared} fill={color}>
          <path d="M9 28c4-8 11-12 20-10 6 1.3 9.8 5.3 10.6 10.2 2.3.8 4.1 2.3 5.4 4.8-5.8.2-9.9-1.1-12.6-3.6-3.1 4.6-9 7.6-15.6 6.1C11.4 34.4 8.2 31.5 9 28Z" opacity="0.9" />
          <circle cx="19" cy="24" r="2.2" fill="white" />
          <path d="M29 17c-1.8-4.8 1-8.4 5.6-10.4.4 5-1.6 8.8-5.6 10.4Z" />
        </svg>
      );
    case "meta":
      return (
        <svg {...shared} stroke={color} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 31c3.1-13.2 8.1-19.4 14.7-8.2l2.6 4.4C31.9 38.4 36.9 32.2 40 19" />
          <path d="M8 31c5.2-15.2 11.3-15.2 17.3-3.8C31.4 38.6 37.5 38.6 40 19" opacity="0.55" />
        </svg>
      );
    case "you":
      return (
        <svg {...shared} fill={color}>
          <path d="M24 5 40.5 14.5v19L24 43 7.5 33.5v-19L24 5Z" />
          <path d="M17 20h14v8H17z" fill="white" opacity="0.9" />
        </svg>
      );
    case "mistral":
      return (
        <svg {...shared} fill={color}>
          <path d="M8 11h8v8H8zM16 19h8v8h-8zM24 11h8v8h-8zM32 19h8v8h-8zM8 27h8v10H8zM32 27h8v10h-8z" />
          <path d="M16 27h16v10H16z" fill="#dc2626" />
        </svg>
      );
    case "brave":
      return (
        <svg {...shared} fill={color}>
          <path d="M24 5 38 10l4 11-5 16-13 6-13-6-5-16 4-11L24 5Z" />
          <path d="M17 18h14l-3 6 3 6H17l3-6-3-6Z" fill="white" opacity="0.92" />
        </svg>
      );
    case "phind":
      return <span className="font-serif text-[40px] font-bold leading-none text-slate-950">p</span>;
    case "iask":
      return (
        <svg {...shared} stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="9" width="28" height="30" rx="8" />
          <path d="M17 22h.1M31 22h.1M18 29c3.8 3 8.2 3 12 0" />
        </svg>
      );
    case "qwen":
      return (
        <svg {...shared} stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 6v36M6 24h36M11 11l26 26M37 11 11 37" />
          <circle cx="24" cy="24" r="8" fill="white" />
          <circle cx="24" cy="24" r="5" fill={color} stroke="none" />
        </svg>
      );
    case "cohere":
      return (
        <svg {...shared} fill={color}>
          <circle cx="17" cy="18" r="9" />
          <circle cx="30" cy="28" r="11" opacity="0.72" />
          <circle cx="17" cy="32" r="5" opacity="0.48" />
        </svg>
      );
    default:
      return <Bot className="h-8 w-8" style={{ color }} />;
  }
}

function AiEnginesMonitorBand() {
  const marqueeEngines = [...aiEngines, ...aiEngines];

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/14 sm:p-7">
        <div className="relative">
          <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-emerald-400/16 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] !text-cyan-100">
                <Bot className="h-3.5 w-3.5" /> AI engines Geothority monitors
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em] !text-white sm:text-4xl">
                AEO becomes real when you can see the engines being watched.
              </h2>
              <p className="mt-4 text-sm leading-6 !text-slate-200 sm:text-base sm:leading-7">
                Geothority tracks whether your business is understandable, citeable, and visible across the AI answer systems buyers already use.
              </p>
            </div>
            <div className="relative lg:w-[54%]">
              <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.2em] !text-slate-400">
                <span>15 monitored AI engines</span>
                <span>Live AEO watchlist</span>
              </div>
              <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.06] py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 to-transparent" />
                <motion.div
                  className="flex w-max gap-3 px-4"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                >
                  {marqueeEngines.map((engine, index) => (
                    <div
                      key={`${engine.id}-${index}`}
                      className="relative flex h-[120px] w-[136px] shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08] px-3 pb-3 pt-4 text-center shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
                    >
                      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${engine.tone}`} />
                      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/14 bg-white shadow-sm">
                        <EngineLogo id={engine.id} color={engine.color} />
                      </div>
                      <div className="mt-2.5 text-sm font-semibold leading-none !text-white">{engine.name}</div>
                      <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] !text-slate-400">{engine.signal}</div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AutomationScorecardSection() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20" id="what-you-get">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
              <Zap className="h-3.5 w-3.5" /> What Geothority does for you
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
              More automation. Less work. Better results.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Geothority turns the product promise into proof fast: it scans, identifies, creates, syncs, requests, monitors, and queues the few actions that need approval.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {automationStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: index * 0.06, duration: 0.42 }}
                    className="group rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/7"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-3xl font-semibold tracking-[-0.06em] text-slate-950"><AnimatedMetricValue value={stat.value} /></div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{stat.label}</div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{stat.detail}</p>
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              We do the work. You get the results. That is the simple operating promise behind the whole platform.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[42px] bg-[linear-gradient(135deg,rgba(79,70,229,0.16),rgba(20,184,166,0.12),rgba(16,185,129,0.1))] blur-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
              className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/12 sm:p-5"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400" />
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#eef7f4)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-700">Autopilot engine</div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Your business visibility workflow, handled</h3>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4 }}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700"
                  >
                    Live monitor
                  </motion.div>
                </div>

                <div className="mt-6 max-h-[520px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[1.05fr_0.82fr_1.13fr] bg-slate-950 text-[10px] font-bold uppercase tracking-[0.18em] !text-white">
                    <div className="px-3 py-3 sm:px-4">Does for you</div>
                    <div className="bg-emerald-700 px-3 py-3 sm:px-4">Geothority</div>
                    <div className="px-3 py-3 sm:px-4">How it works</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {whatGeothorityDoes.map((row, index) => {
                      const Icon = row.icon;
                      return (
                        <motion.div
                          key={row.task}
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ delay: index * 0.025, duration: 0.28 }}
                          className="grid grid-cols-[1.05fr_0.82fr_1.13fr] items-center text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 px-3 py-2.5 font-semibold text-slate-900 sm:px-4">
                            <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
                            <span>{row.task}</span>
                          </div>
                          <div className="px-3 py-2.5 sm:px-4">
                            <div className="flex items-center gap-2 font-bold uppercase tracking-[0.12em] text-emerald-700">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span className="text-[10px]">{row.mode}</span>
                            </div>
                            <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{row.detail}</div>
                          </div>
                          <div className="px-3 py-2.5 text-[11px] leading-5 text-slate-600 sm:px-4 sm:text-xs">{row.outcome}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] !text-slate-300">
                    <span>Opportunity map</span>
                    <span>Google + AI + Reviews</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {["Schema", "Trust pages", "Listings", "Competitors", "Reviews", "Local content"].map((item, index) => (
                      <motion.div
                        key={item}
                        animate={{ opacity: [0.72, 1, 0.72] }}
                        transition={{ repeat: Infinity, duration: 2.8, delay: index * 0.12 }}
                        className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-medium !text-slate-100"
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonStatus({ value, featured = false }: { value: string; featured?: boolean }) {
  const isStrong = value === "Automatic";
  const isApproval = value === "One approval";
  const tone = isStrong
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : isApproval
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : value === "Limited"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone} ${featured ? "shadow-sm" : ""}`}>
      {isStrong ? <CheckCircle2 className="h-3.5 w-3.5" /> : isApproval ? <Zap className="h-3.5 w-3.5" /> : value === "Limited" ? <X className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {value}
    </div>
  );
}

function StacksUpTeaserSection({ onOpen }: { onOpen: () => void }) {
  const previewRows = comparisonRows.slice(0, 5);

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-800">
            <BarChart3 className="h-3.5 w-3.5" /> How Geothority stacks up
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
            See why Geothority feels different from passive local SEO tools.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Most tools make you interpret the work. Geothority is built to move more of the work forward automatically, then ask for approval where control matters.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["Automatic", "Included where supported"],
              ["One approval", "Control where it matters"],
              ["Manual", "What older workflows force"],
            ].map(([label, text]) => (
              <div key={label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <ComparisonStatus value={label} featured={label === "Automatic"} />
                <div className="mt-3 text-sm font-semibold text-slate-900">{text}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold !text-white shadow-xl shadow-slate-950/16 transition hover:-translate-y-0.5 hover:bg-indigo-950"
          >
            View full stack-up <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <motion.button
          type="button"
          onClick={onOpen}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="group relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-4 text-left shadow-2xl shadow-slate-950/10 transition hover:-translate-y-1 hover:shadow-slate-950/16"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#edfdf6)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">Competitive proof</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Geothority versus passive local SEO tools</h3>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Tap to expand</div>
            </div>
            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="grid grid-cols-[1.15fr_0.85fr_0.85fr] bg-slate-950 text-[10px] font-bold uppercase tracking-[0.16em] !text-white">
                <div className="px-3 py-3">Capability</div>
                <div className="bg-emerald-700 px-3 py-3 text-center">Geo</div>
                <div className="px-3 py-3 text-center">Others</div>
              </div>
              {previewRows.map((row, index) => (
                <motion.div
                  key={row[0]}
                  animate={{ backgroundColor: index === 1 ? ["#ffffff", "#ecfdf5", "#ffffff"] : "#ffffff" }}
                  transition={{ repeat: Infinity, duration: 3.2, delay: index * 0.18 }}
                  className="grid grid-cols-[1.15fr_0.85fr_0.85fr] items-center border-t border-slate-100"
                >
                  <div className="px-3 py-3 text-sm font-semibold text-slate-900">{row[0]}</div>
                  <div className="px-2 py-3 text-center"><ComparisonStatus value={row[1]} featured /></div>
                  <div className="px-2 py-3 text-center"><ComparisonStatus value={row.slice(2).includes("Manual") ? "Manual" : row.slice(2).includes("Limited") ? "Limited" : "Partial"} /></div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.button>
      </div>
    </section>
  );
}

function ComparisonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="How Geothority stacks up">
      <button type="button" aria-label="Close comparison" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/12 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-5 sm:px-7">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">Full comparison</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">How Geothority stacks up</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Green means included or automated, amber means approval-driven, and red/gray means limited or manual.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-950 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-auto p-4 sm:p-6">
          <div className="min-w-[820px] overflow-hidden rounded-[24px] border border-slate-200">
            <div className="grid grid-cols-[1.4fr_repeat(4,0.85fr)] bg-slate-950 text-[10px] font-bold uppercase tracking-[0.16em] !text-white">
              <div className="px-4 py-3">Capability</div>
              {comparisonColumns.map((column, index) => (
                <div key={column} className={`px-3 py-3 text-center ${index === 0 ? "bg-emerald-700" : ""}`}>{column}</div>
              ))}
            </div>
            {comparisonRows.map((row) => (
              <div key={row[0]} className="grid grid-cols-[1.4fr_repeat(4,0.85fr)] items-center border-t border-slate-100 bg-white">
                <div className="px-4 py-3 text-sm font-semibold text-slate-900">{row[0]}</div>
                {row.slice(1).map((value, index) => (
                  <div key={`${row[0]}-${index}`} className="px-3 py-3 text-center">
                    <ComparisonStatus value={value} featured={index === 0} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  const trustCards = [
    { label: "AI visibility", text: "Mention coverage improving after entity scan", badge: "+12", tone: "emerald", delay: 0.1 },
    { label: "Listings", text: "3 directories ready to sync, 1 mismatch flagged", badge: "3 synced", tone: "cyan", delay: 0.22 },
    { label: "Trust pages", text: "Priority page and schema package ready", badge: "Ready", tone: "amber", delay: 0.34 },
  ];

  return (
    <div className="relative mx-auto max-w-2xl lg:max-w-none" aria-label="Animated Geothority Trust Stack dashboard preview">
      <div className="absolute -inset-x-7 bottom-4 top-10 rounded-[42px] bg-[linear-gradient(135deg,rgba(79,70,229,0.18),rgba(20,184,166,0.14)_46%,rgba(15,23,42,0.08))] blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 18, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="relative rounded-[34px] border border-slate-200 bg-white/88 p-3 shadow-[0_36px_110px_rgba(15,23,42,0.16)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 rounded-[34px] bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(255,255,255,0.22)_36%,rgba(20,184,166,0.08))]" />
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-0.25, 0.25, -0.25] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef4ff_58%,#e6f7f4)] p-4 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-5"
        >
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(20,184,166,0.16),transparent)]"
            animate={{ opacity: [0.45, 0.85, 0.45] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -left-10 top-0 h-full w-24 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)]"
            animate={{ x: ["-20%", "760%"] }}
            transition={{ repeat: Infinity, duration: 5.8, ease: "easeInOut", repeatDelay: 1.2 }}
          />

          <div className="relative grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="mx-auto w-full max-w-[310px] rounded-[30px] border border-slate-300 bg-slate-950 p-2 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="relative overflow-hidden rounded-[24px] bg-[#f8fbff] p-4">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Dashboard</div>
                    <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Trust Stack Score</h3>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2.2 }}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700"
                  >
                    Live
                  </motion.div>
                </div>

                <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(from_225deg,#4f46e5_0deg,#0ea5e9_108deg,#34d399_238deg,#e2e8f0_238deg)] p-2.5">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 7.5, ease: "linear" }}
                      className="absolute inset-1 rounded-full border border-emerald-300/20 border-t-emerald-400"
                    />
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-50">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.5 }}
                        className="text-5xl font-semibold tracking-[-0.07em] text-slate-950"
                      >
                        78
                      </motion.div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-600">out of 100</div>
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2.2 }}
                        className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> scanning live
                      </motion.div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-sm font-semibold text-emerald-950">
                    +14 points available
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["AI Visibility", "Listings", "Trust Pages", "Brief"].map((label, index) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + index * 0.08, duration: 0.42 }}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: "18%" }}
                          animate={{ width: `${index === 0 ? 82 : index === 1 ? 68 : index === 2 ? 74 : 88}%` }}
                          transition={{ delay: 0.65 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-center gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">Executive visibility view</div>
                    <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">Scanning the signals buyers trust</div>
                  </div>
                  <Radar className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="grid gap-2">
                  {["Google profile", "Directory citations", "Review authority", "AI answer coverage"].map((signal, index) => (
                    <div key={signal} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <motion.span
                        animate={{ scale: [1, 1.35, 1], opacity: [0.55, 1, 0.55] }}
                        transition={{ repeat: Infinity, duration: 1.8, delay: index * 0.25 }}
                        className="h-2 w-2 rounded-full bg-emerald-400"
                      />
                      <span className="text-sm font-medium text-slate-800">{signal}</span>
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">checked</span>
                    </div>
                  ))}
                </div>
              </div>

              {trustCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: card.delay, duration: 0.5 }}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-800">{card.label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-800">{card.text}</div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ repeat: Infinity, duration: 2.3, delay: index * 0.25 }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${card.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : card.tone === "cyan" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {card.badge}
                    </motion.div>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="rounded-2xl border border-amber-300 bg-[linear-gradient(135deg,rgba(254,243,199,0.98),rgba(255,255,255,1))] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-900">Operator brief</div>
                    <div className="mt-2 text-sm leading-6 text-slate-800">3 high-leverage moves queued for review</div>
                  </div>
                  <motion.div animate={{ rotate: [-8, 8, -8], scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.8 }}>
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </motion.div>
                </div>
              </motion.div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
          </div>
        </motion.div>
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
            <motion.div
              key={bullet}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.34 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">{index + 1}</span>
                  <span className="text-sm font-medium capitalize text-slate-800">{bullet}</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: index * 0.18 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-600">
            <span>Fix progress</span>
            <span>This week</span>
          </div>
          <div className="flex h-24 items-end gap-2">
            {[28, 44, 37, 59, 53, 70, 64, 86].map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 8 }}
                animate={{ height }}
                transition={{ delay: 0.08 + index * 0.05, duration: 0.55, ease: "easeOut" }}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-cyan-300"
              />
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
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const active = tabs[activeTab];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(20,184,166,0.1),transparent_26%)]" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/90 bg-white/94 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/88">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" size={32} className="text-slate-950" />

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">Features</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">How It Works</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">Pricing</Link>
            <Link href="/compare/geothority-vs-moz-local" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">Compare</Link>
            <Link href="/service-facts" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">What You Get</Link>
            <Link href="/faq" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">FAQ</Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-slate-700 transition hover:text-slate-950">Sign In</Link>
            <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white shadow-lg shadow-slate-950/18 transition hover:-translate-y-0.5 hover:bg-slate-800">
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
            <Link href="/signup" className="mt-2 block rounded-full bg-slate-950 py-3 text-center text-base font-semibold !text-white">Get Free Scan</Link>
          </div>
        )}
      </nav>

      <main className="relative">
        <section className="overflow-hidden px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Local SEO + AEO + Google reviews
              </div>
              <h1 className="mt-7 max-w-5xl text-[2.55rem] font-semibold leading-[0.96] tracking-[-0.07em] text-slate-950 sm:text-5xl lg:text-[5.15rem]">
                Automated Local SEO, AEO, and 5-star review growth.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
                Geothority helps local businesses get found on Google, become easier for AI engines to understand and recommend, and procure fresh Google reviews from happy customers.
              </p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                AEO means AI Engine Optimization: making your business easier for AI answer engines to understand, trust, and recommend. Together with Local SEO and reputation growth, it makes your business clearer, more visible, and easier to choose.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-950 px-7 py-[1.1rem] text-base font-semibold !text-white shadow-xl shadow-indigo-950/18 transition hover:-translate-y-0.5 hover:bg-indigo-900">
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
                  "Google Maps and local search fixes",
                  "AI answer-engine readiness",
                  "5-star review momentum",
                ].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-slate-950 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-medium leading-6 text-slate-800">Built for insurance agencies and local businesses that want automated visibility work, not another passive SEO report.</p>
            </motion.div>

            <HeroVisual />
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 sm:pb-10">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {outcomePillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.08, duration: 0.45 }}
                    className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pillar.accent}`} />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">{pillar.eyebrow}</div>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{pillar.title}</h2>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${pillar.accent} text-white shadow-lg shadow-slate-950/12`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{pillar.text}</p>
                    <div className="mt-5 grid gap-2">
                      {pillar.proof.map((item) => (
                        <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <AiEnginesMonitorBand />

        <AutomationScorecardSection />

        <section className="px-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-[30px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/5 sm:grid-cols-2 lg:grid-cols-4">
            {trustMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ delay: index * 0.06, duration: 0.42 }}
                className="rounded-3xl bg-slate-50 px-5 py-5"
              >
                <div className="text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                  <AnimatedMetricValue value={metric.value} />
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">{metric.label}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{metric.detail}</div>
              </motion.div>
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
              title="Find what&apos;s suppressing local SEO, AEO, and review momentum. Fix what can be fixed."
              text="Geothority turns scattered SEO, AI visibility, and reputation work into a more disciplined scan, fix, and monitor workflow."
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
              title="Local SEO, AEO, and reputation growth in one platform."
              text="Geothority helps serious operators improve Google visibility, answer-engine readiness, citation consistency, competitor response, and review momentum from one operating system."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45 }}
                    className="group overflow-hidden rounded-[30px] border border-slate-300 bg-white p-6 shadow-md shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/8"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-lg shadow-slate-950/12`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-[15px] leading-6 text-slate-700">{feature.text}</p>
                    <div className="relative mt-7 h-16 overflow-hidden rounded-2xl bg-slate-50 p-3">
                      <motion.div
                        className="pointer-events-none absolute inset-y-0 -left-8 w-14 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.82),transparent)]"
                        animate={{ x: ["0%", "680%"] }}
                        transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut", repeatDelay: 1.4 }}
                      />
                      {feature.title === "Local SEO System" && (
                        <div className="flex h-full items-center gap-2">
                          {[74, 68, 82, 57].map((score, index) => (
                            <div key={index} className="flex-1">
                              <div className="mb-1 h-2 rounded-full bg-slate-200">
                                <motion.div
                                  initial={{ width: "12%" }}
                                  whileInView={{ width: `${score}%` }}
                                  viewport={{ once: true }}
                                  transition={{ delay: index * 0.08, duration: 0.7, ease: "easeOut" }}
                                  className={`h-full rounded-full bg-gradient-to-r ${feature.accent}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "AEO Monitoring" && (
                        <div className="flex h-full items-center justify-between px-1">
                          {["ChatGPT", "Gemini", "Perplexity"].map((label, index) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                              <motion.div
                                animate={{ scale: index === 1 ? [1.1, 1.35, 1.1] : [1, 1.18, 1], opacity: [0.55, 1, 0.55] }}
                                transition={{ repeat: Infinity, duration: 2, delay: index * 0.28 }}
                                className={`h-3 w-3 rounded-full bg-gradient-to-r ${feature.accent}`}
                              />
                              <div className="text-[10px] font-medium text-slate-600">{label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Google Review Growth" && (
                        <div className="space-y-2">
                          {[5, 5, 4.8].map((rating, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5">
                              <motion.div
                                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ repeat: Infinity, duration: 1.9, delay: index * 0.18 }}
                                className="flex text-amber-400"
                              >
                                <Star className="h-3.5 w-3.5 fill-current" />
                              </motion.div>
                              <div className="text-[10px] font-semibold text-slate-700">{rating.toFixed(index === 2 ? 1 : 0)} star review request</div>
                              <div className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700">sent</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Citation & Listing Review" && (
                        <div className="space-y-2">
                          {[true, false, true].map((matched, index) => (
                            <div key={index} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5">
                              <motion.span
                                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ repeat: Infinity, duration: 1.7, delay: index * 0.2 }}
                                className={`h-2.5 w-2.5 rounded-full ${matched ? "bg-emerald-400" : "bg-rose-400"}`}
                              />
                              <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                                <motion.div
                                  initial={{ width: "16%" }}
                                  whileInView={{ width: matched ? "100%" : "66%" }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.65, delay: index * 0.12 }}
                                  className={`h-full rounded-full ${matched ? "bg-emerald-400" : "bg-rose-400"}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Schema Generation" && (
                        <div className="space-y-2 rounded-2xl bg-slate-950 px-3 py-2 text-[10px] text-emerald-300">
                          {[
                            `${'{'}"@type": "LocalBusiness"${'}'}`,
                            `${'{'}"areaServed": "Tampa"${'}'}`,
                            `${'{'}"sameAs": [ ... ]${'}'}`,
                          ].map((line, index) => (
                            <motion.div
                              key={line}
                              initial={{ opacity: 0, x: -8 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.16, duration: 0.35 }}
                            >
                              {line}
                            </motion.div>
                          ))}
                        </div>
                      )}
                      {feature.title === "Competitor Monitoring" && (
                        <div className="flex h-full items-end gap-1.5">
                          {[18, 24, 20, 42, 36, 58, 52].map((height, index) => (
                            <motion.div
                              key={index}
                              initial={{ height: 7 }}
                              whileInView={{ height }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.06, duration: 0.55, ease: "easeOut" }}
                              className={`flex-1 rounded-t bg-gradient-to-t ${feature.accent} ${index > 4 ? "opacity-100" : "opacity-60"}`}
                            />
                          ))}
                        </div>
                      )}
                      {! ["Local SEO System", "AEO Monitoring", "Google Review Growth", "Citation & Listing Review", "Schema Generation", "Competitor Monitoring"].includes(feature.title) && (
                        <div className="flex h-full items-end gap-1.5">
                          {[24, 38, 30, 52, 46, 62, 58].map((height, index) => (
                            <motion.div
                              key={index}
                              initial={{ height: 7 }}
                              whileInView={{ height }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.05, duration: 0.55 }}
                              className={`flex-1 rounded-t bg-gradient-to-t ${feature.accent} opacity-70 transition group-hover:opacity-100`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
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
            <div className="relative z-10">
              <div className="text-[13px] font-bold uppercase tracking-[0.2em] !text-cyan-50">Signature framework</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] !text-white [text-shadow:0_18px_48px_rgba(2,6,23,0.92)] sm:text-5xl">The Trust Stack powers your Local SEO, AEO, and review-growth plan.</h2>
              <p className="mt-6 text-lg leading-8 !text-slate-50">
                Instead of scattered reports and disconnected tasks, Geothority shows what is helping, what is holding back Google visibility, what weakens AI engine trust, what can be fixed now, and where review momentum needs attention.
              </p>
              <div className="mt-8 grid gap-3">
                {["Prioritize what matters most", "Separate signal from noise", "Spot fixable issues faster"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/28 bg-slate-950/42 px-4 py-3 !text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" /> {item}
                  </div>
                ))}
              </div>
              <Link href="#platform" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50">
                Explore the Platform <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm !text-slate-100">Built to make visibility work feel more like a system and less like guesswork.</p>
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

        <StacksUpTeaserSection onOpen={() => setComparisonOpen(true)} />

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
                <div key={plan.name} className={`rounded-[32px] border p-7 ${plan.featured ? "border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/18" : "border-slate-200 bg-white text-slate-950 shadow-sm"}`}>
                  {plan.featured && <div className="mb-4 inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Recommended</div>}
                  <h3 className={`text-2xl font-semibold tracking-[-0.04em] ${plan.featured ? "!text-white" : "text-slate-950"}`}>{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <div className={`text-4xl font-semibold tracking-[-0.06em] ${plan.featured ? "!text-white" : "text-slate-950"}`}>{plan.price}</div>
                    <div className={`pb-1 text-sm ${plan.featured ? "text-white/78" : "text-slate-500"}`}>/month</div>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${plan.featured ? "text-slate-100" : "text-slate-600"}`}>{plan.intro}</p>
                  <div className="mt-7 space-y-3">
                    {plan.bullets.map((bullet) => (
                      <div key={bullet} className={`flex items-center gap-3 text-sm ${plan.featured ? "text-slate-100" : "text-slate-700"}`}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {bullet}
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing" className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold transition ${plan.featured ? "bg-white text-slate-950 hover:bg-emerald-50" : "bg-slate-950 !text-white hover:bg-slate-800"}`}>
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
              <h2 className="text-3xl font-semibold tracking-[-0.05em] !text-white sm:text-5xl">See what is suppressing your visibility.</h2>
              <p className="mt-5 text-lg leading-8 !text-slate-100">Run your first scan in about 90 seconds and get a clearer action path across local search and AI visibility.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-50">Get Free Scan <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-white/45 bg-white/5 px-7 py-4 font-semibold !text-white transition hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/12">See Pricing</Link>
              </div>
              <p className="mt-6 text-sm !text-slate-200">Built for ambitious local operators who want clarity, not more noise.</p>
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

      <ComparisonModal open={comparisonOpen} onClose={() => setComparisonOpen(false)} />
    </div>
  );
}
