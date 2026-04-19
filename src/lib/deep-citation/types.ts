/**
 * Deep Citation & Local Link Authority Module — Type Definitions
 * Geothority
 */

// ─── Citation Types ────────────────────────────────────────────────────────────

export interface CitationCheckConfig {
  businessName: string;
  address: string;
  phone: string;
  city: string;
  state: string;
  zip?: string;
  website?: string;
  categories?: string[];       // e.g. ["Plumber", "Emergency Plumber", "Drain Cleaning"]
  services?: string[];          // e.g. ["Water Heater Installation", "Sewer Repair"]
  hours?: BusinessHours;       // Operating hours for cross-checking
}

export interface BusinessHours {
  [day: string]: { open: string; close: string } | null; // null = closed
}

export type DirectoryTier = "critical" | "major" | "important" | "niche" | "industry";

export interface DirectoryEntry {
  id: string;
  name: string;
  tier: DirectoryTier;
  url: string;
  claimUrl: string;
  fixSteps: string[];
  category: "general" | "mapping" | "review" | "industry" | "social" | "chamber" | "government";
  daRange: [number, number]; // approximate domain authority range
  icon: string;
  apiAvailable: boolean;
  apiEndpoint?: string;
  searchPattern: string; // URL pattern for searching, use {name}, {city}, {state}, {zip}
}

export interface CitationMatchDetail {
  directory: string;
  directoryId: string;
  tier: DirectoryTier;
  category: string;
  url: string;
  listingUrl: string | null;       // direct link to the listing if found
  found: boolean;
  claimed: boolean | null;          // whether the listing is claimed/verified
  checks: {
    name: FieldMatchResult;
    address: FieldMatchResult;
    phone: FieldMatchResult;
    categories: FieldMatchResult;
    services: FieldMatchResult;
    hours: FieldMatchResult;
    website: FieldMatchResult;
  };
  consistencyScore: number;        // 0-100
  issues: CitationIssue[];
  claimUrl: string | null;
  fixSteps: string[];
  icon: string;
  lastChecked: string;
}

export interface FieldMatchResult {
  status: "match" | "mismatch" | "partial" | "missing" | "not_checked";
  expected: string | string[];
  found: string | string[] | null;
  notes: string;
}

export interface CitationIssue {
  severity: "critical" | "high" | "medium" | "low";
  field: string;         // "name", "address", "phone", "categories", "services", "hours", "website"
  issue: string;         // human-readable description
  impact: string;        // why this matters for local SEO
  fixAction: string;    // specific action to take
  fixUrl: string | null; // direct link to fix
  autoFixable: boolean;  // whether we can automate the fix
}

// ─── Citation Health Report ────────────────────────────────────────────────────

export interface CitationHealthReport {
  businessName: string;
  location: string;
  generatedAt: string;
  overall: {
    grade: "A" | "B" | "C" | "D" | "F";
    score: number;             // 0-100
    totalDirectories: number;
    foundIn: number;
    claimedIn: number;
    consistencyScore: number;
    categoryMatchRate: number;
    serviceMatchRate: number;
    hoursAccuracyRate: number;
  };
  tierBreakdown: {
    critical: TierSummary;
    major: TierSummary;
    important: TierSummary;
    niche: TierSummary;
    industry: TierSummary;
  };
  fieldAnalysis: {
    name: FieldSummary;
    address: FieldSummary;
    phone: FieldSummary;
    categories: FieldSummary;
    services: FieldSummary;
    hours: FieldSummary;
    website: FieldSummary;
  };
  criticalIssues: CitationIssue[];
  prioritizedFixes: PrioritizedFix[];
  missingOpportunities: MissingCitation[];
  trends: {
    previousScore: number | null;
    scoreChange: number | null;
    newIssuesCount: number;
    resolvedIssuesCount: number;
  };
}

export interface TierSummary {
  total: number;
  found: number;
  claimed: number;
  avgConsistency: number;
  issues: number;
}

export interface FieldSummary {
  matchRate: number;      // percentage of listings where field matches
  mismatchCount: number;
  missingCount: number;
  commonMismatch: string; // most frequent mismatch pattern
}

export interface PrioritizedFix {
  priority: number;       // 1 = highest
  directory: string;
  tier: DirectoryTier;
  issue: CitationIssue;
  estimatedImpact: "high" | "medium" | "low";
  estimatedTimeMin: number; // minutes to fix
  batchGroup: string;     // e.g. "claim-listings", "fix-phone", "add-categories"
}

export interface MissingCitation {
  directory: string;
  tier: DirectoryTier;
  category: string;
  estimatedDa: number;
  reason: string;         // why this directory matters for this business type
  claimUrl: string;
}

// ─── Local Link Authority Types ─────────────────────────────────────────────────

export type LinkOpportunityType =
  | "local_directory" | "chamber_of_commerce" | "industry_association"
  | "local_blog" | "news_outlet" | "sponsorship" | "scholarship"
  | "local_event" | "resource_page" | "testimonial" | "guest_post"
  | "haro" | "local_university" | "government_resource";

export interface LinkOpportunity {
  id: string;
  type: LinkOpportunityType;
  websiteName: string;
  url: string;
  domain: string;
  estimatedDa: number;
  relevance: number;           // 0-100 relevance to the business
  locality: number;            // 0-100 how local this is
  difficulty: "easy" | "medium" | "hard";
  estimatedTraffic: number;
  contactMethod: "email" | "form" | "social" | "phone";
  contactInfo: string | null;
  suggestedAngle: string;      // personalized pitch angle
  outreachTemplate: OutreachTemplate;
  status: "new" | "contacted" | "responded" | "link_placed" | "rejected" | "ignored";
  priority: number;            // 1-100 calculated priority score
  tags: string[];
  notes: string;
}

export interface OutreachTemplate {
  subject: string;
  body: string;
  tone: "professional" | "friendly" | "casual";
  personalization: string[];   // fields that were personalized
  followUpSubject: string;
  followUpBody: string;
}

export interface LinkAuthoritySummary {
  totalOpportunities: number;
  byType: Record<LinkOpportunityType, number>;
  byDifficulty: { easy: number; medium: number; hard: number };
  avgDa: number;
  avgRelevance: number;
  avgLocality: number;
  topOpportunities: LinkOpportunity[];  // top 10
}

// ─── Combined Report ────────────────────────────────────────────────────────────

export interface DeepCitationAndLinkReport {
  citationHealth: CitationHealthReport;
  linkAuthority: LinkAuthoritySummary;
  combinedScore: number;       // 0-100 composite of citation + link health
  actionPlan: ActionPlan;
}

export interface ActionPlan {
  immediate: ActionItem[];      // fix within 24 hours
  thisWeek: ActionItem[];      // fix within a week
  thisMonth: ActionItem[];     // ongoing improvements
  automated: ActionItem[];     // things we can auto-fix
}

export interface ActionItem {
  title: string;
  description: string;
  type: "citation_fix" | "citation_claim" | "outreach" | "content" | "technical";
  estimatedImpact: number;     // 1-100
  estimatedTimeMin: number;
  actionUrl: string | null;
}
