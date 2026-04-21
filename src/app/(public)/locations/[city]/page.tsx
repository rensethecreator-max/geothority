import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp, Users, Star } from "lucide-react";
import { notFound } from "next/navigation";

const cities: Record<string, {
  slug: string;
  name: string;
  state: string;
  stateAbbr: string;
  h1: string;
  description: string;
  neighborhoods: { name: string; desc: string }[];
  industries: string[];
  testimonial: { quote: string; author: string; role: string };
  stats: { value: string; label: string }[];
  faqs: { q: string; a: string }[];
}> = {
  "chicago": {
    slug: "chicago",
    name: "Chicago",
    state: "Illinois",
    stateAbbr: "IL",
    h1: "Local SEO for Chicago Businesses - Dominate Chicago Search",
    description: "Chicago's 77 neighborhoods mean hyperlocal search is everything. Geothority's Trust Stack helps Chicago businesses rank in the local pack, get found in AI search, and outrank competitors block by block.",
    neighborhoods: [
      {
        name: "The Loop",
        desc: "Chicago's downtown core is fiercely competitive for local search. Financial services, law firms, and professional services need a strong Trust Stack to stand out among thousands of businesses.",
      },
      {
        name: "Lincoln Park",
        desc: "One of Chicago's most affluent neighborhoods. Restaurants, boutiques, and healthcare providers battle for top local pack placement among residents with high purchase intent.",
      },
      {
        name: "Wicker Park",
        desc: "A hub for creative businesses, restaurants, and independent retailers. Geothority helps Wicker Park businesses rank for neighborhood-specific searches that drive foot traffic.",
      },
      {
        name: "Oak Brook",
        desc: "Chicago's western suburb is home to corporate headquarters and professional services. Local SEO in Oak Brook means competing with national brands for local customers.",
      },
    ],
    industries: ["Insurance Agents", "Law Firms", "Dental Practices", "Restaurants", "Real Estate Agents"],
    testimonial: {
      quote: "As a personal injury attorney in the Loop, competition is brutal. Geothority's Trust Stack showed me my schema was missing and my GBP was half-complete. Fixed both in a weekend. Now ranking #2 in the local pack.",
      author: "David L.",
      role: "Personal Injury Attorney, Chicago IL",
    },
    stats: [
      { value: "2.7M", label: "Chicago city population - one of the most competitive local markets in the US" },
      { value: "77", label: "distinct Chicago neighborhoods, each its own local search opportunity" },
    ],
    faqs: [
      { q: "How competitive is local SEO in Chicago?", a: "Chicago is extremely competitive, especially in the Loop and North Side neighborhoods. That's why having a complete Trust Stack - citations, schema, GBP, AI recommendations - is essential." },
      { q: "Does Geothority work for Chicago suburbs like Oak Brook and Evanston?", a: "Yes. Run separate scans for each location. Suburban Chicago has different competitive dynamics than the city - often easier to rank but still requires a strong local presence." },
      { q: "What industries are most competitive in Chicago local search?", a: "Law firms, insurance agents, dental practices, and restaurants face the toughest competition in Chicago. Geothority's industry-specific Trust Stack scoring helps each type." },
      { q: "How do I rank for neighborhood-specific searches in Chicago?", a: "Create neighborhood-specific landing pages optimized for searches like 'dentist in Lincoln Park' or 'insurance agent Wicker Park.' Geothority's content generator builds these in seconds." },
      { q: "Does Google Maps ranking differ by Chicago neighborhood?", a: "Yes. Google localizes results significantly. A business in Logan Square won't appear in the local pack for Lincoln Park searches without neighborhood-specific signals." },
    ],
  },
  "austin": {
    slug: "austin",
    name: "Austin",
    state: "Texas",
    stateAbbr: "TX",
    h1: "Local SEO for Austin Businesses - Rank in Austin's Fast-Growing Market",
    description: "Austin is one of the fastest-growing cities in America, adding thousands of new residents and businesses every month. Geothority helps Austin businesses stay ahead of the competition with a complete Trust Stack optimization strategy.",
    neighborhoods: [
      {
        name: "Downtown Austin",
        desc: "Austin's urban core hosts a mix of tech companies, restaurants, hotels, and professional services. Local pack visibility here means competing with both local institutions and new arrivals.",
      },
      {
        name: "South Congress (SoCo)",
        desc: "South Congress Avenue is one of Austin's most vibrant commercial corridors. Retailers, restaurants, and boutiques need strong local SEO to capture the constant foot traffic.",
      },
      {
        name: "Round Rock",
        desc: "A rapidly growing suburb north of Austin with a booming population of families and young professionals. Service businesses here have a real opportunity to dominate local search.",
      },
      {
        name: "Cedar Park",
        desc: "Cedar Park's explosive residential growth has created huge demand for local services. Insurance agents, dentists, and lawyers can own local search here with the right Trust Stack.",
      },
    ],
    industries: ["Insurance Agents", "Tech Startups", "Restaurants", "Real Estate Agents", "Law Firms"],
    testimonial: {
      quote: "Austin is growing so fast - new competitors appear every month. Geothority keeps me ahead with a Trust Stack score that shows me exactly where I'm vulnerable before competitors catch up.",
      author: "Rachel C.",
      role: "Independent Insurance Agent, Cedar Park TX",
    },
    stats: [
      { value: "#1", label: "fastest-growing large city in America (US Census Bureau)" },
      { value: "58%", label: "of Austin searchers use 'near me' queries for local services" },
    ],
    faqs: [
      { q: "Is local SEO competitive in Austin?", a: "Increasingly so. Austin's rapid growth means new businesses arrive constantly. Getting your Trust Stack established now - before competition intensifies further - is critical." },
      { q: "How do I rank in Austin suburbs like Cedar Park and Round Rock?", a: "Create separate GBP listings and landing pages for each suburb you serve. Geothority's city page generator creates optimized pages for each location in seconds." },
      { q: "Does Austin's tech-heavy population affect local SEO?", a: "Yes - Austin searchers are more likely to use AI assistants for local recommendations. Geothority's AI Overview Checker helps you appear in ChatGPT, Perplexity, Claude, Copilot, Grok, Meta AI, You.com, and Mistral results." },
      { q: "What's the fastest way to rank in Austin?", a: "GBP optimization and citation consistency are the fastest wins in any market. Geothority's Trust Stack scan tells you exactly which quick wins to tackle first." },
      { q: "Can I rank for both 'Austin' and specific neighborhood searches?", a: "Yes. Your main GBP covers Austin broadly. Add neighborhood-specific landing pages for SoCo, East Austin, or wherever you serve to capture those hyperlocal searches." },
    ],
  },
  "tampa": {
    slug: "tampa",
    name: "Tampa",
    state: "Florida",
    stateAbbr: "FL",
    h1: "Local SEO for Tampa Businesses - Win Tampa Bay Local Search",
    description: "Tampa Bay is one of Florida's most competitive local markets. From Hyde Park to Brandon, Geothority's Trust Stack helps Tampa businesses rank at the top of local search, Google Maps, and AI recommendations.",
    neighborhoods: [
      {
        name: "Hyde Park",
        desc: "Tampa's most upscale neighborhood is home to boutique retailers, fine dining, and professional services. High-income searchers here expect to find the best - your Trust Stack needs to reflect that.",
      },
      {
        name: "Channelside",
        desc: "Tampa's waterfront district is booming with restaurants, entertainment, and new development. Local SEO visibility here captures both tourists and the growing downtown resident population.",
      },
      {
        name: "St. Petersburg",
        desc: "St. Pete's vibrant arts district and beach proximity drive constant local searches for restaurants, services, and healthcare providers across the bay.",
      },
      {
        name: "Brandon",
        desc: "Brandon is Tampa's largest eastern suburb with a massive population of families seeking local services. Insurance agents, dentists, and lawyers have a major opportunity here.",
      },
    ],
    industries: ["Insurance Agents", "Dental Practices", "Restaurants", "Real Estate Agents", "Law Firms"],
    testimonial: {
      quote: "My dental practice in Brandon was invisible in local search. Geothority showed me I had NAP inconsistencies on 7 directories and my GBP was missing key attributes. Fixed everything in one weekend - bookings up 30% in two months.",
      author: "Dr. Michael T.",
      role: "General Dentist, Brandon FL",
    },
    stats: [
      { value: "3.2M", label: "Tampa Bay metro population - one of Florida's fastest-growing markets" },
      { value: "42%", label: "of Tampa service searches result in a phone call within 1 hour" },
    ],
    faqs: [
      { q: "Is Tampa Bay competitive for local SEO?", a: "Yes - Tampa, St. Pete, Clearwater, and Brandon all have dense business competition. A complete Trust Stack is essential to stand out in the local pack." },
      { q: "Does Geothority cover St. Petersburg and Clearwater?", a: "Yes. Run separate scans for your St. Pete or Clearwater location. Create city-specific landing pages to capture searches across the entire Tampa Bay area." },
      { q: "What industries are most competitive in Tampa local search?", a: "Insurance, legal, dental, and real estate are highly competitive in Tampa Bay. Geothority's industry-specific Trust Stack scoring helps each type of business prioritize correctly." },
      { q: "How does hurricane season affect local SEO in Tampa?", a: "Storm-related searches spike seasonally. Make sure your GBP hours and emergency services are always up to date - Geothority monitors your GBP for unexpected changes." },
      { q: "Can I target both Tampa and surrounding cities with one account?", a: "Yes. Use multiple city landing pages (Tampa, Brandon, Riverview, Valrico) to capture searches across your entire service area." },
    ],
  },
  "atlanta": {
    slug: "atlanta",
    name: "Atlanta",
    state: "Georgia",
    stateAbbr: "GA",
    h1: "Local SEO for Atlanta Businesses - Rank in Atlanta's Diverse Market",
    description: "Atlanta's sprawling metro and diverse neighborhoods create unique local search opportunities. From Buckhead to Decatur, Geothority's Trust Stack helps Atlanta businesses capture hyperlocal search traffic across the region.",
    neighborhoods: [
      {
        name: "Buckhead",
        desc: "Atlanta's affluent northern district is home to luxury brands, financial services, law firms, and upscale dining. Trust Stack scores here need to be elite to compete with well-funded competitors.",
      },
      {
        name: "Midtown",
        desc: "Atlanta's cultural and commercial hub attracts young professionals and tourists. Restaurants, healthcare providers, and professional services compete intensely for local pack visibility.",
      },
      {
        name: "Decatur",
        desc: "Decatur is one of Atlanta's most beloved communities - independent businesses, restaurants, and professionals here benefit greatly from hyperlocal search optimization.",
      },
      {
        name: "Marietta",
        desc: "Cobb County's largest city is a high-growth suburb where families seek local services. Insurance agents, dentists, and service businesses have strong opportunities to dominate local search.",
      },
    ],
    industries: ["Insurance Agents", "Law Firms", "Real Estate Agents", "Dental Practices", "Restaurants"],
    testimonial: {
      quote: "Atlanta is huge - you can't just say 'Atlanta,' you have to own your neighborhood. Geothority's city page generator helped me create Buckhead and Midtown landing pages in 20 minutes. Both rank in the top 5 now.",
      author: "Keisha R.",
      role: "Estate Planning Attorney, Atlanta GA",
    },
    stats: [
      { value: "6.2M", label: "Atlanta metro population across 29 counties" },
      { value: "65%", label: "of Atlanta small business searches have neighborhood-specific intent" },
    ],
    faqs: [
      { q: "How large is Atlanta's local search market?", a: "Atlanta is one of the top 10 largest US metro areas with 6.2M+ people. Local search is highly fragmented by neighborhood and suburb - hyperlocal targeting is essential." },
      { q: "Does Geothority cover Atlanta suburbs like Alpharetta and Sandy Springs?", a: "Yes. Create separate GBP listings and landing pages for each suburb. Many suburban Atlanta markets are less competitive than Midtown or Buckhead - easier wins available." },
      { q: "How do I rank across multiple Atlanta neighborhoods?", a: "Create individual landing pages for each area you serve (Buckhead, Midtown, Decatur, etc.) with neighborhood-specific content. Geothority's page generator builds these fast." },
      { q: "What's the biggest local SEO mistake Atlanta businesses make?", a: "Targeting 'Atlanta' broadly instead of their specific neighborhoods. The local pack is hyper-geographic. Geothority's competitor analysis shows exactly who you're up against in each area." },
      { q: "Is AI search important for Atlanta businesses?", a: "Yes - Atlanta has a large tech-forward professional population that uses AI assistants heavily. Geothority's AI Overview Checker ensures you appear in ChatGPT, Perplexity, Claude, Copilot, Grok, Meta AI, You.com, and Mistral recommendations." },
    ],
  },
  "dallas": {
    slug: "dallas",
    name: "Dallas",
    state: "Texas",
    stateAbbr: "TX",
    h1: "Local SEO for Dallas Businesses - Dominate DFW Local Search",
    description: "The Dallas-Fort Worth Metroplex is one of America's largest and fastest-growing markets. Geothority's Trust Stack helps Dallas businesses cut through the competition and rank at the top of local search across the DFW area.",
    neighborhoods: [
      {
        name: "Uptown Dallas",
        desc: "Dallas's most walkable neighborhood is packed with restaurants, boutiques, and young professionals. Businesses here need a strong Trust Stack to compete in one of Dallas's densest commercial areas.",
      },
      {
        name: "Plano",
        desc: "Plano's corporate campus concentration and affluent residential base create huge demand for local professional services. Insurance agents, attorneys, and healthcare providers can own local search here.",
      },
      {
        name: "Frisco",
        desc: "One of America's fastest-growing cities, Frisco's young families seek every kind of local service. Get your Trust Stack right now before this market becomes saturated.",
      },
      {
        name: "Fort Worth",
        desc: "Fort Worth has its own distinct local search market separate from Dallas. From the Cultural District to Sundance Square, FW businesses need their own local SEO strategy.",
      },
    ],
    industries: ["Insurance Agents", "Real Estate Agents", "Law Firms", "Dental Practices", "Restaurants"],
    testimonial: {
      quote: "DFW is massive - but Frisco is a gold rush right now. I set up Geothority, found out my schema was completely wrong for my insurance agency, fixed it, and hit the local pack within 6 weeks. The ROI is insane.",
      author: "Brandon W.",
      role: "Independent Insurance Agent, Frisco TX",
    },
    stats: [
      { value: "7.8M", label: "Dallas-Fort Worth metro population - 4th largest in the US" },
      { value: "#2", label: "fastest-growing major metro in America - new competitors arrive daily" },
    ],
    faqs: [
      { q: "Is the DFW local search market different from Dallas proper?", a: "Yes. Dallas, Plano, Frisco, Allen, McKinney, and Fort Worth each have distinct local search markets. One GBP for 'Dallas' won't capture suburban searches." },
      { q: "How competitive is local SEO in Plano and Frisco?", a: "Plano is very competitive due to corporate concentration. Frisco is growing fast but still winnable - especially for service businesses that establish their Trust Stack now." },
      { q: "Does Geothority cover Fort Worth separately from Dallas?", a: "Yes. Fort Worth is a separate local market. Create distinct landing pages and ensure your GBP service area correctly covers Fort Worth if you serve customers there." },
      { q: "What's the best strategy for a new Dallas business?", a: "Start with GBP optimization and citation consistency - these are foundational. Geothority's Trust Stack scan identifies your highest-impact quick wins within 90 seconds." },
      { q: "How do I compete with large national chains in Dallas?", a: "National chains struggle with hyperlocal signals. Geothority helps you optimize for your specific neighborhood, service area, and community connections - advantages chains can't easily replicate." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(cities).map(city => ({ city }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const data = cities[params.city];
  if (!data) return {};
  return {
    title: `${data.h1} | Geothority`,
    description: data.description,
    openGraph: { title: data.h1, description: data.description },
  };
}

export default function CityPage({ params }: { params: { city: string } }) {
  const data = cities[params.city];
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            {data.name}, {data.state}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">{data.h1}</h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">{data.description}</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Scan Your {data.name} Business Free <ArrowRight className="w-5 h-5" />
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

        {/* Neighborhoods */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-2 text-center">{data.name} Neighborhoods We Help</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10">
            Local SEO in {data.name} is hyperlocal - each neighborhood has its own competitive landscape.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {data.neighborhoods.map((n, i) => (
              <div key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold">{n.name}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{n.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-2 text-center">Industries We Serve in {data.name}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10">
            Geothority helps these {data.name} business types rank higher in local search.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {data.industries.map((ind, i) => (
              <span key={i} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-full text-sm font-medium">
                {ind}
              </span>
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
          <h2 className="text-2xl font-bold mb-8 text-center">
            Local SEO in {data.name} - Common Questions
          </h2>
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
          <h2 className="text-2xl font-bold mb-4">Ready to Rank Higher in {data.name}?</h2>
          <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
            Get your Trust Stack Score in 90 seconds. See how you stack up against {data.name} competitors.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Free Scan for {data.name} Businesses <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Local Business Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Geothority",
              "applicationCategory": "BusinessApplication",
              "description": `Local SEO platform for businesses in ${data.name}, ${data.state}`,
              "areaServed": {
                "@type": "City",
                "name": data.name,
                "addressRegion": data.stateAbbr,
                "addressCountry": "US",
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Free tier available",
              },
            }),
          }}
        />
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
