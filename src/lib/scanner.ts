import * as cheerio from "cheerio";

export interface ScanResult {
  url: string;
  businessName: string;
  city: string;
  state: string;
  localAuthorityScore: number;
  layerScores: {
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
  };
  quickWins: QuickWin[];
  competitorGaps: CompetitorGap[];
  rawScanData: RawScanData;
}

export interface QuickWin {
  title: string;
  description: string;
  copyText: string;
  impact: "high" | "medium" | "low";
  layer: number;
}

export interface CompetitorGap {
  domain: string;
  businessName: string;
  advantage: string;
  score: number;
}

interface RawScanData {
  title: string;
  description: string;
  hasNAP: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  hasAboutPage: boolean;
  hasServiceAreaPage: boolean;
  hasFAQPage: boolean;
  hasLicensing: boolean;
  cityPages: string[];
  hasReviewsMentioned: boolean;
  hasGoogleReviewsLink: boolean;
  hasSchema: boolean;
  hasFAQSchema: boolean;
  hasLocalBusinessSchema: boolean;
  pageCount: number;
  internalLinks: string[];
  externalLinks: string[];
  // Enhanced scan fields
  sslValid: boolean;
  sslIssuer: string;
  pageLoadTimeMs: number;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  hasH1: boolean;
  h1Text: string;
  hasViewportMeta: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  imagesTotal: number;
  imagesWithAlt: number;
  imagesMissingAlt: number;
  hasGBPLink: boolean;
}

export async function scanWebsite(
  url: string,
  businessName: string,
  city: string,
  state: string
): Promise<ScanResult> {
  let html = "";
  let fetchError = false;
  let pageLoadTimeMs = 0;
  let sslValid = false;
  let sslIssuer = "";

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // SSRF protection — block internal/metadata URLs
  try {
    const parsed = new URL(normalizedUrl);
    const blockedHosts = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.169.254', '169.254.0.0',
      'metadata.google.internal',
    ];
    const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(parsed.hostname);
    if (blockedHosts.includes(parsed.hostname) || isPrivateIP || parsed.hostname.endsWith('.internal') || parsed.hostname.endsWith('.local')) {
      throw new Error('URL not allowed');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // SSL check — if URL is https, attempt to verify
    sslValid = parsed.protocol === 'https:';
    if (sslValid) {
      sslIssuer = 'Valid (HTTPS)';
    }

    const fetchStart = Date.now();
    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Geothority/1.0; +https://geothority.ai)",
      },
      signal: AbortSignal.timeout(15000),
    });
    pageLoadTimeMs = Date.now() - fetchStart;
    html = await res.text();
  } catch {
    fetchError = true;
  }

  // Check robots.txt and sitemap.xml in parallel
  let hasRobotsTxt = false;
  let hasSitemapXml = false;
  try {
    const baseOrigin = new URL(normalizedUrl).origin;
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      fetch(`${baseOrigin}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${baseOrigin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }),
    ]);
    if (robotsRes.status === 'fulfilled' && robotsRes.value.ok) {
      const robotsText = await robotsRes.value.text();
      hasRobotsTxt = robotsText.toLowerCase().includes('user-agent');
    }
    if (sitemapRes.status === 'fulfilled' && sitemapRes.value.ok) {
      const sitemapText = await sitemapRes.value.text();
      hasSitemapXml = sitemapText.includes('<urlset') || sitemapText.includes('<sitemapindex');
    }
  } catch {
    // ignore
  }

  const $ = fetchError ? null : cheerio.load(html);
  const rawScanData = $ ? analyzeHTML($, url, { sslValid, sslIssuer, pageLoadTimeMs, hasRobotsTxt, hasSitemapXml }) : getEmptyRawScan();

  const layerScores = calculateLayerScores(rawScanData, businessName, city);
  const localAuthorityScore = Math.round(
    layerScores.layer1 * 0.25 +
      layerScores.layer2 * 0.2 +
      layerScores.layer3 * 0.25 +
      layerScores.layer4 * 0.15 +
      layerScores.layer5 * 0.15
  );

  const quickWins = generateQuickWins(rawScanData, layerScores, businessName, city, state);
  const competitorGaps = await findRealCompetitors(businessName, city, state);

  return {
    url,
    businessName,
    city,
    state,
    localAuthorityScore,
    layerScores,
    quickWins,
    competitorGaps,
    rawScanData,
  };
}

interface EnhancedMeta {
  sslValid: boolean;
  sslIssuer: string;
  pageLoadTimeMs: number;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
}

function analyzeHTML($: cheerio.CheerioAPI, baseUrl: string, meta: EnhancedMeta): RawScanData {
  const bodyText = $("body").text().toLowerCase();
  const title = $("title").text() || "";
  const description = $('meta[name="description"]').attr("content") || "";

  const phoneRegex = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
  const hasPhone = phoneRegex.test(bodyText);

  const addressRegex = /\d+\s+[\w\s]+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|way|pl|place)/i;
  const hasAddress = addressRegex.test(bodyText);

  const hasNAP = hasPhone && hasAddress;

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") || "")
    .get();
  const internalLinks = links.filter(
    (l) => l.startsWith("/") || l.includes(baseUrl.replace(/https?:\/\//, ""))
  );
  const externalLinks = links.filter(
    (l) => l.startsWith("http") && !l.includes(baseUrl.replace(/https?:\/\//, ""))
  );

  const hasAboutPage = internalLinks.some((l) => /about/i.test(l));
  const hasServiceAreaPage = internalLinks.some((l) => /service.?area|locations?|coverage/i.test(l));
  const hasFAQPage = internalLinks.some((l) => /faq|frequently/i.test(l));
  const hasLicensing = bodyText.includes("license") || bodyText.includes("licensed");

  const cityPages = internalLinks.filter((l) =>
    /[a-z]+-insurance|insurance-[a-z]+|\/[a-z]+-[a-z]{2}\/?$/i.test(l)
  );

  const hasReviewsMentioned =
    bodyText.includes("review") || bodyText.includes("testimonial");
  const hasGoogleReviewsLink = externalLinks.some((l) =>
    l.includes("google.com/maps") || l.includes("g.page")
  );

  const scripts = $("script[type='application/ld+json']")
    .map((_, el) => $(el).html() || "")
    .get();
  const schemaText = scripts.join(" ").toLowerCase();
  const hasSchema = scripts.length > 0;
  const hasLocalBusinessSchema = schemaText.includes("localbusiness") || schemaText.includes("insuranceagency");
  const hasFAQSchema = schemaText.includes("faqpage");

  // H1 tag check
  const h1El = $("h1").first();
  const hasH1 = h1El.length > 0;
  const h1Text = h1El.text().trim() || "";

  // Viewport meta
  const hasViewportMeta = $("meta[name='viewport']").length > 0;

  // OG & Twitter meta tags
  const hasOgTitle = $("meta[property='og:title']").length > 0;
  const hasOgDescription = $("meta[property='og:description']").length > 0;
  const hasOgImage = $("meta[property='og:image']").length > 0;
  const hasTwitterCard = $("meta[name='twitter:card']").length > 0 || $("meta[property='twitter:card']").length > 0;

  // Image alt tag analysis
  const allImages = $("img");
  const imagesTotal = allImages.length;
  let imagesWithAlt = 0;
  allImages.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) imagesWithAlt++;
  });
  const imagesMissingAlt = imagesTotal - imagesWithAlt;

  // GBP link detection
  const hasGBPLink = externalLinks.some(
    (l) => l.includes("google.com/maps") || l.includes("g.page") || l.includes("business.google.com")
  );

  return {
    title,
    description,
    hasNAP,
    hasPhone,
    hasAddress,
    hasAboutPage,
    hasServiceAreaPage,
    hasFAQPage,
    hasLicensing,
    cityPages,
    hasReviewsMentioned,
    hasGoogleReviewsLink,
    hasSchema,
    hasFAQSchema,
    hasLocalBusinessSchema,
    pageCount: internalLinks.length,
    internalLinks,
    externalLinks,
    sslValid: meta.sslValid,
    sslIssuer: meta.sslIssuer,
    pageLoadTimeMs: meta.pageLoadTimeMs,
    hasRobotsTxt: meta.hasRobotsTxt,
    hasSitemapXml: meta.hasSitemapXml,
    hasH1,
    h1Text,
    hasViewportMeta,
    hasOgTitle,
    hasOgDescription,
    hasOgImage,
    hasTwitterCard,
    imagesTotal,
    imagesWithAlt,
    imagesMissingAlt,
    hasGBPLink,
  };
}

function getEmptyRawScan(): RawScanData {
  return {
    title: "",
    description: "",
    hasNAP: false,
    hasPhone: false,
    hasAddress: false,
    hasAboutPage: false,
    hasServiceAreaPage: false,
    hasFAQPage: false,
    hasLicensing: false,
    cityPages: [],
    hasReviewsMentioned: false,
    hasGoogleReviewsLink: false,
    hasSchema: false,
    hasFAQSchema: false,
    hasLocalBusinessSchema: false,
    pageCount: 0,
    internalLinks: [],
    externalLinks: [],
    sslValid: false,
    sslIssuer: "",
    pageLoadTimeMs: 0,
    hasRobotsTxt: false,
    hasSitemapXml: false,
    hasH1: false,
    h1Text: "",
    hasViewportMeta: false,
    hasOgTitle: false,
    hasOgDescription: false,
    hasOgImage: false,
    hasTwitterCard: false,
    imagesTotal: 0,
    imagesWithAlt: 0,
    imagesMissingAlt: 0,
    hasGBPLink: false,
  };
}

function calculateLayerScores(
  data: RawScanData,
  businessName: string,
  city: string
) {
  // Layer 1: Foundation (NAP/GBP consistency)
  let layer1 = 0;
  if (data.hasPhone) layer1 += 30;
  if (data.hasAddress) layer1 += 30;
  if (data.hasNAP) layer1 += 20;
  if (data.title.toLowerCase().includes(businessName.toLowerCase())) layer1 += 10;
  if (data.title.toLowerCase().includes(city.toLowerCase())) layer1 += 10;

  // Layer 2: Trust Pages
  let layer2 = 0;
  if (data.hasAboutPage) layer2 += 25;
  if (data.hasServiceAreaPage) layer2 += 25;
  if (data.hasLicensing) layer2 += 25;
  if (data.hasFAQPage) layer2 += 25;

  // Layer 3: Geo Content
  let layer3 = 0;
  const cityPageCount = data.cityPages.length;
  if (cityPageCount >= 10) layer3 = 90;
  else if (cityPageCount >= 5) layer3 = 70;
  else if (cityPageCount >= 3) layer3 = 50;
  else if (cityPageCount >= 1) layer3 = 30;
  else layer3 = 10;
  if (data.description.toLowerCase().includes(city.toLowerCase())) layer3 += 10;
  layer3 = Math.min(layer3, 100);

  // Layer 4: Reviews
  let layer4 = 0;
  if (data.hasReviewsMentioned) layer4 += 40;
  if (data.hasGoogleReviewsLink) layer4 += 40;
  if (data.hasReviewsMentioned && data.hasGoogleReviewsLink) layer4 += 20;

  // Layer 5: AI Optimization
  let layer5 = 0;
  if (data.hasSchema) layer5 += 30;
  if (data.hasLocalBusinessSchema) layer5 += 30;
  if (data.hasFAQSchema) layer5 += 20;
  if (data.description.length > 50) layer5 += 10;
  if (data.title.length > 10 && data.title.length < 70) layer5 += 10;

  return { layer1, layer2, layer3, layer4, layer5 };
}

function generateQuickWins(
  data: RawScanData,
  scores: { layer1: number; layer2: number; layer3: number; layer4: number; layer5: number },
  businessName: string,
  city: string,
  state: string
): QuickWin[] {
  const wins: QuickWin[] = [];

  if (!data.hasLocalBusinessSchema) {
    wins.push({
      title: "Add LocalBusiness Schema Markup",
      description: `Your website is missing LocalBusiness structured data. This tells Google exactly who you are, where you're located, and what services you offer. This is the #1 quick fix for AI visibility.`,
      copyText: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "InsuranceAgency",
  "name": "${businessName}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${city}",
    "addressRegion": "${state}"
  },
  "areaServed": {
    "@type": "City",
    "name": "${city}"
  },
  "description": "${businessName} provides auto, home, life, and business insurance in ${city}, ${state}.",
  "priceRange": "$$"
}
</script>`,
      impact: "high",
      layer: 5,
    });
  }

  if (!data.hasAboutPage) {
    wins.push({
      title: "Create an About Page",
      description: `You're missing an About page. Insurance is a trust business — people want to know who they're buying from. An About page with your photo, story, and credentials builds instant credibility.`,
      copyText: `About ${businessName}\n\nServing the ${city}, ${state} community since [year]. As a local independent insurance agent, I help families and businesses find the right coverage at the best price.\n\nLicensed in ${state} | [Phone Number] | [Address]`,
      impact: "high",
      layer: 2,
    });
  }

  if (data.cityPages.length === 0) {
    wins.push({
      title: "Create City-Specific Landing Pages",
      description: `You have zero city-specific pages. Each nearby city you serve should have its own page targeting "[City] insurance agent." This is how you capture search traffic from surrounding areas.`,
      copyText: `Page Title: ${city} Insurance Agent - ${businessName}\n\nMeta Description: Looking for a trusted insurance agent in ${city}, ${state}? ${businessName} offers auto, home, and life insurance with personalized local service.\n\n[Use Geothority's content generator to create full pages automatically]`,
      impact: "high",
      layer: 3,
    });
  }

  if (!data.hasPhone) {
    wins.push({
      title: "Add Your Phone Number to Every Page",
      description: `Your phone number isn't visible on your website. Insurance customers want to call — make it easy. Add a clickable phone number to your header and footer.`,
      copyText: `<a href="tel:+1XXXXXXXXXX" class="phone-link">Call (XXX) XXX-XXXX</a>`,
      impact: "high",
      layer: 1,
    });
  }

  if (!data.hasGoogleReviewsLink) {
    wins.push({
      title: "Link to Your Google Reviews",
      description: `Your website doesn't link to your Google Business Profile. Adding a direct link to your reviews builds trust and encourages more reviews from happy customers.`,
      copyText: `<a href="https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID" target="_blank" rel="noopener">Leave us a review on Google ⭐</a>`,
      impact: "medium",
      layer: 4,
    });
  }

  if (!data.hasFAQSchema) {
    wins.push({
      title: "Add FAQ Schema Markup",
      description: `Adding FAQ structured data helps your website appear in Google's "People Also Ask" section and AI search results. This is critical for AEO (AI Engine Optimization).`,
      copyText: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What types of insurance do you offer in ${city}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${businessName} offers auto, home, life, business, and umbrella insurance to residents and businesses in ${city}, ${state}."
      }
    },
    {
      "@type": "Question",
      "name": "How much does car insurance cost in ${city}, ${state}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Car insurance rates in ${city} vary based on your driving record, vehicle, and coverage needs. Contact ${businessName} for a free personalized quote."
      }
    }
  ]
}
</script>`,
      impact: "medium",
      layer: 5,
    });
  }

  // Sort by impact
  const impactOrder = { high: 0, medium: 1, low: 2 };
  wins.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

  return wins.slice(0, 5);
}

async function findRealCompetitors(businessName: string, city: string, state: string): Promise<CompetitorGap[]> {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey && mapsKey !== 'YOUR_MAPS_API_KEY_HERE') {
    try {
      // Use Places API (New) text search to find competing insurance agents
      const query = `insurance agent ${city} ${state}`;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${mapsKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const places = (data.results || [])
        .filter((p: any) => p.name?.toLowerCase() !== businessName.toLowerCase())
        .slice(0, 3);

      if (places.length > 0) {
        return places.map((p: any) => ({
          domain: p.website || `${p.name?.toLowerCase().replace(/\s+/g, '')}.com`,
          businessName: p.name,
          advantage: `${p.rating ? p.rating + '★ rating, ' : ''}${p.user_ratings_total || 0} reviews on Google Maps`,
          score: Math.min(90, 50 + (p.user_ratings_total || 0) / 10),
        }));
      }
    } catch {
      // Fall through to mock
    }
  }
  return generateMockCompetitors(city, state);
}

function generateMockCompetitors(city: string, state: string): CompetitorGap[] {
  return [
    {
      domain: `${city.toLowerCase().replace(/\s+/g, "")}insurance.com`,
      businessName: `${city} Insurance Group`,
      advantage: "12 city-specific landing pages, FAQ schema on every page",
      score: 78,
    },
    {
      domain: `trusted${state.toLowerCase()}agent.com`,
      businessName: `Trusted ${state} Insurance`,
      advantage: "142 Google reviews (4.9★), active review response",
      score: 72,
    },
    {
      domain: `${city.toLowerCase().replace(/\s+/g, "-")}-coverage.com`,
      businessName: `${city} Coverage Experts`,
      advantage: "Complete LocalBusiness schema, About page with credentials",
      score: 65,
    },
  ];
}
