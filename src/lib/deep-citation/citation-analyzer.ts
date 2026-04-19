/**
 * Deep Citation Analyzer — Core analysis engine
 * Checks NAP, categories, services, hours across 200+ directories
 * Generates Citation Health Reports with actionable corrections
 */

import * as cheerio from "cheerio";
import {
  CitationCheckConfig,
  CitationMatchDetail,
  CitationIssue,
  CitationHealthReport,
  FieldMatchResult,
  TierSummary,
  FieldSummary,
  PrioritizedFix,
  MissingCitation,
  DirectoryTier,
  BusinessHours,
} from "./types";
import { DIRECTORY_REGISTRY, getRelevantDirectories, DirectoryEntry } from "./directory-registry";

// ─── NAP Normalization ─────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\bstreet\b/, "st")
    .replace(/\bavenue\b/, "ave")
    .replace(/\bboulevard\b/, "blvd")
    .replace(/\bdrive\b/, "dr")
    .replace(/\blane\b/, "ln")
    .replace(/\broad\b/, "rd")
    .replace(/\bcourt\b/, "ct")
    .replace(/\bplace\b/, "pl")
    .replace(/\bsuite\b/, "ste")
    .replace(/\bapartment\b/, "apt")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

function addressesMatch(a: string, b: string): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (!na || !nb) return false;
  // Check if one contains the other (addresses may differ in completeness)
  return na === nb || na.includes(nb) || nb.includes(na);
}

function namesMatch(expected: string, found: string): boolean {
  const a = expected.toLowerCase().trim();
  const b = found.toLowerCase().trim();
  return a === b || a.includes(b) || b.includes(a);
}

function hoursMatch(expected: BusinessHours, found: string): FieldMatchResult {
  if (!found || !Object.keys(expected).length) {
    return { status: "not_checked", expected: "", found: null, notes: "Hours not available for comparison" };
  }

  // Simple heuristic: check if day names and times appear in the found text
  const foundLower = found.toLowerCase();
  let matchedDays = 0;
  let totalDays = 0;

  for (const [day, hours] of Object.entries(expected)) {
    if (!hours) continue;
    totalDays++;
    const dayLower = day.toLowerCase().slice(0, 3);
    if (foundLower.includes(dayLower) || foundLower.includes(day.toLowerCase())) {
      // Check if the time range appears
      const openTime = hours.open.replace(/\s/g, "");
      const closeTime = hours.close.replace(/\s/g, "");
      if (foundLower.includes(openTime.toLowerCase()) || foundLower.includes(closeTime.toLowerCase())) {
        matchedDays++;
      } else if (foundLower.includes("closed") && hours === null) {
        matchedDays++;
      }
    }
  }

  if (totalDays === 0) {
    return { status: "not_checked", expected: "", found, notes: "No expected hours provided" };
  }

  const matchRate = matchedDays / totalDays;
  if (matchRate >= 0.8) {
    return { status: "match", expected: JSON.stringify(expected), found, notes: `${Math.round(matchRate * 100)}% of hours match` };
  } else if (matchRate >= 0.5) {
    return { status: "partial", expected: JSON.stringify(expected), found, notes: `${Math.round(matchRate * 100)}% of hours match — some discrepancies` };
  }
  return { status: "mismatch", expected: JSON.stringify(expected), found, notes: `Only ${Math.round(matchRate * 100)}% of hours match — significant discrepancies` };
}

function categoriesMatch(expected: string[], found: string[]): FieldMatchResult {
  if (!expected.length) {
    return { status: "not_checked", expected: [], found, notes: "No expected categories provided" };
  }
  if (!found.length) {
    return { status: "missing", expected, found: null, notes: "No categories found in listing" };
  }

  const expectedLower = expected.map(c => c.toLowerCase());
  const foundLower = found.map(c => c.toLowerCase());
  let matched = 0;

  for (const cat of expectedLower) {
    if (foundLower.some(f => f.includes(cat) || cat.includes(f))) {
      matched++;
    }
  }

  const rate = matched / expected.length;
  if (rate >= 0.8) {
    return { status: "match", expected, found, notes: `${matched}/${expected.length} categories found` };
  } else if (rate >= 0.5) {
    return { status: "partial", expected, found, notes: `${matched}/${expected.length} categories found — some missing` };
  }
  return { status: "mismatch", expected, found, notes: `Only ${matched}/${expected.length} categories match` };
}

// ─── Directory Checkers ────────────────────────────────────────────────────────

async function checkDirectory(
  dir: DirectoryEntry,
  config: CitationCheckConfig
): Promise<CitationMatchDetail> {
  const searchUrl = dir.searchPattern
    .replace(/{name}/g, encodeURIComponent(config.businessName))
    .replace(/{city}/g, encodeURIComponent(config.city))
    .replace(/{state}/g, encodeURIComponent(config.state))
    .replace(/{zip}/g, encodeURIComponent(config.zip || ""));

  // API-backed checks
  if (dir.apiAvailable && dir.id === "google-business") {
    return checkGooglePlacesAPI(dir, config, searchUrl);
  }
  if (dir.apiAvailable && dir.id === "yelp") {
    return checkYelpAPI(dir, config, searchUrl);
  }
  if (dir.apiAvailable && dir.id === "foursquare") {
    return checkFoursquareAPI(dir, config, searchUrl);
  }

  // Scrape-based check
  return scrapeCheck(dir, config, searchUrl);
}

async function checkGooglePlacesAPI(
  dir: DirectoryEntry,
  config: CitationCheckConfig,
  searchUrl: string
): Promise<CitationMatchDetail> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return buildNotFoundResult(dir, searchUrl, "Google API key not configured");
  }

  try {
    const query = `${config.businessName} ${config.city} ${config.state}`;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json() as any;

    if (!data.results?.length) {
      return buildNotFoundResult(dir, searchUrl, "No listing found on Google Maps");
    }

    const place = data.results[0];
    const nameResult: FieldMatchResult = place.name
      ? (namesMatch(config.businessName, place.name)
        ? { status: "match", expected: config.businessName, found: place.name, notes: "Name matches" }
        : { status: "mismatch", expected: config.businessName, found: place.name, notes: `Found "${place.name}" instead of "${config.businessName}"` })
      : { status: "missing", expected: config.businessName, found: null, notes: "Name not found" };

    const addressResult: FieldMatchResult = place.formatted_address && config.address
      ? (addressesMatch(config.address, place.formatted_address)
        ? { status: "match", expected: config.address, found: place.formatted_address, notes: "Address matches" }
        : { status: "partial", expected: config.address, found: place.formatted_address, notes: "Address partially matches" })
      : { status: "not_checked", expected: config.address, found: place.formatted_address || null, notes: "Address not compared" };

    // Google Places doesn't return phone in text search; use details
    const phoneResult: FieldMatchResult = { status: "not_checked", expected: config.phone, found: null, notes: "Phone not available via text search" };
    const catResult: FieldMatchResult = place.types
      ? categoriesMatch(config.categories || [], place.types)
      : { status: "not_checked", expected: config.categories || [], found: null, notes: "Types not available" };
    const serviceResult: FieldMatchResult = { status: "not_checked", expected: config.services || [], found: null, notes: "Services not available via API" };
    const hoursResult: FieldMatchResult = place.opening_hours
      ? { status: "partial", expected: JSON.stringify(config.hours || {}), found: JSON.stringify(place.opening_hours), notes: "Hours data available but format differs" }
      : { status: "not_checked", expected: JSON.stringify(config.hours || {}), found: null, notes: "Hours not available" };
    const websiteResult: FieldMatchResult = { status: "not_checked", expected: config.website || "", found: null, notes: "Website not checked via text search" };

    const issues = collectIssues(dir.name, { name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult }, dir.tier);

    const score = calculateConsistencyScore({ name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult });

    return {
      directory: dir.name,
      directoryId: dir.id,
      tier: dir.tier,
      category: dir.category,
      url: searchUrl,
      listingUrl: place.url || null,
      found: true,
      claimed: null,
      checks: { name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult },
      consistencyScore: score,
      issues,
      claimUrl: dir.claimUrl,
      fixSteps: dir.fixSteps,
      icon: dir.icon,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return buildNotFoundResult(dir, searchUrl, "Google Places API check failed");
  }
}

async function checkYelpAPI(
  dir: DirectoryEntry,
  config: CitationCheckConfig,
  searchUrl: string
): Promise<CitationMatchDetail> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return scrapeCheck(dir, config, searchUrl);
  }

  try {
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(config.businessName)}&location=${encodeURIComponent(`${config.city}, ${config.state}`)}&limit=5`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json() as any;
    const businesses = data.businesses ?? [];
    const match = businesses.find((b: any) =>
      b.name?.toLowerCase().includes(config.businessName.toLowerCase())
    );

    if (!match) {
      return buildNotFoundResult(dir, searchUrl, "Business not found on Yelp");
    }

    const nameResult: FieldMatchResult = namesMatch(config.businessName, match.name)
      ? { status: "match", expected: config.businessName, found: match.name, notes: "Name matches" }
      : { status: "mismatch", expected: config.businessName, found: match.name, notes: `Found "${match.name}"` };

    const phoneResult: FieldMatchResult = config.phone && match.phone
      ? (phonesMatch(config.phone, match.phone)
        ? { status: "match", expected: config.phone, found: match.phone, notes: "Phone matches" }
        : { status: "mismatch", expected: config.phone, found: match.phone, notes: `Phone mismatch: found ${match.phone}` })
      : { status: "not_checked", expected: config.phone, found: match.phone || null, notes: "Phone not compared" };

    const yelpAddr = match.location?.display_address?.join(", ") ?? "";
    const addressResult: FieldMatchResult = config.address && yelpAddr
      ? (addressesMatch(config.address, yelpAddr)
        ? { status: "match", expected: config.address, found: yelpAddr, notes: "Address matches" }
        : { status: "partial", expected: config.address, found: yelpAddr, notes: "Address partially matches" })
      : { status: "not_checked", expected: config.address, found: yelpAddr || null, notes: "Address not compared" };

    const catResult: FieldMatchResult = match.categories
      ? categoriesMatch(config.categories || [], match.categories.map((c: any) => c.title || c.alias))
      : { status: "not_checked", expected: config.categories || [], found: null, notes: "Categories not available" };

    const serviceResult: FieldMatchResult = { status: "not_checked", expected: config.services || [], found: null, notes: "Services not available via Yelp API" };
    const hoursResult: FieldMatchResult = { status: "not_checked", expected: JSON.stringify(config.hours || {}), found: null, notes: "Hours not available via search API" };
    const websiteResult: FieldMatchResult = { status: "not_checked", expected: config.website || "", found: match.url || null, notes: "Yelp URL found" };

    const checks = { name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult };
    const issues = collectIssues(dir.name, checks, dir.tier);
    const score = calculateConsistencyScore(checks);

    return {
      directory: dir.name,
      directoryId: dir.id,
      tier: dir.tier,
      category: dir.category,
      url: searchUrl,
      listingUrl: match.url || null,
      found: true,
      claimed: null,
      checks,
      consistencyScore: score,
      issues,
      claimUrl: dir.claimUrl,
      fixSteps: dir.fixSteps,
      icon: dir.icon,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return scrapeCheck(dir, config, searchUrl);
  }
}

async function checkFoursquareAPI(
  dir: DirectoryEntry,
  config: CitationCheckConfig,
  searchUrl: string
): Promise<CitationMatchDetail> {
  // Foursquare API check — falls back to scrape if no key
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  if (!fsqKey) {
    return scrapeCheck(dir, config, searchUrl);
  }

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(config.businessName)}&near=${encodeURIComponent(`${config.city}, ${config.state}`)}&limit=5`,
      { headers: { Authorization: fsqKey }, signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json() as any;
    const results = data.results ?? [];
    const match = results.find((r: any) =>
      r.name?.toLowerCase().includes(config.businessName.toLowerCase())
    );

    if (!match) {
      return buildNotFoundResult(dir, searchUrl, "Business not found on Foursquare");
    }

    const nameResult: FieldMatchResult = namesMatch(config.businessName, match.name)
      ? { status: "match", expected: config.businessName, found: match.name, notes: "Name matches" }
      : { status: "mismatch", expected: config.businessName, found: match.name, notes: `Found "${match.name}"` };

    const catResult: FieldMatchResult = match.categories
      ? categoriesMatch(config.categories || [], match.categories.map((c: any) => c.name))
      : { status: "not_checked", expected: config.categories || [], found: null, notes: "Categories not available" };

    const addressResult: FieldMatchResult = { status: "not_checked", expected: config.address, found: match.location?.formatted_address || null, notes: "Address from Foursquare" };
    const phoneResult: FieldMatchResult = { status: "not_checked", expected: config.phone, found: null, notes: "Phone not available" };
    const serviceResult: FieldMatchResult = { status: "not_checked", expected: config.services || [], found: null, notes: "" };
    const hoursResult: FieldMatchResult = { status: "not_checked", expected: JSON.stringify(config.hours || {}), found: null, notes: "" };
    const websiteResult: FieldMatchResult = { status: "not_checked", expected: config.website || "", found: null, notes: "" };

    const checks = { name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult };
    const issues = collectIssues(dir.name, checks, dir.tier);
    const score = calculateConsistencyScore(checks);

    return {
      directory: dir.name,
      directoryId: dir.id,
      tier: dir.tier,
      category: dir.category,
      url: searchUrl,
      listingUrl: match.fsq_id ? `https://foursquare.com/v/${match.fsq_id}` : null,
      found: true,
      claimed: null,
      checks,
      consistencyScore: score,
      issues,
      claimUrl: dir.claimUrl,
      fixSteps: dir.fixSteps,
      icon: dir.icon,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return scrapeCheck(dir, config, searchUrl);
  }
}

async function scrapeCheck(
  dir: DirectoryEntry,
  config: CitationCheckConfig,
  searchUrl: string
): Promise<CitationMatchDetail> {
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!res.ok) {
      return buildNotFoundResult(dir, searchUrl, `HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const bodyText = $("body").text();
    const bodyLower = bodyText.toLowerCase();

    const nameFound = bodyLower.includes(config.businessName.toLowerCase());
    const phoneNorm = normalizePhone(config.phone);
    const phoneFound = phoneNorm
      ? bodyLower.includes(phoneNorm) ||
        bodyLower.includes(phoneNorm.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")) ||
        bodyLower.includes(phoneNorm.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"))
      : false;
    const addressFound = config.address
      ? bodyLower.includes(normalizeAddress(config.address))
      : false;

    // Check for categories/services in text (heuristic)
    const foundCategories = (config.categories || []).filter(cat =>
      bodyLower.includes(cat.toLowerCase())
    );
    const foundServices = (config.services || []).filter(svc =>
      bodyLower.includes(svc.toLowerCase())
    );

    // Check for hours keywords
    const hoursKeywords = ["hours", "open", "closed", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const hoursFound = hoursKeywords.some(kw => bodyLower.includes(kw));

    const nameResult: FieldMatchResult = nameFound
      ? { status: "match", expected: config.businessName, found: config.businessName, notes: "Name found in page" }
      : { status: "mismatch", expected: config.businessName, found: null, notes: "Name not found in page" };

    const addressResult: FieldMatchResult = config.address
      ? (addressFound
        ? { status: "match", expected: config.address, found: config.address, notes: "Address found" }
        : { status: "mismatch", expected: config.address, found: null, notes: "Address not found" })
      : { status: "not_checked", expected: "", found: null, notes: "" };

    const phoneResult: FieldMatchResult = config.phone
      ? (phoneFound
        ? { status: "match", expected: config.phone, found: config.phone, notes: "Phone found" }
        : { status: "mismatch", expected: config.phone, found: null, notes: "Phone not found" })
      : { status: "not_checked", expected: "", found: null, notes: "" };

    const catResult: FieldMatchResult = (config.categories || []).length
      ? (foundCategories.length === config.categories!.length
        ? { status: "match", expected: config.categories!, found: foundCategories, notes: `All ${foundCategories.length} categories found` }
        : foundCategories.length > 0
        ? { status: "partial", expected: config.categories!, found: foundCategories, notes: `${foundCategories.length}/${config.categories!.length} categories found` }
        : { status: "missing", expected: config.categories!, found: null, notes: "No categories found" })
      : { status: "not_checked", expected: [], found: null, notes: "" };

    const serviceResult: FieldMatchResult = (config.services || []).length
      ? (foundServices.length === config.services!.length
        ? { status: "match", expected: config.services!, found: foundServices, notes: `All ${foundServices.length} services found` }
        : foundServices.length > 0
        ? { status: "partial", expected: config.services!, found: foundServices, notes: `${foundServices.length}/${config.services!.length} services found` }
        : { status: "missing", expected: config.services!, found: null, notes: "No services found" })
      : { status: "not_checked", expected: [], found: null, notes: "" };

    const hoursResult: FieldMatchResult = config.hours
      ? (hoursFound
        ? { status: "match", expected: JSON.stringify(config.hours), found: "Hours section detected", notes: "Hours info found on page" }
        : { status: "missing", expected: JSON.stringify(config.hours), found: null, notes: "Hours not found on page" })
      : { status: "not_checked", expected: "", found: null, notes: "" };

    const websiteResult: FieldMatchResult = config.website
      ? (bodyLower.includes(config.website.toLowerCase().replace(/^https?:\/\//, ""))
        ? { status: "match", expected: config.website, found: config.website, notes: "Website link found" }
        : { status: "missing", expected: config.website, found: null, notes: "Website link not found" })
      : { status: "not_checked", expected: "", found: null, notes: "" };

    const checks = { name: nameResult, address: addressResult, phone: phoneResult, categories: catResult, services: serviceResult, hours: hoursResult, website: websiteResult };
    const issues = collectIssues(dir.name, checks, dir.tier);
    const score = calculateConsistencyScore(checks);
    const found = nameFound || phoneFound;

    return {
      directory: dir.name,
      directoryId: dir.id,
      tier: dir.tier,
      category: dir.category,
      url: searchUrl,
      listingUrl: null,
      found,
      claimed: null,
      checks,
      consistencyScore: found ? score : 0,
      issues,
      claimUrl: dir.claimUrl,
      fixSteps: dir.fixSteps,
      icon: dir.icon,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return buildNotFoundResult(dir, searchUrl, "Connection failed");
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildNotFoundResult(dir: DirectoryEntry, url: string, reason: string): CitationMatchDetail {
  const notChecked: FieldMatchResult = { status: "not_checked", expected: "", found: null, notes: "Not found" };
  return {
    directory: dir.name,
    directoryId: dir.id,
    tier: dir.tier,
    category: dir.category,
    url,
    listingUrl: null,
    found: false,
    claimed: null,
    checks: { name: notChecked, address: notChecked, phone: notChecked, categories: notChecked, services: notChecked, hours: notChecked, website: notChecked },
    consistencyScore: 0,
    issues: [{
      severity: dir.tier === "critical" || dir.tier === "major" ? "critical" : "high",
      field: "name",
      issue: `Business not found on ${dir.name}`,
      impact: "Missing citation hurts local SEO signals and NAP consistency",
      fixAction: `Claim and create listing on ${dir.name}`,
      fixUrl: dir.claimUrl,
      autoFixable: false,
    }],
    claimUrl: dir.claimUrl,
    fixSteps: dir.fixSteps,
    icon: dir.icon,
    lastChecked: new Date().toISOString(),
  };
}

function collectIssues(
  directoryName: string,
  checks: Record<string, FieldMatchResult>,
  tier: DirectoryTier
): CitationIssue[] {
  const issues: CitationIssue[] = [];
  const severityMap: Record<DirectoryTier, "critical" | "high" | "medium" | "low"> = {
    critical: "critical",
    major: "high",
    important: "medium",
    niche: "low",
    industry: "medium",
  };
  const baseSeverity = severityMap[tier];

  for (const [field, result] of Object.entries(checks)) {
    if (result.status === "mismatch" || result.status === "missing") {
      const severity = field === "name" || field === "phone"
        ? baseSeverity
        : tier === "critical" ? "high" : "medium";

      const impactMap: Record<string, string> = {
        name: "Inconsistent business name confuses search engines and dilutes brand authority",
        address: "Address mismatch is a critical local SEO signal error — Google may suppress your listing",
        phone: "Phone mismatch breaks NAP consistency, a top local ranking factor",
        categories: "Missing categories reduce visibility for relevant search queries",
        services: "Missing service keywords reduce relevance signals for service-based searches",
        hours: "Incorrect hours create poor user experience and may trigger Google warnings",
        website: "Missing website link is a missed backlink and trust signal",
      };

      issues.push({
        severity,
        field,
        issue: result.notes || `${field} ${result.status}`,
        impact: impactMap[field] || "Reduces local SEO consistency signals",
        fixAction: `Update ${field} on ${directoryName} to match canonical NAP`,
        fixUrl: null,
        autoFixable: false,
      });
    } else if (result.status === "partial") {
      issues.push({
        severity: "low",
        field,
        issue: result.notes || `${field} partially matches`,
        impact: "Partial matches may still confuse search engine NAP parsing",
        fixAction: `Verify and align ${field} on ${directoryName} with your canonical business info`,
        fixUrl: null,
        autoFixable: false,
      });
    }
  }

  return issues;
}

function calculateConsistencyScore(checks: Record<string, FieldMatchResult>): number {
  const weights: Record<string, number> = {
    name: 30,
    address: 20,
    phone: 25,
    categories: 10,
    services: 5,
    hours: 5,
    website: 5,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [field, result] of Object.entries(checks)) {
    const weight = weights[field] || 5;
    if (result.status === "not_checked") continue;

    totalWeight += weight;
    if (result.status === "match") score += weight;
    else if (result.status === "partial") score += weight * 0.5;
  }

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

// ─── Report Generation ──────────────────────────────────────────────────────────

export async function generateCitationHealthReport(
  config: CitationCheckConfig,
  previousScore?: number
): Promise<CitationHealthReport> {
  const directories = getRelevantDirectories(config.categories || [], true);

  // Run checks in batches to avoid overwhelming servers
  const batchSize = 10;
  const results: CitationMatchDetail[] = [];

  for (let i = 0; i < directories.length; i += batchSize) {
    const batch = directories.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(dir => checkDirectory(dir, config))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }

  // Tier summaries
  const tiers: DirectoryTier[] = ["critical", "major", "important", "niche", "industry"];
  const tierBreakdown: Record<string, TierSummary> = {};

  for (const tier of tiers) {
    const tierResults = results.filter(r => r.tier === tier);
    tierBreakdown[tier] = {
      total: tierResults.length,
      found: tierResults.filter(r => r.found).length,
      claimed: tierResults.filter(r => r.claimed === true).length,
      avgConsistency: tierResults.length
        ? Math.round(tierResults.reduce((s, r) => s + r.consistencyScore, 0) / tierResults.length)
        : 0,
      issues: tierResults.reduce((s, r) => s + r.issues.length, 0),
    };
  }

  // Field analysis
  const fields = ["name", "address", "phone", "categories", "services", "hours", "website"] as const;
  const fieldAnalysis: Record<string, FieldSummary> = {};

  for (const field of fields) {
    const foundResults = results.filter(r => r.found && r.checks[field].status !== "not_checked");
    const matched = foundResults.filter(r => r.checks[field].status === "match");
    const mismatched = foundResults.filter(r => r.checks[field].status === "mismatch");
    const missing = foundResults.filter(r => r.checks[field].status === "missing");

    fieldAnalysis[field] = {
      matchRate: foundResults.length
        ? Math.round((matched.length / foundResults.length) * 100)
        : 0,
      mismatchCount: mismatched.length,
      missingCount: missing.length,
      commonMismatch: mismatched.length > 0
        ? `Found on: ${mismatched.map(r => r.directory).slice(0, 3).join(", ")}`
        : "No mismatches",
    };
  }

  // Overall score
  const foundResults = results.filter(r => r.found);
  const overallScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.consistencyScore, 0) / results.length)
    : 0;

  const grade: "A" | "B" | "C" | "D" | "F" =
    overallScore >= 80 ? "A" : overallScore >= 60 ? "B" : overallScore >= 40 ? "C" : overallScore >= 20 ? "D" : "F";

  // Critical issues (sorted by severity)
  const criticalIssues = results
    .flatMap(r => r.issues)
    .filter(i => i.severity === "critical" || i.severity === "high")
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 20);

  // Prioritized fixes
  const allIssues = results.flatMap(r =>
    r.issues.map(i => ({
      directory: r.directory,
      tier: r.tier,
      issue: i,
    }))
  );

  const prioritizedFixes: PrioritizedFix[] = allIssues
    .map((item, idx) => {
      const tierPriority: Record<DirectoryTier, number> = { critical: 100, major: 75, important: 50, niche: 25, industry: 40 };
      const severityBoost: Record<string, number> = { critical: 50, high: 30, medium: 10, low: 5 };
      const fieldBoost: Record<string, number> = { name: 20, phone: 18, address: 15, categories: 10, hours: 8, services: 5, website: 5 };

      const priority = (tierPriority[item.tier] || 25) +
        (severityBoost[item.issue.severity] || 0) +
        (fieldBoost[item.issue.field] || 0);

      return {
        priority: 100 - idx, // sort position
        directory: item.directory,
        tier: item.tier,
        issue: item.issue,
        estimatedImpact: item.issue.severity === "critical" ? "high" as const
          : item.issue.severity === "high" ? "high" as const
          : item.issue.severity === "medium" ? "medium" as const
          : "low" as const,
        estimatedTimeMin: item.issue.field === "name" ? 5 : item.issue.field === "phone" ? 5 : 15,
        batchGroup: `${item.issue.field}-fix`,
      };
    })
    .sort((a, b) => (b.priority) - (a.priority))
    .slice(0, 30);

  // Missing citations (opportunities)
  const missingOpportunities: MissingCitation[] = results
    .filter(r => !r.found)
    .map(r => ({
      directory: r.directory,
      tier: r.tier,
      category: r.category,
      estimatedDa: DIRECTORY_REGISTRY.find(d => d.id === r.directoryId)?.daRange?.[0] || 30,
      reason: `${r.directory} is a ${r.tier}-tier ${r.category} directory. Missing this citation weakens your local SEO footprint.`,
      claimUrl: r.claimUrl || "",
    }));

  // Category/service match rates
  const catResults = foundResults.filter(r => r.checks.categories.status !== "not_checked");
  const catMatched = catResults.filter(r => r.checks.categories.status === "match");
  const svcResults = foundResults.filter(r => r.checks.services.status !== "not_checked");
  const svcMatched = svcResults.filter(r => r.checks.services.status === "match");
  const hrsResults = foundResults.filter(r => r.checks.hours.status !== "not_checked");
  const hrsMatched = hrsResults.filter(r => r.checks.hours.status === "match");

  return {
    businessName: config.businessName,
    location: `${config.city}, ${config.state}`,
    generatedAt: new Date().toISOString(),
    overall: {
      grade,
      score: overallScore,
      totalDirectories: results.length,
      foundIn: foundResults.length,
      claimedIn: results.filter(r => r.claimed === true).length,
      consistencyScore: overallScore,
      categoryMatchRate: catResults.length ? Math.round((catMatched.length / catResults.length) * 100) : 0,
      serviceMatchRate: svcResults.length ? Math.round((svcMatched.length / svcResults.length) * 100) : 0,
      hoursAccuracyRate: hrsResults.length ? Math.round((hrsMatched.length / hrsResults.length) * 100) : 0,
    },
    tierBreakdown: tierBreakdown as any,
    fieldAnalysis: fieldAnalysis as any,
    criticalIssues,
    prioritizedFixes,
    missingOpportunities,
    trends: {
      previousScore: previousScore ?? null,
      scoreChange: previousScore != null ? overallScore - previousScore : null,
      newIssuesCount: criticalIssues.length,
      resolvedIssuesCount: 0,
    },
  };
}
