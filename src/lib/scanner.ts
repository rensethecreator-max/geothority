import * as cheerio from "cheerio";
import { fetchPublicText } from "@/lib/security/safe-url-fetch";
import { normalizePublicHttpUrl } from "@/lib/security/public-url";

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
  brandCapture: BrandCaptureData;
}

export interface BrandCaptureData {
  businessName: string;
  websiteUrl: string;
  logoUrl: string | null;
  logoSource: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontFamilyHint: string | null;
  heroImageUrl: string | null;
  serviceImageUrls: string[];
  businessCategory: string | null;
  motif: string;
  tone: string;
  confidenceScore: number;
  extractionNotes: string[];
}

export class WebsiteScanError extends Error {
  constructor(message: string, public readonly status: 400 | 422, options?: ErrorOptions) {
    super(message, options);
    this.name = "WebsiteScanError";
  }
}

export async function scanWebsite(
  url: string,
  businessName: string,
  city: string,
  state: string
): Promise<ScanResult> {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePublicHttpUrl(url).toString();
  } catch (error) {
    throw new WebsiteScanError(
      error instanceof Error ? error.message : "Enter a valid public website URL.",
      400,
      { cause: error },
    );
  }

  // A failed or blocked fetch is not evidence about the website's quality.
  // Stop before scoring or persisting a report when the main page cannot be read.
  const fetchStart = Date.now();
  let page: Awaited<ReturnType<typeof fetchPublicText>>;
  try {
    page = await fetchPublicText(normalizedUrl, { timeoutMs: 15_000, maxBytes: 2 * 1024 * 1024 });
  } catch (error) {
    throw new WebsiteScanError(
      "We couldn't read this website. Check the URL and that the website allows automated scans, then try again.",
      422,
      { cause: error },
    );
  }
  if (!page.text.trim()) {
    throw new WebsiteScanError("This website returned an empty page. Please try again later.", 422);
  }

  const pageLoadTimeMs = Date.now() - fetchStart;
  const html = page.text;
  normalizedUrl = page.finalUrl;
  const sslValid = new URL(normalizedUrl).protocol === "https:";
  const sslIssuer = sslValid ? "Valid (HTTPS)" : "";

  // Check robots.txt and sitemap.xml in parallel
  let hasRobotsTxt = false;
  let hasSitemapXml = false;
  try {
    const baseOrigin = new URL(normalizedUrl).origin;
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      fetchPublicText(`${baseOrigin}/robots.txt`, { timeoutMs: 5000, maxBytes: 256 * 1024 }),
      fetchPublicText(`${baseOrigin}/sitemap.xml`, { timeoutMs: 5000, maxBytes: 1024 * 1024 }),
    ]);
    if (robotsRes.status === 'fulfilled') {
      const robotsText = robotsRes.value.text;
      hasRobotsTxt = robotsText.toLowerCase().includes('user-agent');
    }
    if (sitemapRes.status === 'fulfilled') {
      const sitemapText = sitemapRes.value.text;
      hasSitemapXml = sitemapText.includes('<urlset') || sitemapText.includes('<sitemapindex');
    }
  } catch {
    // ignore
  }

  const $ = cheerio.load(html);
  const rawScanData = analyzeHTML($, normalizedUrl, businessName, { sslValid, sslIssuer, pageLoadTimeMs, hasRobotsTxt, hasSitemapXml });

  const layerScores = calculateLayerScores(rawScanData, businessName, city);
  const localAuthorityScore = Math.round(
    layerScores.layer1 * 0.25 +
      layerScores.layer2 * 0.2 +
      layerScores.layer3 * 0.25 +
      layerScores.layer4 * 0.15 +
      layerScores.layer5 * 0.15
  );

  const quickWins = generateQuickWins(rawScanData, layerScores, businessName, city, state);
  // Maps discovery alone does not verify a competitor website or measure its
  // authority score. Leave comparisons empty until a competitor audit exists.
  const competitorGaps: CompetitorGap[] = [];

  return {
    url: normalizedUrl,
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

const LOCAL_BUSINESS_SCHEMA_TYPES = new Set([
  "localbusiness", "insuranceagency", "financialservice", "accountingservice",
  "legalservice", "attorney", "professionalservice", "homeandconstructionbusiness",
  "plumber", "electrician", "generalcontractor", "hvacbusiness", "roofingcontractor",
  "housepainter", "locksmith", "movingcompany", "medicalbusiness", "medicalclinic",
  "dentist", "physician", "optician", "pharmacy", "healthandbeautybusiness",
  "beautysalon", "hairsalon", "dayspa", "nailsalon", "automotivebusiness",
  "autorepair", "autobodyshop", "autodealer", "store", "foodestablishment",
  "restaurant", "cafeorcoffeeshop", "realestateagent", "travelagency",
  "veterinarycare", "childcare", "drycleaningorlaundry", "employmentagency",
]);

/** Read actual JSON-LD types, including @graph and type arrays, without
 * mistaking an ordinary text mention for business structured data. */
export function hasLocalBusinessStructuredData(scripts: string[]): boolean {
  function containsBusinessType(value: unknown): boolean {
    if (Array.isArray(value)) return value.some(containsBusinessType);
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    if (types.some(type => typeof type === "string" && LOCAL_BUSINESS_SCHEMA_TYPES.has(
      type.replace(/^https?:\/\/schema\.org\//i, "").toLowerCase(),
    ))) return true;
    return Object.values(record).some(containsBusinessType);
  }

  return scripts.some(script => {
    try { return containsBusinessType(JSON.parse(script)); }
    catch { return false; }
  });
}

function analyzeHTML($: cheerio.CheerioAPI, baseUrl: string, businessName: string, meta: EnhancedMeta): RawScanData {
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
  const hasLocalBusinessSchema = hasLocalBusinessStructuredData(scripts);
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
  const brandCapture = extractBrandCapture($, baseUrl, businessName, bodyText);

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
    brandCapture,
  };
}

function toAbsoluteAssetUrl(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) return null;

  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstPresent<T>(values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

function extractColorCandidate($: cheerio.CheerioAPI): string | null {
  const themeColor = $("meta[name='theme-color']").attr("content");
  if (themeColor && /^#?[0-9a-f]{3,8}$/i.test(themeColor.trim())) {
    return themeColor.startsWith("#") ? themeColor : `#${themeColor}`;
  }

  const inlineColors = $("header, nav, body, .navbar, .site-header, .header")
    .map((_, el) => $(el).attr("style") || "")
    .get()
    .join(" ");
  const match = inlineColors.match(/(?:background|color|border-color)\s*:\s*(#[0-9a-f]{3,8})/i);
  return match?.[1] || null;
}

function inferBusinessCategory(text: string): string | null {
  const categories = [
    { value: "insurance", terms: ["insurance", "policy", "coverage", "agent"] },
    { value: "home services", terms: ["roof", "hvac", "plumbing", "electrician", "contractor", "repair"] },
    { value: "medical", terms: ["doctor", "clinic", "dental", "dentist", "health", "medical", "patient"] },
    { value: "med spa", terms: ["med spa", "aesthetic", "botox", "facial", "laser"] },
    { value: "law firm", terms: ["attorney", "law firm", "lawyer", "legal"] },
    { value: "restaurant", terms: ["restaurant", "menu", "dining", "food", "catering"] },
  ];

  const normalized = text.toLowerCase();
  return categories.find((category) => category.terms.some((term) => normalized.includes(term)))?.value || null;
}

function themeForCategory(category: string | null) {
  switch (category) {
    case "insurance":
      return { motif: "clean professional trust", tone: "calm, credible, reassuring", color: "#2563eb" };
    case "home services":
      return { motif: "bold local service", tone: "practical, direct, dependable", color: "#f97316" };
    case "medical":
      return { motif: "clinical trust", tone: "clean, reassuring, professional", color: "#0f766e" };
    case "med spa":
      return { motif: "soft premium wellness", tone: "polished, warm, elevated", color: "#c084fc" };
    case "law firm":
      return { motif: "formal authority", tone: "restrained, confident, high-trust", color: "#1e3a8a" };
    case "restaurant":
      return { motif: "warm hospitality", tone: "inviting, local, visual", color: "#dc2626" };
    default:
      return { motif: "local business trust", tone: "clear, helpful, professional", color: "#4f46e5" };
  }
}

function extractBrandCapture($: cheerio.CheerioAPI, baseUrl: string, businessName: string, bodyText: string): BrandCaptureData {
  const notes: string[] = [];
  const logoFromHeader = $("header img, nav img, .logo img, [class*='logo'] img")
    .map((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      const alt = ($(el).attr("alt") || "").toLowerCase();
      const resolved = toAbsoluteAssetUrl(src, baseUrl);
      if (!resolved) return "";
      if (alt.includes("logo") || resolved.toLowerCase().includes("logo") || alt.includes(businessName.toLowerCase().split(" ")[0] || "")) return resolved;
      return "";
    })
    .get()
    .find(Boolean);
  const logoUrl = firstPresent([
    logoFromHeader,
    toAbsoluteAssetUrl($("link[rel='apple-touch-icon']").attr("href"), baseUrl),
    toAbsoluteAssetUrl($("link[rel='icon']").attr("href"), baseUrl),
    toAbsoluteAssetUrl($("meta[property='og:image']").attr("content"), baseUrl),
  ]);

  if (logoUrl) notes.push("Detected logo/brand image candidate from site assets.");

  const heroImageUrl = firstPresent([
    toAbsoluteAssetUrl($("meta[property='og:image']").attr("content"), baseUrl),
    toAbsoluteAssetUrl($("main img, section img, [class*='hero'] img").first().attr("src"), baseUrl),
  ]);
  if (heroImageUrl) notes.push("Detected hero or social preview image candidate.");

  const serviceImageUrls = $("main img, section img")
    .map((_, el) => toAbsoluteAssetUrl($(el).attr("src") || $(el).attr("data-src"), baseUrl) || "")
    .get()
    .filter((src) => src && src !== logoUrl && src !== heroImageUrl)
    .slice(0, 4);

  const category = inferBusinessCategory(`${$("title").text()} ${$("meta[name='description']").attr("content") || ""} ${$("h1").first().text()} ${bodyText.slice(0, 4000)}`);
  const categoryTheme = themeForCategory(category);
  const primaryColor = extractColorCandidate($) || categoryTheme.color;
  const fontFamilyHint = firstPresent([
    $("body").attr("style")?.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim(),
    $("html").attr("style")?.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim(),
  ]);

  let confidenceScore = 20;
  if (logoUrl) confidenceScore += 25;
  if (primaryColor) confidenceScore += 15;
  if (heroImageUrl) confidenceScore += 15;
  if (category) confidenceScore += 15;
  if (fontFamilyHint) confidenceScore += 5;

  if (category) notes.push(`Inferred business category: ${category}.`);
  if (!logoUrl) notes.push("No high-confidence logo found; use fallback or manual upload.");

  return {
    businessName,
    websiteUrl: baseUrl,
    logoUrl,
    logoSource: logoUrl ? "website_scan" : null,
    primaryColor,
    secondaryColor: null,
    accentColor: categoryTheme.color,
    fontFamilyHint,
    heroImageUrl,
    serviceImageUrls,
    businessCategory: category,
    motif: categoryTheme.motif,
    tone: categoryTheme.tone,
    confidenceScore: Math.min(confidenceScore, 95),
    extractionNotes: notes,
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

export function generateQuickWins(
  data: Pick<RawScanData, "hasLocalBusinessSchema" | "hasAboutPage" | "cityPages" | "hasPhone" | "hasGoogleReviewsLink" | "hasFAQSchema">,
  scores: { layer1: number; layer2: number; layer3: number; layer4: number; layer5: number },
  businessName: string,
  city: string,
  state: string
): QuickWin[] {
  const wins: QuickWin[] = [];
  // Escaping '<' prevents a business name containing </script> from ending
  // the element when a customer installs this otherwise valid JSON-LD.
  const schemaSnippet = (value: object) => `<script type="application/ld+json">\n${JSON.stringify(value, null, 2).replace(/</g, "\\u003c")}\n</script>`;

  if (!data.hasLocalBusinessSchema) {
    wins.push({
      title: "Add LocalBusiness Schema Markup",
      description: "Recognized local business structured data was not detected on the scanned page. Review existing markup before adding this starter template. Confirm the business name and location, choose an accurate business subtype if appropriate, and add only verified details. Structured data does not guarantee rankings or AI recommendations.",
      copyText: schemaSnippet({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: businessName,
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressRegion: state,
        },
      }),
      impact: "high",
      layer: 5,
    });
  }

  if (!data.hasAboutPage) {
    wins.push({
      title: "Create an About Page",
      description: "An About-page link was not detected on the scanned page. Check whether one already exists and make it easy to find. Explain your business, the people behind it, and relevant experience using accurate details.",
      copyText: `About ${businessName}\n\n[Describe your business and the services you actually provide.]\n\nOur connection to ${city}, ${state}\n[Describe your local experience and confirmed service area.]\n\nMeet the team\n[Add names, roles, and verified qualifications you want to make public.]\n\nContact us\n[Add your current business contact details.]\n\nReplace every placeholder and review the facts before publishing.`,
      impact: "high",
      layer: 2,
    });
  }

  if (data.cityPages.length === 0) {
    wins.push({
      title: "Review Your Local Service Information",
      description: "No city-page links matching this scan's detection patterns were found on the scanned page. This does not prove that local pages are missing. Review existing pages first, then add useful local information only for places you actually serve.",
      copyText: `Page outline: ${businessName} in ${city}, ${state}\n\nServices available\n[List only services you actually provide here.]\n\nWhere we work\n[Confirm locations served and any service limitations.]\n\nLocal experience\n[Add useful, original details about your work in this area.]\n\nHow to contact us\n[Provide accurate contact or appointment instructions.]\n\nReview existing pages before creating another one. Replace placeholders and verify all details before publishing.`,
      impact: "high",
      layer: 3,
    });
  }

  if (!data.hasPhone) {
    wins.push({
      title: "Make Your Business Phone Number Easy to Find",
      description: "A phone number matching this scan's detection patterns was not found on the scanned page. Check your contact details and add a clickable business number where useful. Replace the placeholder below with your actual number before publishing.",
      copyText: `<a href="tel:+1XXXXXXXXXX" class="phone-link">Call (XXX) XXX-XXXX</a>`,
      impact: "high",
      layer: 1,
    });
  }

  if (!data.hasGoogleReviewsLink) {
    wins.push({
      title: "Link to Your Google Reviews",
      description: "A recognized Google review or Maps link was not detected on the scanned page. Check existing links, then use your business's correct review link to invite every customer to share honest feedback. Replace the place-ID placeholder before publishing.",
      copyText: `<a href="https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID" target="_blank" rel="noopener">Leave us a review on Google ⭐</a>`,
      impact: "medium",
      layer: 4,
    });
  }

  if (!data.hasFAQSchema) {
    wins.push({
      title: "Add FAQ Schema Markup",
      description: "FAQ structured data was not detected on the scanned page. If you publish helpful questions and answers, any FAQ markup must match that visible content. Replace these placeholders with accurate answers before use; markup does not guarantee a special search appearance.",
      copyText: schemaSnippet({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What services does ${businessName} offer?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "[Describe only the services this business actually provides. Match the answer visible on your website.]",
            },
          },
          {
            "@type": "Question",
            name: `How can I contact ${businessName}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "[Provide verified business contact details and any relevant appointment instructions. Match the visible website answer.]",
            },
          },
        ],
      }),
      impact: "medium",
      layer: 5,
    });
  }

  // Sort by impact
  const impactOrder = { high: 0, medium: 1, low: 2 };
  wins.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

  return wins.slice(0, 5);
}
