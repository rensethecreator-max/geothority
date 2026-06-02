import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Compass, FileSearch, Layers3, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "What Geothority Does | Service Facts",
  description:
    "A clear breakdown of what Geothority does, what customers get with a subscription, what the first 30 days look like, and how the platform differs from typical SEO tools.",
  alternates: { canonical: "https://geothority.io/service-facts" },
  openGraph: {
    title: "What Geothority Does",
    description:
      "Understand the Geothority service: diagnosis, fix execution, subscription expectations, and what makes the platform different.",
    url: "https://geothority.io/service-facts",
    type: "website",
  },
};

const servicePillars = [
  {
    title: "Diagnose visibility problems fast",
    text: "Geothority scans your site, listings, reviews, competitors, and AI answer surfaces to show what is helping visibility and what is holding it back.",
    icon: FileSearch,
  },
  {
    title: "Prioritize what matters first",
    text: "Instead of a wall of SEO data, you get a ranked operating view through the Trust Stack, fix opportunities, and execution lanes.",
    icon: Layers3,
  },
  {
    title: "Move work forward",
    text: "Where supported, the platform can automate a fix. When full automation is not appropriate, it prepares an approval step or a guided next action.",
    icon: Zap,
  },
];

const subscriptionExpectations = [
  "A first scan that establishes your visibility baseline and surfaces the biggest gaps.",
  "A Trust Stack view that makes weak authority layers obvious without needing SEO fluency.",
  "Ongoing monitoring across listings, competitors, GBP health, and AI visibility, depending on plan level.",
  "Generated assets like schema, drafts, and action packages that help your team complete fixes faster.",
  "A clearer weekly operating rhythm: what changed, what improved, and what should happen next.",
];

const firstThirtyDays = [
  {
    title: "Week 1",
    text: "Run the initial scan, review the Trust Stack, and identify the first high-leverage fixes.",
  },
  {
    title: "Week 2",
    text: "Approve or deploy the easiest wins: schema, priority trust pages, listing corrections, and baseline content updates.",
  },
  {
    title: "Week 3",
    text: "Start monitoring competitor movement, AI mentions, and business profile signals so changes are not happening in the dark.",
  },
  {
    title: "Week 4",
    text: "Use the new baseline to decide whether you need deeper monitoring, more content coverage, or more execution support.",
  },
];

const differentiation = [
  "Most SEO tools stop at diagnosis. Geothority is designed to help complete the work through automation, approvals, and guided next steps.",
  "The platform treats local visibility as an operating system, not a list of isolated tasks. Trust, listings, content, GBP health, and AI visibility are connected.",
  "Geothority watches AI recommendation surfaces in addition to traditional local search, which matters as more discovery shifts into answer engines.",
  "The product is built for operators who need clarity and execution, not just agency-style reporting or another dashboard full of passive charts.",
];

const planGuide = [
  {
    name: "Starter",
    fit: "Single-location teams getting their visibility basics under control.",
    outcome: "A baseline, core issue detection, and a clearer first operating rhythm.",
  },
  {
    name: "Growth",
    fit: "Teams that need stronger monitoring, AI visibility insight, and deeper follow-through.",
    outcome: "Broader visibility coverage with more active monitoring and more room to execute consistently.",
  },
  {
    name: "Authority",
    fit: "Serious operators and multi-location businesses that want the fullest Geothority workflow.",
    outcome: "A more complete command layer for visibility, execution support, and ongoing competitive response.",
  },
];

export default function ServiceFactsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />

      <main className="pt-28 pb-20">
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-12 shadow-[0_24px_80px_rgba(4,10,18,0.24)] sm:px-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Service facts
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                What Geothority actually does, what you get, and why it is different.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Geothority is a local visibility operating system for teams that need more than reports. It helps diagnose
                what is suppressing visibility, prioritize what matters, and move real fixes forward.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Get Your Free Scan
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-6 py-3.5 font-semibold text-[var(--foreground)] transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  See Plans
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">What the service does</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Three jobs, one system.</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {servicePillars.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="text-2xl font-semibold">What a subscription should feel like</h2>
              </div>
              <div className="mt-6 space-y-4">
                {subscriptionExpectations.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    <p className="text-sm leading-7 text-[var(--card-foreground)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(92,230,186,0.08),rgba(27,38,59,0.96))] p-7">
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 text-emerald-300" />
                <h2 className="text-2xl font-semibold">What happens in the first 30 days</h2>
              </div>
              <div className="mt-6 space-y-4">
                {firstThirtyDays.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">{item.title}</div>
                    <p className="mt-2 text-sm leading-7 text-white/88">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Plan expectations</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Choose the level of support that matches how you operate.</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {planGuide.map((plan) => (
                <div key={plan.name} className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    {plan.name}
                  </div>
                  <p className="mt-5 text-sm font-semibold text-[var(--foreground)]">{plan.fit}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{plan.outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Why Geothority is different</h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {differentiation.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[var(--card-foreground)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pt-16 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(92,230,186,0.08),rgba(17,24,39,0.92))] px-6 py-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">If you want the truth fast, start with the scan.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/88">
              The scan gives you the cleanest picture of what is really happening in your visibility stack. From there,
              the subscription helps you keep fixing, monitoring, and improving instead of guessing.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Run the Free Scan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-white transition hover:bg-white/8"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
