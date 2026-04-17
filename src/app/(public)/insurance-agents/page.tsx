import { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Shield, MapPin, Star, FileText, Zap, TrendingUp, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Local SEO for Insurance Agents | Geothority",
  description: "Stop losing clients to State Farm and big captive agencies. Geothority shows independent insurance agents exactly why competitors rank higher - and gives you the fixes.",
};

const painPoints = [
  {
    icon: MapPin,
    problem: "You're invisible in the local pack",
    solution: "Geothority scans your site the same way Google does and scores your local visibility across 5 layers - then tells you exactly what to fix.",
  },
  {
    icon: Shield,
    problem: "State Farm outranks you on every search",
    solution: "We pull the top 3 competitors ranking above you and show you the exact signals they have that you're missing. Close the gap, not guess at it.",
  },
  {
    icon: FileText,
    problem: "No city-specific pages for the towns you serve",
    solution: "Our AI generates ready-to-publish city landing pages with local signals, coverage details, and schema markup baked in. Copy. Paste. Rank.",
  },
  {
    icon: Star,
    problem: "8 Google reviews vs. their 200+",
    solution: "We detect your review gap, generate a review request email your existing clients will actually respond to, and show you how to display reviews for maximum SEO impact.",
  },
  {
    icon: Zap,
    problem: "Your website doesn't have the technical code Google needs",
    solution: "LocalBusiness schema, InsuranceAgency schema, FAQ schema - generated for your specific business and ready to paste into your site. No developer needed.",
  },
  {
    icon: TrendingUp,
    problem: "AI search is sending people to your competitors",
    solution: "ChatGPT and Perplexity pull from the same signals as Google. Geothority optimizes you for both traditional search and AI discovery simultaneously.",
  },
];

export default function InsuranceAgentsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
            Built for Independent Insurance Agencies
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Why Is State Farm<br />Showing Up Before You?
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] mb-4 max-w-2xl mx-auto leading-relaxed">
            You&apos;ve been in business for years. They have 12 agents in your city. And somehow, when someone Googles &ldquo;insurance agent near me&rdquo; - you&apos;re on page 2.
          </p>
          <p className="text-lg text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto leading-relaxed">
            It&apos;s not about who&apos;s been around longer. It&apos;s about who Google trusts more. Geothority shows you exactly what&apos;s missing - and fixes it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105"
            >
              Run My Free Scan
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-all"
            >
              See Pricing
            </Link>
          </div>
        </section>

        {/* Pain Points Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The 6 Reasons You&apos;re Not Ranking</h2>
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
              Every one of these is fixable. Geothority finds them all in 90 seconds and gives you the exact fix for each.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((point, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500/10 flex items-center justify-center mb-4">
                  <point.icon className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm text-red-400 mb-2">{point.problem}</h3>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">{point.solution}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-electric-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-3xl p-12">
            <h2 className="text-3xl font-bold mb-4">See Your Score in 90 Seconds</h2>
            <p className="text-[var(--muted-foreground)] mb-8 text-lg max-w-lg mx-auto">
              Enter your business name, city, and website. Get a full GEO Authority Score with specific, ranked fixes ready to implement today.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white px-10 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105"
            >
              Run My Free Scan
              <ChevronRight className="w-4 h-4" />
            </Link>
            <p className="text-[var(--muted-foreground)] text-xs mt-4">No credit card required. Free scan takes 90 seconds.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
          <p>&copy; {new Date().getFullYear()} Geothority. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
