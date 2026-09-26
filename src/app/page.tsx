"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Bot, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, FileSearch, FileText, MapPin, Menu, Search,
  ShieldCheck, Sparkles, Star, X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { WorkflowExample } from "@/components/home/workflow-example";

const examples = [
  {
    name: "Insurance agencies", shortName: "Insurance", business: "An independent insurance agency",
    search: "home insurance agent near me", href: "/insurance-agents",
    issue: "Help customers get to know your agency.",
    finding: "The scan did not detect a link to an About page on the page it checked.",
    why: "A prospective client may want to know who is behind the agency before asking for a quote.",
    next: "Add or clearly link to an About page with your team, verified credentials, local experience, and a way to contact you.",
    help: "Flag the missing About-page link and use Authority’s content tools to prepare a draft.",
    owner: "Approve product descriptions and coverage wording. Publish through your website provider or a supported connection.",
    prompt: "Make your experience easier for local insurance shoppers to discover.",
  },
  {
    name: "Home service businesses", shortName: "Home services", business: "A local plumbing company",
    search: "plumber in my area", href: "/for/home-services",
    issue: "Make your service area easier to find.",
    finding: "The scan did not detect a service-area page link on the page it checked.",
    why: "Someone with a plumbing problem wants to know whether you can help at their address.",
    next: "Add clear service-area information and helpful details about the work offered in each location.",
    help: "Flag the missing service-area link and prepare a draft with Authority’s content tools.",
    owner: "Confirm locations, availability, and service claims. Have your website provider publish approved changes.",
    prompt: "Help nearby homeowners understand where you work and how you can help.",
  },
  {
    name: "Accountants & professional services", shortName: "Professional services", business: "A local accounting firm",
    search: "small business accountant nearby", href: "/for/accountants",
    issue: "Make common questions easier to answer.",
    finding: "The scan did not detect a link to an FAQ page on the page it checked.",
    why: "A prospective client wants to know whether your experience matches their needs.",
    next: "Add or clearly link to useful FAQs about your specialties, what to bring, and how a first consultation works.",
    help: "Flag the missing FAQ link and use Authority’s content tools to draft answers for review.",
    owner: "Review advice, qualifications, and service details before publishing the content.",
    prompt: "Give prospective clients a clearer picture of your expertise.",
  },
  {
    name: "Dental & local practices", shortName: "Local practices", business: "A neighborhood dental practice",
    search: "dentist accepting new patients", href: "/for/dentists",
    issue: "Make it easier to call your practice.",
    finding: "The scan did not detect a phone number in the page content it checked.",
    why: "Someone ready to request an appointment should be able to find the right phone number quickly.",
    next: "Check that the correct phone number is visible and clickable in the website header and contact section.",
    help: "Flag the missing phone number and provide a suggested click-to-call link template.",
    owner: "Confirm the right appointment number and ask your website provider to add the link.",
    prompt: "Help prospective patients find your practice and understand their next step.",
  },
];

const questions = [
  {
    question: "What do I get for free?",
    answer: "Create a free account and scan your business website. You get a visibility report with findings and suggested next steps, with up to three scan requests in a rolling 24-hour window. No credit card is required for the Free plan. Content generation, review workflows, and deeper monitoring depend on your paid plan.",
  },
  {
    question: "Will this work with my existing website?",
    answer: "You can scan an existing public business website without moving it. Applying changes depends on your website platform and available connections. Some work can be completed through a supported integration; other changes need you or your website provider to install or publish them.",
  },
  {
    question: "How much work will I need to do?",
    answer: "Start with your website address and business details. Then review the priorities, confirm that business information is accurate, and approve content before it is published. Setup and ongoing effort depend on the issues found, your plan, and who manages your website. The first scan helps you see that work clearly.",
  },
  {
    question: "Do I need to upload a customer list?",
    answer: "No customer list is needed for a website scan. If you choose to use review requests later, that workflow needs customer contact information and a configured sending service. Invite customers consistently to share honest feedback, with the same public review option for everyone.",
  },
  {
    question: "Does Geothority guarantee rankings or new customers?",
    answer: "No. Search positions, AI answers, and customer decisions depend on many factors. Geothority helps you find gaps, organize improvements, and monitor available signals over time. A visibility score is a diagnostic tool, not a promise of traffic, calls, or sales.",
  },
  {
    question: "Is this a lead service or a replacement for my CRM?",
    answer: "Geothority focuses on your business’s own online visibility and reputation. It does not sell you a list of leads or replace your customer-management system. Keep using the tools that manage your customers and sales.",
  },
];

const plans = [
  { name: "Free", price: "0", description: "Understand where you stand.", features: ["3 scan requests in 24 hours", "Visibility findings and priorities", "No credit card required"], action: "Get my free scan", href: "/signup" },
  { name: "Starter", price: "97", description: "Build a regular improvement routine.", features: ["Single-business visibility baseline", "Listing checks and priorities", "Email support"], action: "Explore Starter", href: "/pricing" },
  { name: "Growth", price: "197", description: "Bring more of the work together.", features: ["AI and competitor visibility checks", "Supported listing sync", "Review workflows"], action: "Explore Growth", href: "/pricing" },
  { name: "Authority", price: "297", description: "Support a broader online presence.", features: ["Service, local, and FAQ drafts", "Expanded reporting tools", "Onboarding support"], action: "Explore Authority", href: "/pricing" },
];

const primaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-semibold !text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";
const secondaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-900 transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";
const container = "mx-auto max-w-7xl px-5 sm:px-8";

function SectionIntro({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return <div className="max-w-2xl">
    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">{label}</p>
    <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h2>
    {children && <p className="mt-4 text-lg leading-8 text-slate-600">{children}</p>}
  </div>;
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const example = examples[activeExample];
  const nav = [
    ["How it works", "#how-it-works"], ["For your business", "#industries"],
    ["Pricing", "#pricing"], ["Questions", "#questions"],
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100">
      <a href="#main-content" className="sr-only z-[60] rounded-lg bg-white p-4 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className={`${container} flex h-20 items-center justify-between gap-5`}>
          <Logo size={33} />
          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {nav.map(([label, href]) => <a key={href} href={href} className="text-sm font-medium text-slate-600 transition hover:text-emerald-700">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-emerald-700">Sign in</Link>
            <Link href="/signup" className={`${primaryButton} !min-h-10 !px-4 !py-2.5 !text-sm`}>Get my free scan <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 lg:hidden">
            {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-2 py-3 font-medium text-slate-700 hover:bg-slate-50">{label}</a>)}
          <Link href="/login" className="block px-2 py-3 font-medium text-slate-700">Sign in</Link>
          <Link href="/signup" className={`${primaryButton} mt-3 w-full`}>Get my free scan <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </nav>}
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(ellipse_at_85%_25%,#e2f3f0,transparent_55%),linear-gradient(120deg,#fff,#f6f8fc)] pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className={`${container} grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14`}>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800"><MapPin className="h-4 w-4" aria-hidden="true" /> For small businesses with local customers</p>
              <h1 className="mt-6 max-w-2xl text-[2.8rem] font-semibold leading-[1.06] tracking-[-0.05em] text-slate-950 sm:text-[3.8rem] xl:text-[4.1rem]">Help more local customers <span className="text-emerald-700">find and choose</span> your business.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">You know your business. Geothority automates the website scan, explains what needs attention, and helps you prepare improvements. Start with a free report and a clear next step.</p>
              <div className="mt-8 flex flex-col gap-3 sm:items-start xl:flex-row">
                <Link href="/signup" className={primaryButton}>Check my business’s visibility <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
                <a href="#sample-report" className="inline-flex min-h-12 items-center justify-center gap-2 px-1 py-3 text-base font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-emerald-700">See a sample report <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">Free account. No credit card required.</p>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-slate-200 pt-6 text-sm font-medium text-slate-600">
                {["Google & local search", "AI search readiness", "Honest customer reviews"].map(item => <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />{item}</span>)}
              </div>
            </div>

            <WorkflowExample />
          </div>
        </section>

        <section id="features" className="scroll-mt-24 py-16 sm:py-20">
          <div className={container}>
            <SectionIntro label="Be easier to find. Easier to trust." title="Good at what you do. Ready for more people to know it.">Give your online presence the same care you give your customers.</SectionIntro>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                { icon: Search, title: "Find the gaps in local visibility", text: "Check your website and business information for issues that make it harder to understand your services, location, and expertise." },
                { icon: Bot, title: "Make your business clearer to AI", text: "Organize useful content and consistent business facts. Explore AI visibility checks to understand available mentions and gaps." },
                { icon: Star, title: "Build trust with honest reviews", text: "Use review workflows to invite customer feedback and organize follow-up. Every customer gets the same public review option.", id: "reviews" },
              ].map(item => <article key={item.title} id={item.id} className="scroll-mt-24 border-t-2 border-emerald-700/25 pt-6"><item.icon className="h-7 w-7 text-emerald-700" aria-hidden="true" /><h3 className="mt-5 text-xl font-semibold leading-7 tracking-tight text-slate-950">{item.title}</h3><p className="mt-3 text-base leading-7 text-slate-600">{item.text}</p></article>)}
            </div>
            <p className="mt-7 text-sm leading-6 text-slate-500">Start with a free website scan. Additional tools and monitoring depend on your plan and connected services.</p>
          </div>
        </section>

        <section id="industries" className="scroll-mt-24 border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className={container}>
            <SectionIntro label="For businesses like yours" title="Different businesses. A familiar challenge.">When customers search nearby, your services and experience should be easy to understand. See what an improvement could look like in your industry.</SectionIntro>
            <div id="sample-report" className="scroll-mt-28 pt-8">
              <span id="platform" className="scroll-mt-28" />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a sample business">
                {examples.map((item, i) => <button key={item.shortName} type="button" aria-pressed={activeExample === i} aria-controls="sample-business-report" onClick={() => setActiveExample(i)} className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${activeExample === i ? "border-slate-950 bg-slate-950 !text-white" : "border-slate-300 bg-white text-slate-600 hover:border-emerald-700 hover:text-emerald-700"}`}>{item.shortName}</button>)}
              </div>
              <div id="sample-business-report" className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-live="polite" aria-atomic="true">
                <div className="grid lg:grid-cols-[0.85fr_1.4fr]">
                  <div className="border-b border-slate-200 bg-[#eff5f3] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Illustrative example • {example.shortName}</p>
                    <h3 className="mt-4 text-2xl font-semibold leading-8 tracking-tight text-slate-950">{example.business}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-600">{example.prompt}</p>
                    <div className="mt-7 rounded-xl border border-slate-200 bg-white px-4 py-4"><p className="text-xs font-medium uppercase tracking-wider text-slate-500">What a customer might search</p><p className="mt-2 flex items-start gap-2 text-sm font-medium leading-6 text-slate-800"><Search className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{example.search}</p></div>
                    <Link href={example.href} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4">Explore {example.shortName.toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                  </div>
                  <div className="p-6 sm:p-8">
                    <h4 className="text-xl font-semibold text-slate-950">{example.issue}</h4>
                    <dl className="mt-5 space-y-5 text-sm leading-6">
                      <div><dt className="font-semibold text-slate-900">What the report could flag</dt><dd className="mt-1 text-slate-600">{example.finding}</dd></div>
                      <div><dt className="font-semibold text-slate-900">Why it matters</dt><dd className="mt-1 text-slate-600">{example.why}</dd></div>
                      <div><dt className="font-semibold text-slate-900">Suggested next step</dt><dd className="mt-1 text-slate-600">{example.next}</dd></div>
                    </dl>
                    <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2"><div><p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Sparkles className="h-4 w-4" aria-hidden="true" /> Geothority helps</p><p className="mt-2 text-sm leading-6 text-slate-600">{example.help}</p></div><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /> You stay in control</p><p className="mt-2 text-sm leading-6 text-slate-600">{example.owner}</p></div></div>
                  </div>
                </div>
                <p className="border-t border-slate-200 px-6 py-4 text-xs leading-5 text-slate-500 sm:px-8">These examples explain the process. A scan can miss information that loads dynamically or appears elsewhere on your site; check each finding before making changes. Drafting and execution tools vary by plan and connection.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {examples.map(item => <Link href={item.href} key={item.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700">{item.name}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-20">
          <div className={container}>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <SectionIntro label="A clear division of the work" title="Know what comes next. And who handles it." />
              <p className="text-lg leading-8 text-slate-600">Keep your existing website. Start with the scan, then decide which improvements to work on with Geothority and your website provider.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { number: "01", title: "See where you stand", icon: FileSearch, geo: "Scans your public website and organizes findings into a report.", you: "Create your free account and enter your website and business details." },
                { number: "02", title: "Prepare the improvements", icon: FileText, geo: "Offers priorities, content drafts, and technical assets through the tools included in your plan.", you: "Choose what to work on and check the accuracy of your business information and content." },
                { number: "03", title: "Apply and follow through", icon: CheckCircle2, geo: "Supports connected actions and monitoring where available, with guidance for work outside the platform.", you: "Approve customer-facing work. Publish or install other changes with your website provider." },
              ].map(step => <article key={step.number} className="rounded-2xl border border-slate-200 p-6"><div className="flex items-center justify-between"><span className="font-mono text-sm text-slate-400">{step.number}</span><step.icon className="h-6 w-6 text-emerald-700" aria-hidden="true" /></div><h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3><p className="mt-5 text-sm font-semibold text-emerald-800">Geothority</p><p className="mt-1.5 text-base leading-7 text-slate-600">{step.geo}</p><p className="mt-5 text-sm font-semibold text-slate-900">Your part</p><p className="mt-1.5 text-base leading-7 text-slate-600">{step.you}</p></article>)}
            </div>
            <Link href="/service-facts" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4">See what’s included and what needs a connection <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="bg-slate-950 py-14 sm:py-16">
          <div className={`${container} grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20`}>
            <div><p className="text-sm font-semibold uppercase tracking-[0.14em] !text-emerald-300">Beyond the first scan</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] !text-white sm:text-4xl">A routine for improving<br className="hidden sm:block" /> your online presence.</h2><p className="mt-5 text-base leading-7 !text-slate-300">A scan gives you a starting point. Paid plans add tools to keep working through improvements as your business and online presence change.</p></div>
            <div className="divide-y divide-slate-700">
              {[
                ["Recheck what changed", "Run follow-up scans and compare the findings as you update your website."],
                ["Keep useful content moving", "Prepare and review service information and answers to customer questions."],
                ["Follow visibility and reputation", "Use the monitoring and review workflows available with your plan and connections."],
              ].map(([title, text]) => <div key={title} className="py-5 first:pt-0 last:pb-0"><h3 className="text-lg font-semibold !text-white">{title}</h3><p className="mt-2 text-base leading-7 !text-slate-300">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 py-16 sm:py-20">
          <div className={container}>
            <SectionIntro label="Start with the free report" title="Understand the opportunity before you choose a plan.">Create a free account to scan your website. Upgrade when you want connected workflows, content tools, and ongoing follow-through.</SectionIntro>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map(plan => <article key={plan.name} className={`flex flex-col rounded-2xl border p-6 ${plan.name === "Free" ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"}`}><h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3><p className="mt-4"><span className="text-4xl font-semibold tracking-tight text-slate-950">${plan.price}</span><span className="ml-1 text-sm text-slate-500">/month</span></p><p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p><ul className="mb-7 mt-5 space-y-3">{plan.features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{feature}</li>)}</ul><Link href={plan.href} className={`${plan.name === "Free" ? primaryButton : secondaryButton} mt-auto !px-3 !text-sm`}>{plan.action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></article>)}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">USD, billed monthly. Paid plans offer a 14-day trial with a payment card and renew unless canceled. <Link href="/pricing" className="font-medium text-emerald-800 underline underline-offset-4">Compare features, limits, and annual billing.</Link></p>
          </div>
        </section>

        <section id="questions" className="scroll-mt-24 border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
            <div><SectionIntro label="Before you start" title="A few things you might be wondering." /><p className="mt-5 text-base leading-7 text-slate-600">You don’t need to be an SEO expert to take the first step.</p><Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4">Ask us a question <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">{questions.map(item => <details key={item.question} className="group py-5"><summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-base font-semibold leading-7 text-slate-950 [&::-webkit-details-marker]:hidden">{item.question}<ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-4 pr-5 text-base leading-7 text-slate-600">{item.answer}</p></details>)}</div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[#edf6f1] py-16 text-center sm:py-20">
          <div className={`${container} max-w-3xl`}><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800">Your business. A clearer next step.</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">Find out what could be holding your business back online.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Start with your website. Leave with a clearer picture of what to improve.</p><Link href="/signup" className={`${primaryButton} mt-7`}>Get my free visibility scan <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><p className="mt-4 text-sm text-slate-500">Free account. No credit card required.</p></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-28 sm:pb-10">
        <div className={`${container} flex flex-col justify-between gap-8 lg:flex-row`}><div><Logo size={30} /><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">A clearer path to local visibility for small businesses.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap content-start gap-x-6 gap-y-4 text-sm text-slate-600">{[["How it works", "/#how-it-works"], ["Industries", "/#industries"], ["Pricing", "/pricing"], ["What you get", "/service-facts"], ["FAQ", "/faq"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, href]) => <Link href={href} key={href} className="hover:text-emerald-700">{label}</Link>)}</nav></div>
        <div className={`${container} mt-8 border-t border-slate-100 pt-6 text-xs text-slate-500`}>© {new Date().getFullYear()} Geothority. All rights reserved.</div>
      </footer>
    </div>
  );
}
