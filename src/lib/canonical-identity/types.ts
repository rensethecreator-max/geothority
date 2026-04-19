/**
 * Canonical Identity Engine — Type Definitions
 */

// ─── Canonical Profile ─────────────────────────────────────────────────

export interface CanonicalProfile {
  /** Normalized business name (title case, trimmed, suffix-cleaned) */
  businessName: string;
  /** Full street address, normalized abbreviations */
  streetAddress: string;
  city: string;
  state: string; // 2-letter code
  postalCode: string; // 5-digit or ZIP+4
  country: string; // ISO 3166-1 alpha-2
  /** E.164 format phone */
  phone: string;
  /** Lowercase, https:// URL */
  website: string;
  email: string | null;
  /** 160-char optimized description */
  description: string;
  categories: string[]; // primary first
  hours: NormalizedHours;
  geo: { lat: number; lng: number } | null;
  logoUrl: string | null;
  photoUrls: string[];
  socialProfiles: Record<string, string>;
  attributes: Record<string, string | boolean>;
  services: string[];
  paymentMethods: string[];
  yearEstablished: number | null;
  languages: string[];

  /** When this canonical record was last verified against ground truth (GBP, etc.) */
  lastVerifiedAt: string | null;
  /** SHA-256 hash of all fields — change detection */
  identityHash: string;
}

export interface NormalizedHours {
  [day: string]: { open: string; close: string } | null; // null = closed, HH:mm 24h
}

// ─── Confidence Scoring ────────────────────────────────────────────────

export type ConfidenceLevel = "verified" | "high" | "medium" | "low" | "unverified";

export interface IdentityConfidence {
  /** Overall confidence 0-100 */
  overallScore: number;
  level: ConfidenceLevel;
  /** Per-field breakdown */
  fields: Record<string, FieldConfidence>;
  /** What would raise confidence the most */
  topGaps: string[];
  /** Sources that contributed to this score */
  sourceCount: number;
  /** When confidence was last computed */
  computedAt: string;
}

export interface FieldConfidence {
  score: number; // 0-100
  level: ConfidenceLevel;
  sources: string[]; // e.g. ["gbp", "yelp", "user_input"]
  lastVerified: string | null;
  issues: string[];
}

// ─── Diff / Truth Layer ────────────────────────────────────────────────

export type DiffStatus = "match" | "mismatch" | "partial" | "missing" | "not_checked";

export interface FieldDiff {
  field: string;
  status: DiffStatus;
  canonical: string | string[] | null;
  found: string | string[] | null;
  normalizedCanonical: string | null;
  normalizedFound: string | null;
  severity: "critical" | "high" | "medium" | "low";
  impact: string; // why this matters
}

// ─── Citation Impact Scoring ──────────────────────────────────────────

export interface CitationImpactScore {
  /** 0-100: how much this inconsistency hurts local SEO */
  impactScore: number;
  /** Dollar-equivalent estimate of lost value per month */
  estimatedMonthlyCost: number;
  /** How many local ranking positions this could cost */
  estimatedRankPositions: number;
  /** Which Google ranking factors this affects */
  affectedFactors: string[];
  /** Urgency: how quickly to fix */
  urgency: "immediate" | "this_week" | "this_month" | "low_priority";
  /** Can this be auto-fixed? */
  autoFixable: boolean;
  /** Estimated minutes to manually fix */
  estimatedFixMinutes: number;
}

export interface PrioritizedAction {
  field: string;
  directory: string;
  directoryTier: string;
  impact: CitationImpactScore;
  currentCanonical: string | string[] | null;
  currentFound: string | string[] | null;
  fixInstruction: string;
  fixUrl: string | null;
}

// ─── Validation ────────────────────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
  suggestion: string | null;
}
