import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - Geothority Local SEO Platform | Frequently Asked Questions",
  description:
    "Everything you need to know about Geothority: how the Trust Stack score works, what the AI Overview Checker does, citation scanning, GBP monitoring, and how we compare to BrightLocal and Moz Local.",
  alternates: { canonical: "https://geothority.io/faq" },
  openGraph: {
    title: "Geothority FAQ - Local SEO Questions Answered",
    description:
      "Get answers about Geothority's Trust Stack™, AI search optimization, website scanner, and how we help insurance agents dominate local search.",
    url: "https://geothority.io/faq",
    type: "website",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Geothority?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Geothority is a local SEO and GEO (Generative Engine Optimization) platform built specifically for insurance agents and local businesses. It runs a 90-second website audit, scores your online presence across 5 trust layers, and gives you copy-paste fixes to rank higher in Google Maps, organic search, and AI answers like ChatGPT, Google AI Overviews, and Claude.",
      },
    },
    {
      "@type": "Question",
      name: "What is a Trust Stack score?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your Trust Stack™ score is Geothority's proprietary 5-layer scoring system that measures your local search authority from 0–100. The five layers are: (1) Foundation - technical SEO, site speed, mobile optimization; (2) Trust Pages - About, Contact, team bios, credentials; (3) Geo Content - city pages, local landing pages, neighborhood mentions; (4) Reviews - Google review count, rating, recency, and response rate; (5) AI Optimization - schema markup, entity signals, FAQ content, and citation consistency. Each layer is scored individually so you know exactly which area to fix first.",
      },
    },
    {
      "@type": "Question",
      name: "How does the website scan work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Enter your website URL and Geothority crawls your site in approximately 90 seconds. It checks over 80 SEO and local signals including page speed, meta tags, schema markup, NAP consistency, Google Business Profile completeness, review signals, and content quality. You'll receive a scored report with a prioritized list of Quick Win cards - each with a specific fix, the expected impact, and (where applicable) copy-paste code or content.",
      },
    },
    {
      "@type": "Question",
      name: "What is Local SEO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Local SEO is the practice of optimizing your online presence so your business appears prominently when people search for services in your geographic area. For an insurance agent in Austin, that means showing up when someone searches 'insurance agent near me' or 'auto insurance Austin TX.' It involves optimizing your Google Business Profile, building local citations, earning reviews, creating geo-targeted content, and ensuring your website has strong technical signals that Google associates with local relevance.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to see results from Geothority?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most users see measurable improvements within 4–8 weeks of implementing their Quick Win recommendations. Technical fixes (schema markup, meta tags, NAP consistency) often show ranking improvements in 2–3 weeks. Content improvements like city landing pages and GBP post optimization typically take 6–12 weeks to fully compound. Review campaigns can generate new reviews within days of launching. Geothority customers report an average ranking improvement of 8 positions in the local map pack within 90 days.",
      },
    },
    {
      "@type": "Question",
      name: "What is NAP consistency?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NAP stands for Name, Address, Phone number - the three core data points Google uses to verify a local business's identity across the web. Inconsistent NAP (e.g., your address listed differently on Yelp vs. your website vs. Yellow Pages) sends confusing signals to Google and can significantly suppress your local rankings. Geothority scans 80+ citation directories and data sources to flag every NAP discrepancy, then gives you the corrected citation data to submit.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI Overview Checker work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Geothority's AI Overview Checker runs your business against 20+ queries that trigger Google AI Overviews, ChatGPT, and Claude responses in your category. It checks whether your business is cited as a recommended answer, which competitors are appearing instead, and what content signals (schema, FAQ pages, entity mentions) are driving those citations. You get a GEO score and a checklist of optimizations - structured data improvements, FAQ content, and entity-building tactics - that increase the probability of appearing in AI-generated answers.",
      },
    },
    {
      "@type": "Question",
      name: "What schema markup does my business need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For insurance agents and local service businesses, the most impactful schema types are: LocalBusiness (with InsuranceAgency subtype), FAQPage, BreadcrumbList, Review/AggregateRating, Service, and Organization. Geothority's Schema Generator tool creates the exact JSON-LD code for each schema type based on your business data - just copy and paste it into your website's <head> section or use it with a plugin like RankMath or Schema Pro.",
      },
    },
    {
      "@type": "Question",
      name: "How many citation directories does Geothority check?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Geothority checks 80+ citation directories including Google Business Profile, Apple Maps, Bing Places, Yelp, Yellow Pages, Foursquare, Angi, BBB, Facebook, LinkedIn, and industry-specific directories relevant to your niche. The Citation Scan shows each directory's current data for your business, flags inconsistencies, and provides the corrected NAP data you should submit. For insurance agents, we also check specialty directories like Insurify, PolicyGenius referral networks, and state insurance commissioner listings.",
      },
    },
    {
      "@type": "Question",
      name: "What's the difference between Free and Pro plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The free website scan gives you your Trust Stack score, a summary of your top 3 issues, and one Quick Win card. Paid plans start at $97/month (Starter) and unlock: your full scored report with all Quick Win cards, GBP health monitoring, citation scan across 80+ directories, the AI Overview Checker, competitor tracking, monthly Trust Stack reports, and access to the AI Content Generator for city/service pages. The Growth plan ($197/month) adds weekly AI-written GBP posts, automated review campaigns, competitor watchdog, and priority support.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use Geothority for multiple locations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Starter and Growth plans include 1 location scan. The Authority plan ($297/month) supports multiple locations with a consolidated dashboard. The Agency plan ($997/month) includes 10 agent seats and is designed for IMOs, insurance agencies, and multi-location businesses that need team dashboards, white-label PDF reports, and API access. Additional locations can be added to any plan as an add-on.",
      },
    },
    {
      "@type": "Question",
      name: "How does GBP monitoring work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Geothority connects to your Google Business Profile via the Google Business API and monitors it continuously for unauthorized edits, photo removals, Q&A spam, review violations, and ranking fluctuations. You get an alert the moment something changes - critical because Google allows anyone to 'suggest edits' to your GBP listing. Beyond monitoring, Geothority tracks your GBP post engagement, photo performance, and message response rate, and benchmarks all of these against your local competitors.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Geothority different from BrightLocal and Moz Local?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BrightLocal and Moz Local are solid citation management tools, but they were built for SEO agencies managing dozens of clients. Geothority is built specifically for independent insurance agents and small local businesses who need to understand and act on their SEO themselves. Key differences: (1) GEO/AI Optimization - Geothority optimizes for AI Overviews, ChatGPT, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, and Mistral citations; BrightLocal and Moz Local do not. (2) Industry focus - our Quick Wins and content templates are insurance-agent specific. (3) Built-in content generation - Geothority writes city landing pages and GBP posts; BrightLocal and Moz Local do not. (4) Competitor Watchdog - live monitoring of specific local competitors; not available in BrightLocal or Moz Local.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data secure with Geothority?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Geothority uses industry-standard security practices: all data is encrypted at rest and in transit (TLS 1.3), we use Supabase with row-level security for database access control, and we never sell or share your data with third parties. We are SOC 2 compliant and follow the principle of least-privilege for all API access. OAuth tokens for Google Business Profile are stored encrypted and can be revoked at any time from your settings page.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need technical skills to use Geothority?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Geothority is designed for insurance agents, not developers. The website scan requires only your URL. Quick Win cards include the exact code or content to add - no coding knowledge required. The schema generator produces copy-paste JSON-LD. The GBP post generator writes the post and you click 'Publish.' The most technical thing you might do is paste a meta description into your website builder. If you get stuck, our onboarding call (included with Authority plan) walks you through implementing your first 5 fixes live.",
      },
    },
  ],
};

const faqs = faqSchema.mainEntity;

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicHeader />

      <section className="pt-32 pb-12 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium mb-5 border border-emerald-500/20">
          Help Center
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-[var(--muted-foreground)] max-w-xl mx-auto mb-4">
          Everything you need to know about Geothority - from how the Trust Stack score works to
          what makes us different from BrightLocal.
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Can&apos;t find your answer?{" "}
          <Link href="mailto:hello@geothority.io" className="text-emerald-400 hover:underline">
            Email us
          </Link>
        </p>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((item, i) => (
            <FAQAccordion key={i} question={item.name} answer={item.acceptedAnswer.text} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[var(--card)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to dominate local search?</h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            Get your free Trust Stack™ score in 90 seconds - no credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Get Your Free Scan →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Geothority" width={128} height={32} className="h-8 w-auto object-contain" />
              <span className="font-semibold">Geothority</span>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--muted-foreground)]">
              <Link href="/faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</Link>
              <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</Link>
              <Link href="/compare/geothority-vs-brightlocal" className="hover:text-[var(--foreground)] transition-colors">Compare</Link>
              <Link href="/for/insurance-agents" className="hover:text-[var(--foreground)] transition-colors">Insurance Agents</Link>
              <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} Geothority. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQAccordion({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors">
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-sm leading-relaxed hover:text-emerald-400 transition-colors">
        {question}
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)] group-open:rotate-180 transition-transform duration-200" />
      </summary>
      <div className="px-6 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)]">
        <div className="pt-4">{answer}</div>
      </div>
    </details>
  );
}
