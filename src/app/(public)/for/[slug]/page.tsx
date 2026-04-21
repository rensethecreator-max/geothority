import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle2, Star } from "lucide-react";
import { notFound } from "next/navigation";

const industries: Record<string, {
  slug: string;
  name: string;
  h1: string;
  description: string;
  painPoints: { title: string; desc: string }[];
  solutions: { title: string; desc: string }[];
  testimonial: { quote: string; author: string; role: string };
  stats: { value: string; label: string }[];
  faqs: { q: string; a: string }[];
}> = {
  "insurance-agents": {
    slug: "insurance-agents",
    name: "Insurance Agents",
    h1: "Local SEO for Insurance Agents - Get Found Before Your Competitors",
    description: "Insurance agents who rank in the local pack get 3x more calls. Geothority's Trust Stack gives you a clear path to the top - citations, GBP, AI recommendations, and schema all in one score.",
    painPoints: [
      {
        title: "You're invisible in AI search",
        desc: "When someone asks ChatGPT, Perplexity, Claude, Copilot, or Grok 'who's the best insurance agent near me,' they probably don't see your name. Most agents have zero AI presence.",
      },
      {
        title: "Your Google Business Profile is half-built",
        desc: "Missing categories, incomplete service areas, no posts, no Q&A - these gaps cost you calls every single day and most agents don't know where to start fixing them.",
      },
      {
        title: "Citations are inconsistent across directories",
        desc: "Your NAP (Name, Address, Phone) data probably has 5+ variations across the web. Google sees this as a trust signal problem and ranks you lower.",
      },
    ],
    solutions: [
      {
        title: "Trust Stack Score in 90 seconds",
        desc: "Scan your website and instantly see your 0-100 Trust Stack Score - covering GBP health, citations, schema markup, AI recommendations, and content. No guesswork.",
      },
      {
        title: "AI Overview Checker",
        desc: "See if you appear when people ask AI assistants for insurance recommendations in your city. If you're not there, we show you exactly how to get there.",
      },
      {
        title: "Schema Generator Wizard",
        desc: "Insurance Schema markup (InsuranceAgency, LocalBusiness, FAQ) generated in 60 seconds. Paste it into your site and watch your rich results improve.",
      },
    ],
    testimonial: {
      quote: "I went from page 3 to the local pack in 6 weeks. The Trust Stack score showed me exactly what to fix - I started with citations and GBP, and the results were immediate.",
      author: "Marcus T.",
      role: "Independent Insurance Agent, Nashville TN",
    },
    stats: [
      { value: "73%", label: "of insurance shoppers use Google to find a local agent" },
      { value: "3x", label: "more calls from businesses in the local pack vs. organic results" },
    ],
    faqs: [
      { q: "Does Geothority work for independent insurance agents?", a: "Yes - Geothority was built with independent agents in mind. You get the same local SEO power as large carriers without the enterprise price tag." },
      { q: "How long does it take to see results?", a: "Most agents see GBP improvements within 2-4 weeks of implementing Geothority's recommendations. Citation consistency typically shows results in 4-8 weeks." },
      { q: "Can I check my competitors' scores?", a: "Yes, Geothority's competitor analysis lets you scan competing agents in your zip code and see exactly where you're ahead or behind." },
      { q: "Do I need to know SEO to use Geothority?", a: "No. Geothority gives you plain-English action items ranked by impact. If you can follow a checklist, you can improve your local ranking." },
      { q: "What makes Geothority different from generic SEO tools?", a: "Geothority is built specifically for local service businesses like insurance agents. Our Trust Stack framework prioritizes the exact ranking factors that matter for local search - not broad SEO metrics that don't apply to you." },
    ],
  },
  "real-estate-agents": {
    slug: "real-estate-agents",
    name: "Real Estate Agents",
    h1: "Local SEO for Real Estate Agents - Rank Higher, Close More Deals",
    description: "Home buyers and sellers search locally before they call. Geothority's Trust Stack ensures your name is what they find - in Google Maps, local search, and AI assistants.",
    painPoints: [
      {
        title: "New listings get buried under Zillow and Realtor.com",
        desc: "Big portals dominate local search, but Google's local pack is winnable for agents. Most agents don't know the specific signals that get them into that top-3 box.",
      },
      {
        title: "AI assistants recommend other agents",
        desc: "When a buyer asks an AI 'who's the best realtor in [city],' your competitors who've optimized for AI authority show up. You need an AI presence strategy now.",
      },
      {
        title: "Reviews are inconsistent and under-optimized",
        desc: "Real estate success depends on trust. If your review profile is thin, unresponded-to, or spread across too many platforms without a strategy, you're leaving leads on the table.",
      },
    ],
    solutions: [
      {
        title: "Trust Stack Score with GBP deep-dive",
        desc: "Real estate GBP optimization is nuanced. Geothority checks your categories, service area, photo frequency, review response rate, and post cadence - all in one scan.",
      },
      {
        title: "City Landing Page Generator",
        desc: "Create SEO-optimized neighborhood and city pages in seconds. 'Homes for Sale in [Neighborhood]' pages with proper schema and local signals can rank fast.",
      },
      {
        title: "Competitor Benchmarking",
        desc: "See exactly how you stack up against the top 3 agents in your market. Know what they're doing right and where you can leapfrog them.",
      },
    ],
    testimonial: {
      quote: "I created 8 neighborhood pages with Geothority's content tool. Three of them rank on page 1 now. My GBP calls doubled in 90 days.",
      author: "Priya S.",
      role: "Buyer's Agent, Austin TX",
    },
    stats: [
      { value: "52%", label: "of real estate searches begin on a mobile device with local intent" },
      { value: "87%", label: "of homebuyers use the internet during their home search" },
    ],
    faqs: [
      { q: "Does Geothority work for buyer's agents, listing agents, or both?", a: "Both. The Trust Stack score applies to any local real estate professional - we check GBP, citations, schema, and AI recommendations regardless of your specialty." },
      { q: "Can I use Geothority for multiple zip codes?", a: "Yes. Run scans for different service areas and create city/neighborhood landing pages for each area you want to target." },
      { q: "What schema markup matters most for real estate?", a: "RealEstateAgent and LocalBusiness schema are most important. Geothority's schema wizard generates both with the correct markup for your specific practice." },
      { q: "How do I rank against Zillow and Realtor.com?", a: "You can't out-rank portals for generic terms, but you can win the local pack and neighborhood-specific searches. That's where Geothority focuses." },
      { q: "Can I track my local pack ranking over time?", a: "Geothority's scan history lets you compare Trust Stack scores over time. We're adding native rank tracking in Q3 2025." },
    ],
  },
  "dentists": {
    slug: "dentists",
    name: "Dentists",
    h1: "Local SEO for Dentists - Fill Your Schedule with New Patients",
    description: "Patients search for dentists near me before they book. Geothority's Trust Stack helps dental practices dominate Google Maps, local search, and AI recommendations.",
    painPoints: [
      {
        title: "Your practice doesn't show in the local pack",
        desc: "The top 3 Google Maps results get 70%+ of local clicks. If you're not there, you're invisible to patients who are ready to book - often to a competitor down the street.",
      },
      {
        title: "AI search doesn't recommend you",
        desc: "Patients increasingly ask AI assistants 'find me a dentist in [city].' Without AI-optimized content and proper schema, you won't be part of those answers.",
      },
      {
        title: "Inconsistent NAP data hurts your trust score",
        desc: "Your practice name, address, and phone number are probably listed differently across Healthgrades, Zocdoc, Yelp, and Google. This hurts your local ranking signals.",
      },
    ],
    solutions: [
      {
        title: "Dental Practice Trust Stack",
        desc: "Our Trust Stack checks the specific signals Google uses for healthcare providers - including YMYL (Your Money Your Life) factors, review authority, and citation consistency across medical directories.",
      },
      {
        title: "Healthcare Schema Generator",
        desc: "Generate Dentist, MedicalOrganization, and FAQPage schema in 60 seconds. Rich snippets help patients see your hours, services, and reviews directly in search results.",
      },
      {
        title: "Review Strategy via Starcepta",
        desc: "Integrate with Starcepta to send one-tap review requests to patients after appointments. More reviews = higher local pack ranking and more patient trust.",
      },
    ],
    testimonial: {
      quote: "We went from 47 reviews to 190 in 4 months using Geothority + Starcepta. Our new patient bookings from Google increased 40%. The Trust Stack score was eye-opening.",
      author: "Dr. Angela R.",
      role: "Family Dentist, Tampa FL",
    },
    stats: [
      { value: "77%", label: "of patients use search engines to find dental providers" },
      { value: "4.4+", label: "average star rating needed to be competitive in dental local pack" },
    ],
    faqs: [
      { q: "What local SEO factors matter most for dentists?", a: "For dentists, reviews (volume and recency), GBP optimization, citation consistency across medical directories, and healthcare schema are the highest-impact factors." },
      { q: "Does Geothority check Healthgrades and Zocdoc?", a: "Geothority checks 18 directories including major healthcare platforms. We flag inconsistencies and tell you exactly which ones to fix first." },
      { q: "Can multi-location dental practices use Geothority?", a: "Yes. Run separate scans for each location and get individual Trust Stack scores. Each location has its own citation and GBP profile." },
      { q: "How important is schema for dental websites?", a: "Very important. Proper Dentist schema can enable rich results showing your rating, hours, and accepted insurance directly in Google - before patients even click." },
      { q: "What's the fastest win for a dental practice?", a: "Most dental practices see the fastest wins from GBP optimization (completing all sections, adding photos weekly) and requesting reviews from existing patients." },
    ],
  },
  "lawyers": {
    slug: "lawyers",
    name: "Lawyers",
    h1: "Local SEO for Lawyers - Get Found by Clients Who Need You Now",
    description: "When someone searches for a lawyer, they're ready to hire. Geothority's Trust Stack ensures you appear at the top of local search, Google Maps, and AI recommendations when it matters most.",
    painPoints: [
      {
        title: "Legal directories are cluttered and expensive",
        desc: "Avvo, FindLaw, Martindale-Hubbell - you're paying for visibility on someone else's platform while your own website languishes. Local SEO lets you own your presence.",
      },
      {
        title: "AI assistants recommend your competitors",
        desc: "When a potential client asks an AI 'best personal injury lawyer in [city],' attorneys who've optimized for AI search authority appear first. Are you one of them?",
      },
      {
        title: "Your website lacks E-E-A-T signals",
        desc: "Google applies extra scrutiny to legal content (YMYL). Without proper attorney schema, consistent citations, and authoritative content signals, your rankings suffer.",
      },
    ],
    solutions: [
      {
        title: "Attorney Trust Stack Score",
        desc: "Get a comprehensive score covering GBP optimization, citation consistency across legal directories, attorney schema markup, AI recommendations, and content authority - all ranked by impact.",
      },
      {
        title: "Legal Schema Generator",
        desc: "Generate Attorney, LegalService, and FAQPage schema in 60 seconds. This tells search engines exactly who you are, what you practice, and where you serve clients.",
      },
      {
        title: "Practice Area Landing Pages",
        desc: "Create geo-targeted pages for each practice area and city you serve. 'Personal Injury Lawyer in [City]' pages with proper local signals rank fast for high-intent searches.",
      },
    ],
    testimonial: {
      quote: "I was skeptical, but within 3 months of following Geothority's recommendations, I went from page 2 to the local pack for 'estate planning attorney [city].' Three new client consultations per week from Google alone.",
      author: "James K.",
      role: "Estate Planning Attorney, Chicago IL",
    },
    stats: [
      { value: "96%", label: "of people seeking legal advice start with an online search" },
      { value: "62%", label: "of legal searches have local intent (near me or city name)" },
    ],
    faqs: [
      { q: "Does Geothority work for solo attorneys and small firms?", a: "Yes - Geothority is ideal for solo and small firm attorneys who need enterprise-level local SEO without hiring an agency. The Trust Stack gives you a clear DIY action plan." },
      { q: "Which legal directories does Geothority check?", a: "Geothority checks 18 directories including Avvo, FindLaw, Justia, and general directories like Yelp and Google. We flag citation inconsistencies across all of them." },
      { q: "What schema markup is most important for attorneys?", a: "Attorney and LegalService schema are most critical. Our wizard generates these with your practice areas, service area, and contact information pre-filled." },
      { q: "Can I use Geothority for multiple practice areas?", a: "Yes. Create separate landing pages for each practice area and use Geothority's content tool to optimize each one for local search intent." },
      { q: "How does AI search affect attorney marketing?", a: "Increasingly, potential clients ask AI assistants for lawyer recommendations. Geothority's AI Overview Checker shows if you appear in those results and what to do to improve your presence." },
    ],
  },
  "restaurants": {
    slug: "restaurants",
    name: "Restaurants",
    h1: "Local SEO for Restaurants - Turn Hungry Searches Into Reservations",
    description: "Restaurant searches are the most local of all - people want to eat NOW. Geothority's Trust Stack helps you dominate Google Maps, AI food recommendations, and local search when customers are deciding where to go.",
    painPoints: [
      {
        title: "Competitors outrank you on 'restaurants near me'",
        desc: "The top 3 local pack results capture most clicks from hungry diners. Every day you're not there is revenue going to the restaurant next door.",
      },
      {
        title: "Your menu and hours aren't optimized for AI search",
        desc: "When someone asks an AI 'where should I eat [cuisine] in [city],' restaurants with structured data, consistent citations, and GBP optimization dominate those answers.",
      },
      {
        title: "Review velocity has slowed",
        desc: "Reviews are the #1 ranking factor in restaurant local search. If your competitors are getting more reviews per week than you, they'll outrank you regardless of food quality.",
      },
    ],
    solutions: [
      {
        title: "Restaurant Trust Stack Score",
        desc: "Check your GBP (menu, hours, photos, attributes), citation consistency across Yelp/TripAdvisor/OpenTable, restaurant schema markup, and AI recommendations - all in one 90-second scan.",
      },
      {
        title: "Restaurant Schema Wizard",
        desc: "Generate Restaurant, Menu, and LocalBusiness schema including cuisine type, price range, reservation links, and hours. Rich results show your info before customers click.",
      },
      {
        title: "Review Boost via Starcepta",
        desc: "Send automatic review requests after dining experiences. More reviews, higher rating, better local pack ranking - the virtuous cycle that keeps your tables full.",
      },
    ],
    testimonial: {
      quote: "We added 85 reviews in 2 months using Starcepta through Geothority. Our OpenTable reservations from Google increased 55% once we hit the local pack. Game changer.",
      author: "Sofia M.",
      role: "Owner, Italian Restaurant, Dallas TX",
    },
    stats: [
      { value: "84%", label: "of restaurant searches happen on mobile - local pack gets 70% of clicks" },
      { value: "33%", label: "increase in reservations for restaurants with 4.5+ star ratings vs. 4.0" },
    ],
    faqs: [
      { q: "What matters most for restaurant local SEO?", a: "Reviews (volume, rating, recency), GBP completeness (menu, photos, hours, attributes), citation consistency, and restaurant schema are the top ranking factors." },
      { q: "Does Geothority check Yelp and TripAdvisor?", a: "Yes. Geothority checks 18 directories including Yelp, TripAdvisor, OpenTable, and general business directories. We flag any NAP inconsistencies." },
      { q: "How often should I post to GBP as a restaurant?", a: "Weekly posts showing new dishes, specials, or events dramatically improve GBP engagement signals. Geothority's GBP checklist shows exactly what to post." },
      { q: "Does AI search matter for restaurants?", a: "Yes, increasingly. AI assistants are recommending specific restaurants based on online presence, review quality, and structured data. Get ahead of this now." },
      { q: "Can Geothority help multi-location restaurant chains?", a: "Yes. Each location gets its own Trust Stack score. Run all locations in a batch and prioritize which ones need the most work." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(industries).map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = industries[params.slug];
  if (!data) return {};
  return {
    title: `${data.h1} | Geothority`,
    description: data.description,
    openGraph: { title: data.h1, description: data.description },
  };
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const data = industries[params.slug];
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium mb-4">
            Built for {data.name}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">{data.h1}</h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">{data.description}</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Get Your Free Trust Stack Score <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {data.stats.map((stat, i) => (
            <div key={i} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">{stat.value}</div>
              <p className="text-[var(--muted-foreground)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pain Points */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-2 text-center">The Challenges {data.name} Face</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10">You&apos;re not alone - these are the most common local SEO problems we see.</p>
          <div className="space-y-4">
            {data.painPoints.map((p, i) => (
              <div key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 flex gap-4">
                <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solutions */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-2 text-center">How Geothority Solves It</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10">Purpose-built features for {data.name.toLowerCase()} who want to rank locally.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {data.solutions.map((s, i) => (
              <div key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-3" />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mb-20">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center max-w-2xl mx-auto">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              ))}
            </div>
            <blockquote className="text-lg font-medium mb-4 leading-relaxed">
              &ldquo;{data.testimonial.quote}&rdquo;
            </blockquote>
            <div className="text-sm text-[var(--muted-foreground)]">
              <span className="font-semibold text-foreground">{data.testimonial.author}</span> - {data.testimonial.role}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {data.faqs.map((faq, i) => (
              <details key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
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

        {/* Bottom CTA */}
        <div className="text-center bg-[var(--card)] rounded-2xl border border-[var(--border)] p-10">
          <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Start Ranking Higher Today</h2>
          <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
            Get your Trust Stack Score in 90 seconds. See exactly what&apos;s holding you back and what to fix first.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Try Free - No Credit Card <ArrowRight className="w-5 h-5" />
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
