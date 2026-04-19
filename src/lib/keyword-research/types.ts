// ============================================================
// Local Keyword Research & Content Gap Analysis — Types
// Geothority Module
// ============================================================

// ── Keyword Research ─────────────────────────────────────────────

export type KeywordIntent = "transactional" | "informational" | "navigational" | "commercial_investigation";
export type KeywordDifficulty = "easy" | "medium" | "hard" | "very_hard";

export interface LocalKeyword {
  term: string;
  searchVolume: number | null;         // monthly, estimated
  difficulty: KeywordDifficulty | null;
  intent: KeywordIntent;
  cpc: number | null;                   // cost per click, estimated
  localRelevance: number;              // 0-100, how locally-specific
  currentRanking: number | null;        // user's current rank (null = not ranking)
  competitorRankings: CompetitorRanking[];
  serpFeatures: SerpFeature[];
  peopleAlsoAsk: string[];
  relatedTerms: string[];
  priority: number;                     // 0-100 composite score
}

export interface CompetitorRanking {
  domain: string;
  businessName: string;
  position: number;
  url: string | null;
}

export interface SerpFeature {
  type: "local_pack" | "featured_snippet" | "people_also_ask" | "knowledge_panel" | "image_pack" | "video" | "sitelinks";
  present: boolean;
}

// ── Content Gap Analysis ─────────────────────────────────────────

export type ContentGapType = "missing_page" | "thin_content" | "poor_optimization" | "missing_schema" | "missing_faq" | "competitor_advantage";
export type ContentPageType = "service" | "location" | "faq" | "blog" | "about" | "testimonial" | "comparison";

export interface ContentGap {
  id: string;
  gapType: ContentGapType;
  pageType: ContentPageType;
  targetKeyword: string;
  supportingKeywords: string[];
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  competitorExamples: CompetitorContentExample[];
  recommendedActions: string[];
}

export interface CompetitorContentExample {
  domain: string;
  url: string;
  title: string;
  wordCount: number | null;
  hasSchema: boolean;
}

// ── Topic Cluster ────────────────────────────────────────────────

export interface TopicCluster {
  id: string;
  pillarKeyword: string;
  pillarTitle: string;
  clusterKeywords: LocalKeyword[];
  contentGaps: ContentGap[];
  suggestedPages: ContentBrief[];
  totalEstimatedTraffic: number;
  priority: number;
}

// ── Content Brief ────────────────────────────────────────────────

export interface ContentBrief {
  id: string;
  pageType: ContentPageType;
  targetKeyword: string;
  secondaryKeywords: string[];
  title: string;
  metaTitle: string;
  metaDescription: string;
  outline: ContentOutlineSection[];
  wordCountTarget: number;
  internalLinks: string[];
  schemaRecommendation: SchemaRecommendation;
  localOptimization: LocalOptimizationNotes;
  competitorReferences: string[];
  estimatedImpact: "high" | "medium" | "low";
  priority: number;
}

export interface ContentOutlineSection {
  heading: string;
  level: number; // 1-4
  keyPoints: string[];
  targetKeyword?: string;
  wordCountHint: number;
}

export interface SchemaRecommendation {
  types: string[];  // e.g., ["LocalBusiness", "FAQPage", "Service"]
  fields: Record<string, string>;  // suggested field values
}

export interface LocalOptimizationNotes {
  cityMentions: number;          // target count of city name mentions
  neighborhoodReferences: string[];
  landmarkReferences: string[];
  nappConsistency: boolean;      // ensure NAP consistency
  googleEmbedSuggested: boolean;
}

// ── Research Job ─────────────────────────────────────────────────

export type ResearchStatus = "pending" | "running" | "completed" | "failed";

export interface KeywordResearchJob {
  id: string;
  user_id: string;
  scan_id: string | null;
  business_name: string;
  city: string;
  state: string;
  business_type: string;         // e.g., "insurance_agency"
  services: string[];             // e.g., ["auto insurance", "home insurance"]
  competitors: string[];          // competitor domains
  status: ResearchStatus;
  keywords: LocalKeyword[];
  contentGaps: ContentGap[];
  topicClusters: TopicCluster[];
  contentBriefs: ContentBrief[];
  created_at: string;
  completed_at: string | null;
}
