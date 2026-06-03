import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, Mail, MessageSquareMore } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";

export const metadata: Metadata = {
  title: "Contact Geothority",
  description:
    "Reach Geothority for support, plan questions, partnerships, or product help.",
  alternates: { canonical: "https://geothority.io/contact" },
  openGraph: {
    title: "Contact Geothority",
    description:
      "Questions about the product, plans, or support? Reach the Geothority team here.",
    url: "https://geothority.io/contact",
    type: "website",
  },
};

const contactLanes = [
  {
    title: "Support",
    text: "Use this for product questions, account help, or anything blocking progress.",
    action: "hello@geothority.io",
    href: "mailto:hello@geothority.io?subject=Geothority%20Support",
    icon: LifeBuoy,
  },
  {
    title: "Plans and billing",
    text: "Use this for subscription questions, upgrade timing, or fit questions before you buy.",
    action: "hello@geothority.io",
    href: "mailto:hello@geothority.io?subject=Geothority%20Plans%20and%20Billing",
    icon: Mail,
  },
  {
    title: "Partnerships",
    text: "Use this for agency, integration, or partner conversations.",
    action: "hello@geothority.io",
    href: "mailto:hello@geothority.io?subject=Geothority%20Partnerships",
    icon: MessageSquareMore,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicHeader />

      <main className="px-4 pb-20 pt-28 sm:px-6">
        <section className="mx-auto max-w-5xl rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-6 py-12 shadow-[0_24px_80px_rgba(4,10,18,0.24)] sm:px-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
              <Mail className="h-4 w-4" />
              Contact
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Talk to Geothority.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--card-foreground)]">
              If you need support, have plan questions, or want to talk about fit, send us a note and we will point you
              in the right direction.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:hello@geothority.io?subject=Geothority%20Support"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Email support
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-6 py-3.5 font-semibold text-[var(--foreground)] transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                See plans
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {contactLanes.map((lane) => {
            const Icon = lane.icon;
            return (
              <div
                key={lane.title}
                className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_55px_rgba(4,10,18,0.18)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">{lane.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--card-foreground)]">{lane.text}</p>
                <Link
                  href={lane.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  {lane.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </section>

        <section className="mx-auto mt-10 max-w-5xl rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-2xl font-semibold">What to expect</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-[var(--card-foreground)]">
              Support questions should go to <span className="font-semibold text-[var(--foreground)]">hello@geothority.io</span>.
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-[var(--card-foreground)]">
              Plan and billing questions can go to <span className="font-semibold text-[var(--foreground)]">hello@geothority.io</span> with a billing subject.
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm leading-7 text-[var(--card-foreground)]">
              Partner or agency conversations can also start at <span className="font-semibold text-[var(--foreground)]">hello@geothority.io</span>.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
