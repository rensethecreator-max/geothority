import { Metadata } from "next";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

const comparisons: Record<string, {
  name: string; slug: string; tagline: string; pricing: string;
  features: { name: string; geo: boolean | string; comp: boolean | string }[];
  differentiators: string[];
  faqs: { q: string; a: string }[];
}> = {
  "geothority-vs-brightlocal": {
    name: "BrightLocal", slug: "geothority-vs-brightlocal",
    tagline: "BrightLocal is a solid local SEO platform, but Geothority was built specifically for insurance agents and local service businesses who need AI-era optimization.",
    pricing: "From $39/mo",
    features: [
      { name: "Trust Stack Score (0-100)", geo: true, comp: false },
      { name: "15 AI Platforms Monitored", geo: true, comp: false },
      { name: "Automatic AI Fixes", geo: "FAQ schema, entity content, GBP posts", comp: false },
      { name: "AI Recommendation Score (A+ to F)", geo: true, comp: false },
      { name: "Competitor Frequency Tracking", geo: true, comp: false },
      { name: "Schema Generator Wizard", geo: true, comp: false },
      { name: "Citation Checking", geo: "18 directories", comp: "Major directories" },
      { name: "GBP Monitoring", geo: true, comp: true },
      { name: "AI Content Generation", geo: true, comp: false },
      { name: "Competitor Analysis", geo: true, comp: true },
      { name: "Review Monitoring", geo: "Native Reputation Engine", comp: true },
      { name: "White-Label Reports", geo: "PDF Export", comp: true },
      { name: "Free Tier", geo: true, comp: false },
      { name: "Starting Price", geo: "Free / $97/mo", comp: "$39/mo" },
      { name: "Built for Insurance Agents", geo: true, comp: false },
    ],
    differentiators: [
      "Geothority monitors 15 AI platforms (ChatGPT, Perplexity, Google AI Overviews, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere). BrightLocal does not check AI visibility at all.",
      "We do not just detect problems. We automatically fix them. Geothority generates and applies FAQ schema, entity-rich content, structured markup, and GBP posts. BrightLocal only shows you what is wrong.",
      "Our AI Recommendation Score (A+ through F) measures how often AI systems recommend your business vs competitors, and Competitor Frequency Tracking reveals when AI recommends competitors more often (for example, '3.4x more than you').",
      "Our Trust Stack framework gives you a single score and prioritized action plan, not a wall of data.",
    ],
    faqs: [
      { q: "Is BrightLocal better for agencies?", a: "BrightLocal has more agency features like white-label reports. Geothority is better for individual businesses who want actionable guidance, not raw data." },
      { q: "Does BrightLocal check AI search visibility?", a: "No. Geothority monitors 15 AI platforms and gives you an AI Recommendation Score showing how often AI recommends you vs competitors. BrightLocal doesn't check AI visibility at all." },
      { q: "Which is more affordable?", a: "Geothority offers a free tier with 3 daily scans. BrightLocal starts at $39/month with no free option." },
      { q: "Can I use both?", a: "Yes, they complement each other. Use BrightLocal for agency reporting and Geothority for AI optimization and Trust Stack scoring." },
      { q: "Which has better citation checking?", a: "Geothority checks 18 directories including Yelp (via API). BrightLocal checks major directories and offers citation building services." },
    ],
  },
  "geothority-vs-moz-local": {
    name: "Moz Local", slug: "geothority-vs-moz-local",
    tagline: "Moz Local focuses on listing management and distribution. Geothority gives you the full picture - from citations to AI recommendations to content optimization.",
    pricing: "From $14/mo",
    features: [
      { name: "Trust Stack Score", geo: true, comp: false },
      { name: "15 AI Platforms Monitored", geo: true, comp: false },
      { name: "Automatic AI Fixes", geo: "FAQ schema, entity content, GBP posts", comp: false },
      { name: "AI Recommendation Score (A+ to F)", geo: true, comp: false },
      { name: "Competitor Frequency Tracking", geo: true, comp: false },
      { name: "Schema Generator", geo: true, comp: false },
      { name: "Citation Distribution", geo: "Check only", comp: "Check + Submit" },
      { name: "GBP Monitoring", geo: true, comp: true },
      { name: "AI Content Generation", geo: true, comp: false },
      { name: "Competitor Analysis", geo: true, comp: false },
      { name: "Review Management", geo: "Native Reputation Engine", comp: true },
      { name: "Listing Sync", geo: false, comp: true },
      { name: "Free Tier", geo: true, comp: false },
      { name: "Starting Price", geo: "Free / $97/mo", comp: "$14/mo" },
      { name: "AI-Era Optimization", geo: true, comp: false },
    ],
    differentiators: [
      "Geothority monitors 15 AI platforms (ChatGPT, Perplexity, Google AI Overviews, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere). Moz Local has zero AI visibility features.",
      "We do not just detect problems. We automatically fix them. Geothority generates and applies FAQ schema, entity-rich content, structured markup, and GBP posts. Moz Local only syncs listings.",
      "Our AI Recommendation Score (A+ through F) and Competitor Frequency Tracking show exactly how often AI recommends you vs competitors, with urgency like 'AI recommends your competitors 3.4x more often.'",
      "Our content generator creates SEO-optimized city landing pages in seconds.",
    ],
    faqs: [
      { q: "Is Moz Local cheaper?", a: "Yes, Moz Local starts at $14/mo. But it only manages listings - Geothority covers AI optimization, content generation, competitor analysis, and more." },
      { q: "Does Moz Local submit citations?", a: "Yes, Moz Local distributes your listings to directories. Geothority checks 18 directories but doesn't submit - we tell you what's wrong and how to fix it." },
      { q: "Which is better for SEO beginners?", a: "Geothority. Our Trust Stack score and prioritized quick wins tell you exactly what to do first." },
      { q: "Can Moz Local check AI recommendations?", a: "No. Geothority monitors 15 AI platforms and provides an AI Recommendation Score plus Competitor Frequency Tracking. Moz Local has no AI visibility features at all." },
      { q: "Do I need both?", a: "If you want listing distribution, use Moz Local for that. Use Geothority for everything else - scoring, AI optimization, content, and competitor analysis." },
    ],
  },
  "geothority-vs-semrush": {
    name: "Semrush", slug: "geothority-vs-semrush",
    tagline: "Semrush is an enterprise SEO powerhouse. Geothority is purpose-built for local businesses who need focused, actionable local SEO guidance.",
    pricing: "From $139/mo",
    features: [
      { name: "Trust Stack Score", geo: true, comp: false },
      { name: "15 AI Platforms Monitored", geo: true, comp: false },
      { name: "Automatic AI Fixes", geo: "FAQ schema, entity content, GBP posts", comp: false },
      { name: "AI Recommendation Score (A+ to F)", geo: true, comp: false },
      { name: "Competitor Frequency Tracking", geo: true, comp: false },
      { name: "Schema Generator", geo: true, comp: false },
      { name: "Local Citation Audit", geo: "18 directories", comp: "Listing Management add-on" },
      { name: "GBP Monitoring", geo: true, comp: "Add-on" },
      { name: "AI Content Generation", geo: "Local-focused", comp: "General SEO" },
      { name: "Competitor Analysis", geo: "Local focus", comp: "Global + Local" },
      { name: "Keyword Research", geo: "Scan-based", comp: "Full suite" },
      { name: "Backlink Analysis", geo: false, comp: true },
      { name: "Free Tier", geo: true, comp: "Limited trial" },
      { name: "Starting Price", geo: "Free / $97/mo", comp: "$139/mo" },
      { name: "Learning Curve", geo: "Minutes", comp: "Weeks" },
    ],
    differentiators: [
      "Geothority monitors 15 AI platforms. Semrush does not specifically check if ChatGPT, Perplexity, or Claude recommend your business.",
      "We do not just detect problems. We automatically fix them with FAQ schema, entity-rich content, structured markup, and GBP posts. Semrush shows you data; Geothority takes action.",
      "Our AI Recommendation Score (A+ through F) and Competitor Frequency Tracking reveal how often AI recommends you vs competitors. Semrush has no equivalent.",
      "At $139/mo, Semrush costs more than Geothority's Authority plan - and you still need add-ons for local SEO.",
    ],
    faqs: [
      { q: "Is Semrush overkill for local businesses?", a: "Often, yes. Semrush has incredible depth but most local businesses use less than 10% of its features. Geothority gives you exactly what you need." },
      { q: "Does Semrush check AI search visibility?", a: "Semrush is adding AI features but doesn't monitor the 15 AI platforms Geothority tracks, and has no AI Recommendation Score or Competitor Frequency Tracking." },
      { q: "Which is easier to use?", a: "Geothority, by far. Scan your site in 90 seconds and get a clear action plan. Semrush has a steep learning curve." },
      { q: "Is Semrush better for keyword research?", a: "Yes, Semrush has the best keyword research tools in the industry. But for local ranking factors (citations, GBP, reviews, schema), Geothority is more focused." },
      { q: "Can I switch from Semrush?", a: "Many of our users switched from Semrush because they wanted local-specific guidance without the complexity. Try Geothority free and compare." },
    ],
  },
  "geothority-vs-whitespark": {
    name: "Whitespark", slug: "geothority-vs-whitespark",
    tagline: "Whitespark is a respected citation and reputation platform. Geothority extends beyond citations into AI optimization and content generation.",
    pricing: "From $39/mo",
    features: [
      { name: "Trust Stack Score", geo: true, comp: false },
      { name: "15 AI Platforms Monitored", geo: true, comp: false },
      { name: "Automatic AI Fixes", geo: "FAQ schema, entity content, GBP posts", comp: false },
      { name: "AI Recommendation Score (A+ to F)", geo: true, comp: false },
      { name: "Competitor Frequency Tracking", geo: true, comp: false },
      { name: "Schema Generator", geo: true, comp: false },
      { name: "Citation Finder", geo: "18 directories", comp: "Extensive" },
      { name: "Citation Building", geo: false, comp: true },
      { name: "GBP Monitoring", geo: true, comp: true },
      { name: "AI Content Generation", geo: true, comp: false },
      { name: "Rank Tracking", geo: false, comp: true },
      { name: "Review Generation", geo: "Native Reputation Engine", comp: true },
      { name: "Free Tier", geo: true, comp: false },
      { name: "Starting Price", geo: "Free / $97/mo", comp: "$39/mo" },
      { name: "AI-Era Focus", geo: true, comp: false },
    ],
    differentiators: [
      "Geothority monitors 15 AI platforms and provides an AI Recommendation Score. Whitespark has zero AI visibility features.",
      "We do not just detect problems. We automatically fix them with FAQ schema, entity-rich content, structured markup, and GBP posts. Whitespark only shows you citation issues.",
      "Competitor Frequency Tracking shows when AI recommends competitors more often (for example, '3.4x more than you'). Whitespark cannot tell you this.",
      "Geothority's local page generator creates city-specific landing pages that Whitespark can't.",
    ],
    faqs: [
      { q: "Is Whitespark better for citations?", a: "Whitespark is excellent for finding and building citations. Geothority checks 18 directories and tells you what's inconsistent, but doesn't submit listings for you." },
      { q: "Does Whitespark check AI recommendations?", a: "No. Geothority monitors 15 AI platforms with AI Recommendation Scores and Competitor Frequency Tracking. Whitespark has no AI visibility features at all." },
      { q: "Which should I choose?", a: "If citations are your only concern, Whitespark is great. If you want a complete local SEO + AI optimization platform, choose Geothority." },
      { q: "Can I use both?", a: "Yes - use Whitespark for citation building and Geothority for Trust Stack scoring, AI optimization, and content generation." },
      { q: "Which has better reviews features?", a: "Whitespark has built-in review generation. Geothority now includes a native Reputation Engine for one-tap review collection, private feedback routing, and review workflow visibility." },
    ],
  },
  "geothority-vs-yext": {
    name: "Yext", slug: "geothority-vs-yext",
    tagline: "Yext is an enterprise listing management platform. Geothority gives small businesses the same local SEO power without the enterprise price tag.",
    pricing: "From $199/yr per location",
    features: [
      { name: "Trust Stack Score", geo: true, comp: false },
      { name: "15 AI Platforms Monitored", geo: true, comp: false },
      { name: "Automatic AI Fixes", geo: "FAQ schema, entity content, GBP posts", comp: false },
      { name: "AI Recommendation Score (A+ to F)", geo: true, comp: false },
      { name: "Competitor Frequency Tracking", geo: true, comp: false },
      { name: "Schema Generator", geo: true, comp: false },
      { name: "Listing Sync", geo: false, comp: "80+ directories" },
      { name: "GBP Monitoring", geo: true, comp: true },
      { name: "AI Content Generation", geo: true, comp: false },
      { name: "Competitor Analysis", geo: true, comp: false },
      { name: "Knowledge Graph", geo: false, comp: true },
      { name: "Review Monitoring", geo: "Native Reputation Engine", comp: true },
      { name: "Free Tier", geo: true, comp: false },
      { name: "Starting Price", geo: "Free / $97/mo", comp: "$199/yr per location" },
      { name: "Setup Complexity", geo: "Self-serve", comp: "Often needs agency" },
    ],
    differentiators: [
      "Geothority monitors 15 AI platforms (ChatGPT, Perplexity, Google AI Overviews, Claude, Copilot, Grok, DeepSeek, Meta AI, You.com, Mistral, Brave, Phind, iAsk.ai, Qwen, and Cohere). Yext has no AI recommendation tracking.",
      "We do not just detect problems. We automatically fix them with FAQ schema, entity-rich content, structured markup, and GBP posts. Yext only manages listings; it does not optimize your AI visibility.",
      "Our AI Recommendation Score and Competitor Frequency Tracking show how often AI recommends you vs competitors. As search shifts to AI, this matters more than directory listings.",
      "If you stop paying Yext, your listings may revert. Geothority teaches you to build lasting SEO authority.",
    ],
    faqs: [
      { q: "Is Yext worth the price for small businesses?", a: "For a single location, Yext's value proposition is weaker. Geothority offers more actionable local SEO guidance at a fraction of the cost." },
      { q: "What happens if I cancel Yext?", a: "Some listings managed by Yext may revert. Geothority helps you build organic authority that persists even if you cancel." },
      { q: "Does Yext check AI search?", a: "No. Yext focuses on directory listings. Geothority monitors 15 AI platforms, provides AI Recommendation Scores, and automatically fixes issues. Yext has none of these AI visibility features." },
      { q: "Which syncs more directories?", a: "Yext syncs 80+ directories. Geothority checks 18 but focuses on the ones that matter most for local ranking." },
      { q: "Is Geothority easier to use?", a: "Much easier. Scan in 90 seconds, get your Trust Stack score, follow the action plan. No contracts, no setup calls needed." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(comparisons).map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = comparisons[params.slug];
  if (!data) return {};
  return {
    title: `Geothority vs ${data.name} - Local SEO Comparison`,
    description: data.tagline,
    openGraph: { title: `Geothority vs ${data.name}`, description: data.tagline },
  };
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const data = comparisons[params.slug];
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            Geothority vs {data.name}
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">{data.tagline}</p>
        </div>

        {/* Comparison Table */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden mb-16">
          <div className="grid grid-cols-3 gap-0">
            <div className="p-4 font-semibold border-b border-[var(--border)]">Feature</div>
            <div className="p-4 font-semibold border-b border-l border-[var(--border)] text-center text-emerald-400">Geothority</div>
            <div className="p-4 font-semibold border-b border-l border-[var(--border)] text-center">{data.name}</div>
            {data.features.map((f, i) => (
              <>
                <div key={`n-${i}`} className={`p-4 text-sm ${i % 2 === 0 ? "bg-[var(--background)]/50" : ""} border-b border-[var(--border)]`}>{f.name}</div>
                <div key={`g-${i}`} className={`p-4 text-center ${i % 2 === 0 ? "bg-[var(--background)]/50" : ""} border-b border-l border-[var(--border)]`}>
                  {typeof f.geo === "boolean" ? (f.geo ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-gray-500 mx-auto" />) : <span className="text-sm text-emerald-400">{f.geo}</span>}
                </div>
                <div key={`c-${i}`} className={`p-4 text-center ${i % 2 === 0 ? "bg-[var(--background)]/50" : ""} border-b border-l border-[var(--border)]`}>
                  {typeof f.comp === "boolean" ? (f.comp ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-gray-500 mx-auto" />) : <span className="text-sm">{f.comp}</span>}
                </div>
              </>
            ))}
          </div>
        </div>

        {/* Differentiators */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Choose Geothority</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {data.differentiators.map((d, i) => (
              <div key={i} className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                  <span className="text-emerald-400 font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {data.faqs.map((faq, i) => (
              <details key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden group">
                <summary className="p-5 cursor-pointer font-medium hover:text-emerald-400 transition-colors">{faq.q}</summary>
                <div className="px-5 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": data.faqs.map(f => ({
                  "@type": "Question",
                  "name": f.q,
                  "acceptedAnswer": { "@type": "Answer", "text": f.a },
                })),
              }),
            }}
          />
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to See Your Trust Stack Score?</h2>
          <p className="text-[var(--muted-foreground)] mb-6">Free scan in 90 seconds. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Try Geothority Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
          <p>&copy; {new Date().getFullYear()} Geothority. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-[var(--foreground)] transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
