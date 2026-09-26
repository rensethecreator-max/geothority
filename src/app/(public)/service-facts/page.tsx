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
      "Understand your free scan, paid tools, setup, and who handles each part of improving your local business visibility.",
    url: "https://geothority.io/service-facts",
    type: "website",
  },
};

const includedItems = [
  "Start free: create an account, add your business and website, then review your scan score, findings, and priorities. No payment card required.",
  "See what needs attention: review website and business-information gaps, with an explanation of what to consider next.",
  "Choose ongoing tools: paid plans add connected profile tools, competitor and AI checks, or content drafts according to the plan.",
  "Revisit your progress: save your starting point, work through changes, and compare later findings with earlier scans.",
];

const expectations = [
  "You keep your existing website. Applying changes depends on your website platform and the access available.",
  "You confirm business details and review customer-facing content. Your website provider may need to apply some changes.",
  "Direct actions need a supported, authorized connection. Source coverage and monitoring depend on setup and availability.",
  "A better scan score is not a promise of a particular ranking or number of leads. Track actual inquiries separately when available.",
];

const firstThirtyDays = [
  {
    title: "Start here",
    text: "Add your business details, run your free scan, and review the findings. You do not need a customer list for this step.",
  },
  {
    title: "Pick priorities",
    text: "Choose a few relevant improvements. Confirm who can apply them: you, your website provider, or a supported connection.",
  },
  {
    title: "Review and apply",
    text: "Check the facts, service details, and wording before using drafts or approving customer-facing work. Choose paid tools only when needed.",
  },
  {
    title: "Check again",
    text: "Review completed work and run another scan when useful. Use new findings and your business results to choose the next priority.",
  },
];

const whyDifferent = [
  "You get a practical starting point: findings connected to next steps, with priorities you can discuss with your website provider.",
  "You can review local discovery, business information, reviews, and supported AI visibility tools in one place.",
  "You stay involved in the decisions that need your knowledge, while using the tools in your plan to prepare and organize the work.",
];

const responsibilities = [
  {
    title: "Geothority",
    text: "Checks available signals, groups findings, suggests next steps, and prepares drafts or supported actions included in your plan.",
  },
  {
    title: "You and your team",
    text: "Confirm business details, choose priorities, connect authorized accounts, and approve wording and customer-facing changes.",
  },
  {
    title: "Your website provider",
    text: "May need to apply code, layout, or content changes when your website does not have a supported publishing connection.",
  },
];

export default function ServiceFactsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />

      <main className="pt-28 pb-20">
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-6 py-12 shadow-[0_24px_80px_rgba(4,10,18,0.24)] sm:px-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 [.light-mode_&]:text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Service facts
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Straight facts about what Geothority does.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--card-foreground)]">
                Geothority helps small businesses understand what may be making them harder to find online.
                From insurance agencies and home services to professional services and local practices,
                the starting point is the same: see the gaps, choose priorities, and follow through.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Check my business’s visibility
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-6 py-3.5 font-semibold text-[var(--foreground)] transition hover:border-emerald-500/40 hover:text-emerald-300 [.light-mode_&]:hover:text-emerald-700"
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
                <ShieldCheck className="h-5 w-5 text-emerald-300 [.light-mode_&]:text-emerald-700" />
                <h2 className="text-2xl font-semibold">From your first scan onward</h2>
              </div>
              <div className="mt-6 space-y-4">
                {includedItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300 [.light-mode_&]:text-emerald-700" />
                    <p className="text-sm leading-7 text-[var(--card-foreground)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(92,230,186,0.16),rgba(20,32,52,0.94))] p-7 shadow-[0_18px_55px_rgba(4,10,18,0.28)]">
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 text-emerald-300 [.light-mode_&]:text-emerald-700" />
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

        <section className="px-4 pb-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <h2 className="text-2xl font-semibold">Who does what?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">Start with the scan. For the work that follows, confirm the access and approval each change needs.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {responsibilities.map((item) => (
                <div key={item.title} className="rounded-2xl border border-[var(--border)] bg-white/[0.05] px-4 py-5">
                  <h3 className="font-semibold text-emerald-500">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--card-foreground)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <h2 className="text-2xl font-semibold">A practical path through your first month</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Use this as a suggested workflow. Timing depends on your priorities, approvals, and who applies the changes.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {firstThirtyDays.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 [.light-mode_&]:text-emerald-700">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-[var(--card-foreground)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-7">
            <h2 className="text-2xl font-semibold">How Geothority helps</h2>
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
              Create a free account and scan your website to see your starting point. No payment card is required.
              Paid tools are a separate choice once you know what you want to work on.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Check my business’s visibility
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
