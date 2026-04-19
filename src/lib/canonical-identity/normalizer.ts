/**
 * Canonical Identity Normalizer — Core Logic
 *
 * Pure-function engine that:
 * 1. Normalizes raw business data into canonical form
 * 2. Validates the canonical profile
 * 3. Computes confidence/truth scores per field
 * 4. Diffs canonical vs found data (citation truth layer)
 * 5. Scores citation impact (how much inconsistencies hurt)
 * 6. Prioritizes fix actions by impact
 */

import { createHash } from "crypto";
import type {
  CanonicalProfile,
  IdentityConfidence,
  FieldConfidence,
  FieldDiff,
  CitationImpactScore,
  PrioritizedAction,
  ValidationIssue,
  NormalizedHours,
  DiffStatus,
  ConfidenceLevel,
} from "./types";

// ─── Address Abbreviation Maps ────────────────────────────────────────

const STREET_ABBREVS: Record<string, string> = {
  street: "st", avenue: "ave", boulevard: "blvd", drive: "dr", lane: "ln",
  road: "rd", court: "ct", place: "pl", circle: "cir", way: "way",
  parkway: "pkwy", highway: "hwy", terrace: "ter", trail: "trl",
  crossing: "xing", square: "sq", center: "ctr",
};

const UNIT_ABBREVS: Record<string, string> = {
  suite: "ste", apartment: "apt", unit: "unit", floor: "fl",
  building: "bldg", room: "rm",
};

const DIR_ABBREVS: Record<string, string> = {
  north: "n", south: "s", east: "e", west: "w",
  northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
};

const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN",
  texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  // Add DC and territories
  "district of columbia": "DC", "puerto rico": "PR", guam: "GU",
};

// Business name suffixes to normalize
const NAME_SUFFIXES: Record<string, string> = {
  llc: "LLC", inc: "Inc", corp: "Corp", co: "Co",
  ltd: "Ltd", lp: "LP", llp: "LLP", plc: "PLC",
};

// ─── Phone Normalization ──────────────────────────────────────────────

/**
 * Normalize phone to E.164 format (+1XXXXXXXXXX for US).
 * Returns empty string if unparseable.
 */
export function normalizePhoneE164(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[\s\-\(\)\.\+]/g, "");
  // US number: 10 or 11 digits
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 5) return `+${digits}`; // international fallback
  return "";
}

/**
 * Normalize phone for comparison (digits only).
 */
export function normalizePhoneCompare(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^1/, "");
}

// ─── Address Normalization ────────────────────────────────────────────

/**
 * Normalize a street address for comparison.
 * Lowercase, abbreviate street types, unit types, directions.
 */
export function normalizeAddress(addr: string): string {
  if (!addr) return "";
  let a = addr.toLowerCase().trim();

  // Abbreviate directions (must be whole words)
  for (const [full, abbr] of Object.entries(DIR_ABBREVS)) {
    a = a.replace(new RegExp(`\\b${full}\\b`, "g"), abbr);
  }

  // Abbreviate street types (must be whole words, avoid "street" in "streetview")
  for (const [full, abbr] of Object.entries(STREET_ABBREVS)) {
    a = a.replace(new RegExp(`\\b${full}\\b\\.?`, "g"), abbr);
  }

  // Abbreviate unit types
  for (const [full, abbr] of Object.entries(UNIT_ABBREVS)) {
    a = a.replace(new RegExp(`\\b${full}\\b\\.?`, "g"), abbr);
  }

  // Remove punctuation, collapse whitespace
  a = a.replace(/[.,#]/g, "").replace(/\s+/g, " ").trim();
  return a;
}

// ─── Business Name Normalization ──────────────────────────────────────

/**
 * Normalize business name for comparison.
 * Trim, title-case main words, normalize suffixes.
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return "";
  let n = name.trim();

  // Normalize common suffixes to consistent casing
  const suffixPattern = /\b( llc| inc| corp| co| ltd| lp| llp| plc)\.?$/i;
  const match = n.match(suffixPattern);
  if (match) {
    const suffixKey = match[1].trim().replace(/\./, "").toLowerCase();
    const normalized = NAME_SUFFIXES[suffixKey];
    if (normalized) {
      n = n.replace(suffixPattern, ` ${normalized}`);
    }
  }

  // Title case (simple approach)
  n = n.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );

  // Re-fix suffixes that got title-cased
  for (const [_, suffix] of Object.entries(NAME_SUFFIXES)) {
    n = n.replace(new RegExp(`\\b${suffix.charAt(0) + suffix.slice(1).toLowerCase()}\\b`), suffix);
  }

  return n.trim();
}

// ─── State Normalization ──────────────────────────────────────────────

export function normalizeState(state: string): string {
  if (!state) return "";
  const s = state.trim();
  if (s.length === 2) return s.toUpperCase();
  const lower = s.toLowerCase();
  return STATE_MAP[lower] || s.toUpperCase().slice(0, 2);
}

// ─── Website Normalization ────────────────────────────────────────────

export function normalizeWebsite(url: string): string {
  if (!url) return "";
  let u = url.trim().toLowerCase();
  if (!u.startsWith("http")) u = `https://${u}`;
  // Remove trailing slash
  u = u.replace(/\/+$/, "");
  // Remove www
  u = u.replace(/^https?:\/\/www\./, (m) => m.replace("www.", ""));
  return u;
}

// ─── Hours Normalization ──────────────────────────────────────────────

const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_ABBREV_3 = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Normalize hours to {monday..sunday: {open, close} | null} in 24h HH:mm.
 */
export function normalizeHours(hours: Record<string, any> | null): NormalizedHours {
  const result: NormalizedHours = {};

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const dayAbbr = DAY_ABBREV_3[i];

    // Try full name, then 3-letter abbrev, then 2-letter, then 1-letter
    const entry = hours?.[dayName] ?? hours?.[dayAbbr] ?? hours?.[dayName.slice(0, 2)] ?? hours?.[dayName[0]] ?? null;

    if (entry === null || entry === undefined || entry === "closed" || entry === "") {
      result[dayName] = null;
    } else if (typeof entry === "object") {
      result[dayName] = {
        open: normalizeTime(entry.open ?? entry.start ?? ""),
        close: normalizeTime(entry.close ?? entry.end ?? ""),
      };
    }
  }

  return result;
}

function normalizeTime(t: string): string {
  if (!t) return "00:00";
  // Already 24h HH:mm
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  // 12h format like "9:00 AM" or "9:00AM"
  const m = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] || "00";
    const ampm = m[3].toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }
  return t;
}

// ─── Main Normalizer ──────────────────────────────────────────────────

export interface RawBusinessInput {
  businessName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  email?: string;
  description?: string;
  categories?: string[];
  hours?: Record<string, any>;
  geo?: { lat: number; lng: number } | null;
  logoUrl?: string;
  photoUrls?: string[];
  socialProfiles?: Record<string, string>;
  attributes?: Record<string, string | boolean>;
  services?: string[];
  paymentMethods?: string[];
  yearEstablished?: number;
  languages?: string[];
}

/**
 * Transform raw business input into a canonical profile with all fields
 * normalized, validated, and hashed.
 */
export function normalizeBusinessProfile(input: RawBusinessInput): CanonicalProfile {
  const profile: CanonicalProfile = {
    businessName: normalizeBusinessName(input.businessName || ""),
    streetAddress: normalizeAddress(input.streetAddress || ""),
    city: (input.city || "").trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    state: normalizeState(input.state || ""),
    postalCode: normalizePostalCode(input.postalCode || ""),
    country: (input.country || "US").toUpperCase().slice(0, 2),
    phone: normalizePhoneE164(input.phone || ""),
    website: normalizeWebsite(input.website || ""),
    email: normalizeEmail(input.email || ""),
    description: (input.description || "").trim().slice(0, 160),
    categories: (input.categories || []).map((c) => c.trim()).filter(Boolean),
    hours: normalizeHours(input.hours || null),
    geo: input.geo || null,
    logoUrl: input.logoUrl || null,
    photoUrls: input.photoUrls || [],
    socialProfiles: input.socialProfiles || {},
    attributes: input.attributes || {},
    services: (input.services || []).map((s) => s.trim()).filter(Boolean),
    paymentMethods: (input.paymentMethods || []).map((p) => p.trim()).filter(Boolean),
    yearEstablished: input.yearEstablished || null,
    languages: (input.languages || []).map((l) => l.trim()).filter(Boolean),
    lastVerifiedAt: null,
    identityHash: "", // computed below
  };

  profile.identityHash = computeIdentityHash(profile);
  return profile;
}

function normalizePostalCode(zip: string): string {
  // Keep only digits and dash
  const cleaned = zip.replace(/[^0-9\-]/g, "").trim();
  // 5-digit only is fine; ZIP+4 is 5-4
  return cleaned.slice(0, 10);
}

function normalizeEmail(email: string): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function computeIdentityHash(profile: CanonicalProfile): string {
  // Hash key fields that define identity (not photos, social, etc.)
  const identityString = JSON.stringify({
    n: profile.businessName,
    a: profile.streetAddress,
    c: profile.city,
    s: profile.state,
    z: profile.postalCode,
    p: profile.phone,
    w: profile.website,
    cat: profile.categories,
  });
  return createHash("sha256").update(identityString).digest("hex").slice(0, 16);
}

// ─── Validation ────────────────────────────────────────────────────────

/**
 * Validate a canonical profile. Returns issues (errors + warnings).
 */
export function validateCanonicalProfile(profile: CanonicalProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Required fields
  if (!profile.businessName) issues.push({ field: "businessName", severity: "error", message: "Business name is required", suggestion: "Enter the legal/DBA name" });
  if (!profile.streetAddress) issues.push({ field: "streetAddress", severity: "error", message: "Street address is required for local SEO", suggestion: "Enter full street address" });
  if (!profile.city) issues.push({ field: "city", severity: "error", message: "City is required", suggestion: null });
  if (!profile.state || profile.state.length !== 2) issues.push({ field: "state", severity: "error", message: "Valid 2-letter state code required", suggestion: "e.g. CA, TX, NY" });
  if (!profile.postalCode || profile.postalCode.length < 5) issues.push({ field: "postalCode", severity: "error", message: "Valid 5-digit ZIP required", suggestion: null });
  if (!profile.phone) issues.push({ field: "phone", severity: "error", message: "Phone number is required for NAP consistency", suggestion: "Use format: (555) 123-4567" });

  // Warnings
  if (!profile.website) issues.push({ field: "website", severity: "warning", message: "Website URL is strongly recommended", suggestion: null });
  if (!profile.description) issues.push({ field: "description", severity: "warning", message: "Business description helps with relevance signals", suggestion: "Write a 150-char description" });
  if (!profile.categories.length) issues.push({ field: "categories", severity: "warning", message: "At least one category is recommended", suggestion: "Add primary GBP category" });
  if (Object.keys(profile.hours).length === 0) issues.push({ field: "hours", severity: "warning", message: "Operating hours improve local search signals", suggestion: null });
  if (!profile.geo) issues.push({ field: "geo", severity: "warning", message: "Geographic coordinates help with proximity ranking", suggestion: "Geocode your address" });

  // Phone format
  if (profile.phone && !profile.phone.startsWith("+")) {
    issues.push({ field: "phone", severity: "warning", message: "Phone should be E.164 format (+1...)", suggestion: `Should be: ${normalizePhoneE164(profile.phone)}` });
  }

  return issues;
}

// ─── Confidence Scoring ────────────────────────────────────────────────

export interface ConfidenceInput {
  field: string;
  value: string | string[] | null;
  sources: string[]; // e.g. ["gbp", "user_input", "yelp"]
  lastVerified: string | null;
  hasValidation: boolean; // was this field validated (e.g. phone format check)?
}

/**
 * Compute overall identity confidence from per-field data.
 */
export function computeIdentityConfidence(fieldInputs: ConfidenceInput[]): IdentityConfidence {
  const FIELD_WEIGHTS: Record<string, number> = {
    businessName: 25,
    streetAddress: 15,
    city: 5,
    state: 5,
    postalCode: 5,
    phone: 20,
    website: 10,
    categories: 5,
    hours: 5,
    description: 3,
    geo: 2,
  };

  const fields: Record<string, FieldConfidence> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const input of fieldInputs) {
    const weight = FIELD_WEIGHTS[input.field] ?? 1;
    const fc = scoreFieldConfidence(input);
    fields[input.field] = fc;
    weightedSum += fc.score * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const level: ConfidenceLevel =
    overallScore >= 85 ? "verified" :
    overallScore >= 70 ? "high" :
    overallScore >= 50 ? "medium" :
    overallScore >= 25 ? "low" : "unverified";

  const topGaps = Object.entries(fields)
    .filter(([_, fc]) => fc.score < 70)
    .sort(([fa, _a], [fb, _b]) => (FIELD_WEIGHTS[fa] ?? 1) - (FIELD_WEIGHTS[fb] ?? 1))
    .slice(0, 3)
    .map(([field]) => field);

  const sourceSet = new Set(fieldInputs.flatMap((i) => i.sources));

  return {
    overallScore,
    level,
    fields,
    topGaps,
    sourceCount: sourceSet.size,
    computedAt: new Date().toISOString(),
  };
}

function scoreFieldConfidence(input: ConfidenceInput): FieldConfidence {
  let score = 0;

  // Has a value
  if (input.value !== null && input.value !== "" && !(Array.isArray(input.value) && input.value.length === 0)) {
    score += 30;
  }

  // Source quality
  const sourceScore: Record<string, number> = {
    gbp: 40, // Google Business Profile = gold standard
    user_input: 25,
    website: 20,
    yelp: 15,
    foursquare: 15,
    scan: 10,
    scraped: 5,
  };
  for (const src of input.sources) {
    score += sourceScore[src] ?? 10;
  }
  score = Math.min(score, 80); // cap before recency/validation bonuses

  // Validation bonus
  if (input.hasValidation) score += 10;

  // Recency bonus
  if (input.lastVerified) {
    const daysSince = (Date.now() - new Date(input.lastVerified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 10;
    else if (daysSince <= 30) score += 5;
  }

  score = Math.min(100, Math.max(0, score));

  const level: ConfidenceLevel =
    score >= 85 ? "verified" :
    score >= 70 ? "high" :
    score >= 50 ? "medium" :
    score >= 25 ? "low" : "unverified";

  const issues: string[] = [];
  if (!input.value) issues.push("No value provided");
  if (input.sources.length === 0) issues.push("No sources");
  if (input.sources.includes("scraped") && !input.sources.includes("gbp")) issues.push("Not verified against GBP");
  if (!input.lastVerified) issues.push("Never verified");

  return { score, level, sources: input.sources, lastVerified: input.lastVerified, issues };
}

// ─── Diff Engine (Citation Truth Layer) ────────────────────────────────

/**
 * Diff canonical profile vs a found listing. Returns per-field comparison.
 */
export function diffCanonicalVsFound(
  canonical: CanonicalProfile,
  found: Record<string, any>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  // Name
  diffs.push(diffField("businessName", canonical.businessName, found.name ?? found.businessName, (a, b) => {
    const na = a.toLowerCase().trim();
    const nb = b.toLowerCase().trim();
    if (na === nb) return "match";
    if (na.includes(nb) || nb.includes(na)) return "partial";
    return "mismatch";
  }, "critical"));

  // Address
  diffs.push(diffField("streetAddress", canonical.streetAddress, found.address ?? found.streetAddress, (a, b) => {
    const na = normalizeAddress(String(a));
    const nb = normalizeAddress(String(b));
    if (!na || !nb) return "missing";
    if (na === nb) return "match";
    if (na.includes(nb) || nb.includes(na)) return "partial";
    return "mismatch";
  }, "critical"));

  // Phone
  diffs.push(diffField("phone", canonical.phone, found.phone, (a, b) => {
    const na = normalizePhoneCompare(String(a));
    const nb = normalizePhoneCompare(String(b));
    if (!na || !nb) return "missing";
    if (na === nb) return "match";
    // Last 7 digits match = likely same number with area code diff
    if (na.slice(-7) === nb.slice(-7)) return "partial";
    return "mismatch";
  }, "critical"));

  // City
  diffs.push(diffField("city", canonical.city, found.city, (a, b) => {
    const na = String(a).toLowerCase().trim();
    const nb = String(b).toLowerCase().trim();
    if (na === nb) return "match";
    return "mismatch";
  }, "high"));

  // State
  diffs.push(diffField("state", canonical.state, found.state, (a, b) => {
    const na = normalizeState(String(a));
    const nb = normalizeState(String(b));
    if (na === nb) return "match";
    return "mismatch";
  }, "high"));

  // Website
  diffs.push(diffField("website", canonical.website, found.website, (a, b) => {
    const na = normalizeWebsite(String(a));
    const nb = normalizeWebsite(String(b));
    if (!na || !nb) return "missing";
    if (na === nb) return "match";
    // Domain match (ignore protocol/path differences)
    try {
      const da = new URL(na).hostname;
      const db = new URL(nb).hostname;
      if (da === db) return "match";
    } catch {}
    return "mismatch";
  }, "medium"));

  // Categories
  diffs.push(diffField("categories", canonical.categories, found.categories ?? found.types, (a, b) => {
    const arrA = Array.isArray(a) ? a.map((c: string) => c.toLowerCase()) : [];
    const arrB = Array.isArray(b) ? b.map((c: string) => c.toLowerCase()) : [];
    if (arrA.length === 0 || arrB.length === 0) return "missing";
    const matched = arrA.filter((c: string) => arrB.some((f: string) => f.includes(c) || c.includes(f)));
    const rate = matched.length / arrA.length;
    if (rate >= 0.8) return "match";
    if (rate >= 0.5) return "partial";
    return "mismatch";
  }, "medium"));

  return diffs;
}

function diffField(
  field: string,
  canonical: any,
  found: any,
  compare: (a: any, b: any) => DiffStatus,
  severity: "critical" | "high" | "medium" | "low"
): FieldDiff {
  if (found === null || found === undefined || found === "") {
    return {
      field,
      status: "missing",
      canonical: typeof canonical === "object" ? canonical : String(canonical),
      found: null,
      normalizedCanonical: String(canonical).toLowerCase(),
      normalizedFound: null,
      severity,
      impact: SEVERITY_IMPACT[field] || "Reduces local SEO consistency",
    };
  }

  const status = compare(canonical, found);
  return {
    field,
    status,
    canonical: typeof canonical === "object" ? canonical : String(canonical),
    found: typeof found === "object" ? found : String(found),
    normalizedCanonical: String(canonical).toLowerCase(),
    normalizedFound: String(found).toLowerCase(),
    severity: status === "match" ? "low" : severity,
    impact: SEVERITY_IMPACT[field] || "Reduces local SEO consistency",
  };
}

const SEVERITY_IMPACT: Record<string, string> = {
  businessName: "Inconsistent name dilutes brand entity signals and confuses Google's Knowledge Graph",
  streetAddress: "Address mismatch is a critical NAP error — Google may suppress or split your listing",
  phone: "Phone mismatch breaks NAP consistency, a top-3 local ranking factor",
  city: "City mismatch can cause your listing to appear in wrong local search results",
  state: "State mismatch confuses geographic relevance signals",
  website: "Missing/wrong website breaks backlink attribution and trust signals",
  categories: "Category mismatch reduces visibility for relevant search queries",
};

// ─── Citation Impact Scoring ──────────────────────────────────────────

/**
 * Score how much a specific field inconsistency hurts local SEO.
 */
export function scoreCitationImpact(diff: FieldDiff): CitationImpactScore {
  // Base impact by field and severity
  const FIELD_IMPACT: Record<string, number> = {
    businessName: 35,
    streetAddress: 30,
    phone: 30,
    city: 15,
    state: 10,
    website: 12,
    categories: 8,
  };

  const baseImpact = FIELD_IMPACT[diff.field] ?? 5;

  // Adjust by diff status
  const statusMultiplier: Record<DiffStatus, number> = {
    match: 0,
    mismatch: 1.0,
    partial: 0.5,
    missing: 0.8,
    not_checked: 0,
  };

  const rawImpact = baseImpact * statusMultiplier[diff.status];
  const impactScore = Math.round(Math.min(100, rawImpact * 2.5)); // scale to 0-100

  // Dollar cost estimate (rough: ~$50/month per 10 impact points for local businesses)
  const estimatedMonthlyCost = Math.round(impactScore * 5);

  // Rank positions estimate
  const estimatedRankPositions = Math.round(impactScore / 20);

  // Affected ranking factors
  const affectedFactors: string[] = [];
  if (["businessName", "streetAddress", "phone"].includes(diff.field)) {
    affectedFactors.push("NAP Consistency", "Local Pack Ranking");
  }
  if (diff.field === "categories") affectedFactors.push("Relevance Signal", "Category Filtering");
  if (diff.field === "website") affectedFactors.push("Trust Signal", "Backlink Attribution");
  if (["city", "state"].includes(diff.field)) affectedFactors.push("Proximity Ranking", "Geographic Relevance");

  // Urgency
  const urgency = impactScore >= 60 ? "immediate" :
    impactScore >= 35 ? "this_week" :
    impactScore >= 15 ? "this_month" : "low_priority";

  return {
    impactScore,
    estimatedMonthlyCost,
    estimatedRankPositions,
    affectedFactors,
    urgency,
    autoFixable: diff.field === "website" || diff.field === "phone",
    estimatedFixMinutes: diff.field === "phone" ? 5 : diff.field === "businessName" ? 10 : 15,
  };
}

// ─── Action Prioritization ────────────────────────────────────────────

/**
 * Given a set of diffs (e.g. from one directory), produce prioritized fix actions.
 */
export function prioritizeFixActions(
  diffs: FieldDiff[],
  directoryName: string,
  directoryTier: string
): PrioritizedAction[] {
  return diffs
    .filter((d) => d.status !== "match" && d.status !== "not_checked")
    .map((diff) => {
      const impact = scoreCitationImpact(diff);
      return {
        field: diff.field,
        directory: directoryName,
        directoryTier,
        impact,
        currentCanonical: diff.canonical,
        currentFound: diff.found,
        fixInstruction: `Update ${diff.field} on ${directoryName} to: ${diff.canonical}`,
        fixUrl: null,
      };
    })
    .sort((a, b) => b.impact.impactScore - a.impact.impactScore);
}

/**
 * Merge and prioritize actions across multiple directories.
 */
export function prioritizeAllActions(
  multiDirDiffs: Array<{ directory: string; tier: string; diffs: FieldDiff[] }>
): PrioritizedAction[] {
  const allActions = multiDirDiffs.flatMap(({ directory, tier, diffs }) =>
    prioritizeFixActions(diffs, directory, tier)
  );

  // Deduplicate by field+directory
  const seen = new Set<string>();
  const unique = allActions.filter((a) => {
    const key = `${a.field}:${a.directory}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by impact score descending
  return unique.sort((a, b) => b.impact.impactScore - a.impact.impactScore);
}
