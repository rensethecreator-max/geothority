"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { WillChatbot } from "@/components/chat/will-chatbot";
import { PLANS } from "@/lib/stripe";
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Eye,
  Star,
  Users,
  BarChart3,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const planKeys = ["audit", "starter", "pro"] as const;

// Animated counter hook
function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// Floating particle component
function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-electric-500/30 animate-pulse"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${2 + delay}s`,
      }}
    />
  );
}

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  delay: (i * 0.3) % 3,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
}));

function StatCounter({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const count = useCounter(value, 2000, start);
  return (
    <div className="text-center">
      <div className="text-4xl font-black text-electric-400 tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1.5 font-medium">{label}</div>
    </div>
  );
}

const testimonials = [
  {
    name: "Michael Torres",
    role: "Allstate Agent, Tampa FL",
    text: "Went from page 3 to #2 on Google Maps in 6 weeks. Two new commercial accounts from organic last month alone.",
    stars: 5,
  },
  {
    name: "Sarah Chen",
    role: "Independent Agent, Austin TX",
    text: "The Competitor Watchdog is insane. I saw my top competitor publish a new page and had a better one live within the hour.",
    stars: 5,
  },
  {
    name: "James Whitfield",
    role: "State Farm Agent, Atlanta GA",
    text: "Canceled my $800/mo SEO agency after 3 months. Geothority does more and I actually understand what it's doing.",
    stars: 5,
  },
];

const featureIcons = [MapPin, Eye, TrendingUp, Shield, BarChart3, Users];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCheckout = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `/login?redirect=/pricing`;
      }
    } catch {
      window.location.href = "/login?redirect=/pricing";
    }
    setLoadingPlan(null);
  };

  const getPrice = (base: number) =>
    billingAnnual ? Math.floor(base * 0.8) : base;

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-hidden">
      <PublicHeader />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 text-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-electric-500/8 rounded-full blur-[80px]" />
          <div className="absolute top-40 left-1/4 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px]" />
          <div className="absolute top-40 right-1/4 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-[60px]" />
          {particles.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-electric-500/10 text-electric-400 rounded-full text-sm font-semibold mb-6 border border-electric-500/20 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            Pays for itself with 2 extra organic leads/month
          </div>

          <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight tracking-tight">
            Stop Paying{" "}
            <span className="relative">
              <span className="text-electric-400">$2,500/mo</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-electric-500/40 rounded-full" />
            </span>{" "}
            for Ads.<br />
            <span className="text-[var(--muted-foreground)]">Own Your Local Market.</span>
          </h1>

          <p className="text-lg text-[var(--muted-foreground)] max-w-xl mx-auto mb-8 leading-relaxed">
            Geothority builds the organic visibility that replaces your ad budget — permanently. Most agents see 10-15 extra leads per month within 90 days.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-full p-1 mb-10">
            <button
              onClick={() => setBillingAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !billingAnnual
                  ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billingAnnual
                  ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Annual
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-stretch">
          {planKeys.map((key, idx) => {
            const plan = PLANS[key];
            const isPopular = "popular" in plan && plan.popular;
            const isLoading = loadingPlan === key;
            const isHovered = hoveredPlan === key;
            const Icon = featureIcons[idx * 2];

            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredPlan(key)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative rounded-2xl border transition-all duration-300 flex flex-col ${
                  isPopular
                    ? "border-electric-500 bg-gradient-to-b from-electric-500/8 to-[var(--card)] shadow-2xl shadow-electric-500/15 scale-[1.03] z-10"
                    : isHovered
                    ? "border-electric-500/40 bg-[var(--card)] shadow-xl shadow-electric-500/5 -translate-y-1"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
                style={{ transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-electric-500 to-electric-400 text-white text-xs font-black rounded-full shadow-lg shadow-electric-500/40 tracking-wide uppercase">
                    ⚡ Most Popular
                  </div>
                )}

                {/* Subtle highlight on hover */}
                {isHovered && !isPopular && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-electric-500/3" />
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  {/* Plan header */}
                  <div className="mb-7">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${
                      isPopular ? "bg-electric-500/20" : "bg-[var(--muted)]"
                    }`}>
                      <Icon className={`w-5 h-5 ${isPopular ? "text-electric-400" : "text-[var(--muted-foreground)]"}`} />
                    </div>

                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mb-4">
                      {key === "audit" && "Perfect for agents starting their organic journey"}
                      {key === "starter" && "For agents ready to dominate their local market"}
                      {key === "pro" && "For top producers who want total market control"}
                    </p>

                    <div className="flex items-end gap-1.5">
                      <span className="text-6xl font-black leading-none tabular-nums">
                        ${getPrice(plan.price)}
                      </span>
                      <div className="pb-1.5">
                        <div className="text-[var(--muted-foreground)] text-sm">/mo</div>
                        {billingAnnual && (
                          <div className="text-emerald-400 text-xs font-semibold">
                            billed annually
                          </div>
                        )}
                      </div>
                    </div>

                    {key === "audit" && (
                      <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                        Or pay <span className="text-[var(--foreground)] font-semibold">$47 once</span> for a one-time audit
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, fi) => (
                      <li
                        key={f}
                        className="flex items-start gap-3"
                        style={{ animationDelay: `${fi * 50}ms` }}
                      >
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          isPopular ? "text-electric-400" : "text-emerald-500"
                        }`} />
                        <span className="text-sm text-[var(--muted-foreground)] leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleCheckout(key)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60 group ${
                      isPopular
                        ? "bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white shadow-lg shadow-electric-500/30 hover:shadow-electric-500/50 hover:-translate-y-0.5"
                        : "bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] hover:border-electric-500/30"
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {key === "audit" ? "Start Free Scan" : key === "starter" ? "Get Started" : "Go Pro"}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>

                {/* Bottom gradient line for popular */}
                {isPopular && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-electric-500 to-transparent rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[var(--muted-foreground)]">
          {[
            "Free website scan included",
            "Cancel anytime",
            "No long-term contracts",
            "30-day money-back guarantee",
            "SOC 2 compliant",
          ].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Live Stats */}
      <section ref={statsRef} className="py-16 px-4 border-y border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-[var(--muted-foreground)] uppercase tracking-widest font-semibold mb-10">
            Real results from insurance agents using Geothority
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value={1240} suffix="+" label="Agents Served" start={statsVisible} />
            <StatCounter value={12} suffix="" label="Avg. Leads Gained/Mo" start={statsVisible} />
            <StatCounter value={2800} suffix="/mo avg" label="Ad Spend Replaced" start={statsVisible} />
            <StatCounter value={97} suffix="%" label="Satisfaction Rate" start={statsVisible} />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            What agents are saying
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-electric-500/20 transition-colors"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-5">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-16 px-4 bg-[var(--card)] border-y border-[var(--border)]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-electric-500/10 border border-electric-500/20 mb-6">
            <BarChart3 className="w-6 h-6 text-electric-400" />
          </div>
          <h3 className="text-2xl font-bold mb-4">The ROI Is Simple Math</h3>
          <p className="text-[var(--muted-foreground)] text-sm leading-relaxed mb-8">
            At $85/click for local insurance keywords, <strong className="text-[var(--foreground)]">2 organic leads per month</strong> replaces $170 in monthly ad spend — covering the Starter plan entirely. The average Geothority agent replaces <strong className="text-[var(--foreground)]">$1,100/mo in ad spend</strong> within 90 days.
          </p>

          {/* Visual ROI breakdown */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Audit Plan", roi: "3.6x", desc: "2 organic leads/mo" },
              { label: "Starter Plan", roi: "7.4x", desc: "10 organic leads/mo" },
              { label: "Pro Plan", roi: "12x", desc: "15 organic leads/mo" },
            ].map((r) => (
              <div key={r.label} className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-2xl font-black text-electric-400">{r.roi}</div>
                <div className="text-xs font-semibold mt-1">{r.label}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{r.desc}</div>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold rounded-xl shadow-lg shadow-electric-500/30 hover:shadow-electric-500/50 transition-all hover:-translate-y-0.5 text-sm"
          >
            Start with a free scan
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-3 text-xs text-[var(--muted-foreground)]">No credit card required</div>
        </div>
      </section>

      {/* FAQ strip */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-center mb-10">Common Questions</h3>
          <div className="space-y-4">
            {[
              {
                q: "How quickly will I see results?",
                a: "Most agents see ranking improvements within 4-6 weeks. The Quick Win cards and auto-published city pages deliver the fastest results — some agents see movement within 2 weeks.",
              },
              {
                q: "Do I need to know anything about SEO?",
                a: "Zero. The Local Trust Stack™ shows you exactly what's missing and auto-generates the fixes. You just click and approve.",
              },
              {
                q: "What CMS platforms do you support?",
                a: "WordPress, Wix, and Squarespace with direct one-click publishing. If you use something else, we'll provide HTML you can paste anywhere.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, no contracts. Cancel from your settings page anytime. Annual subscribers get a prorated refund on unused months.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-electric-500/20 transition-colors">
                <div className="text-sm font-bold mb-2">{faq.q}</div>
                <div className="text-sm text-[var(--muted-foreground)] leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-electric-400 flex items-center justify-center shadow-lg shadow-electric-500/30">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <span className="font-bold">Geothority</span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      <WillChatbot />
    </div>
  );
}
