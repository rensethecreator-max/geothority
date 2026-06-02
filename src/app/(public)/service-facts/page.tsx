import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "What Geothority Does | Service Facts",
  description:
    "A straightforward explanation of what Geothority does, what a subscription includes, what customers should expect, and why the service is different.",
  alternates: { canonical: "https://geothority.io/service-facts" },
  openGraph: {
    title: "What Geothority Does",
    description:
      "Understand what Geothority is, what customers get, what the first 30 days look like, and what makes the service different.",
    url: "https://geothority.io/service-facts",
    type: "website",
  },
};

const includedItems = [
  "A scan that shows where your visibility is weak across your site, listings, reputation, and AI discovery signals.",
  "A clear priority view so you know what matters first instead of staring at a pile of SEO data.",
  "Ongoing monitoring so changes in visibility, listings, competitors, and trust signals do not go unnoticed.",
  "Actionable outputs such as fixes, drafts, recommendations, and guided next steps depending on the task.",
];

const expectations = [
  "Geothority does not promise instant rankings. It improves the signals that help your business get found and trusted over time.",
  "You should expect clarity, prioritization, and steady progress, not mystery reporting.",
  "We handle the technical heavy lifting, but you may still need to provide approvals, business details, or final decisions.",
  "The goal is not just more traffic. The goal is better visibility, better trust, and more chances to be chosen.",
];

const firstThirtyDays = [
  {
    title: "Week 1",
    text: "Run the scan, review the biggest issues, and establish the starting point.",
  },
  {
    title: "Week 2",
    text: "Address the easiest high-impact fixes and clean up the most obvious visibility gaps.",
  },
  {
    title: "Week 3",
    text: "Start tracking ongoing signals so you can see whether visibility and trust are improving.",
  },
  {
    title: "Week 4",
    text: "Review progress, identify what needs deeper work, and set the next operating rhythm.",
  },
];

const whyDifferent = [
  "Most tools only tell you what is wrong. Geothority is built to help move the work forward.",
  "It looks at local search, trust signals, and AI discovery together instead of treating them as separate problems.",
  "It is designed for business operators who want clarity and follow-through, not another confusing dashboard.",
];

export default function ServiceFactsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />

      <main className="pt-28 pb-20">
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-6 py-12 shadow-[0_24px_80px_rgba(4,10,18,0.24)] sm:px-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Service facts
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Straight facts about what Geothority does.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--card-foreground)]">
                Geothority helps your business get found, trusted, and chosen across Google and AI search. It shows
                what is hurting visibility, helps prioritize what matters, and keeps improvement work moving.
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
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="text-2xl font-semibold">What is included</h2>
              </div>
              <div className="mt-6 space-y-4">
                {includedItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                    <p className="text-sm leading-7 text-[var(--card-foreground)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(92,230,186,0.16),rgba(20,32,52,0.94))] p-7 shadow-[0_18px_55px_rgba(4,10,18,0.28)]">
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 text-emerald-300" />
                <h2 className="text-2xl font-semibold">What to expect</h2>
              </div>
              <div className="mt-6 space-y-4">
                {expectations.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/16 bg-white/[0.09] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <p className="text-sm leading-7 text-slate-50">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <h2 className="text-2xl font-semibold">What the first 30 days usually look like</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {firstThirtyDays.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-[var(--card-foreground)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <h2 className="text-2xl font-semibold">Why people choose Geothority</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {whyDifferent.map((item) => (
                <div key={item} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-[var(--card-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pt-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(92,230,186,0.12),rgba(17,24,39,0.9))] px-6 py-12 text-center shadow-[0_20px_70px_rgba(4,10,18,0.26)]">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start with the scan.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-50">
              The scan gives you the clearest first look at what is helping your business get found and what is holding
              it back. From there, Geothority helps you improve it with more structure and less guesswork.
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
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
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
