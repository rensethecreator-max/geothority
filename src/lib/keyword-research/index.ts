// ============================================================
// Local Keyword Research & Content Gap Analysis — Public API
// Geothority Module
// ============================================================

export type { KeywordResearchJob, ResearchStatus } from "./types";
export type {
  LocalKeyword,
  ContentGap,
  TopicCluster,
  ContentBrief,
  ContentOutlineSection,
  SchemaRecommendation,
  LocalOptimizationNotes,
  KeywordIntent,
  KeywordDifficulty,
  ContentGapType,
  ContentPageType,
  SerpFeature,
  CompetitorRanking,
  CompetitorContentExample,
} from "./types";

export { researchLocalKeywords } from "./keyword-engine";
export type { KeywordResearchInput } from "./keyword-engine";

export { analyzeContentGaps } from "./gap-analyzer";
export type { GapAnalysisInput, ExistingPage } from "./gap-analyzer";

// ── Orchestrator: Full Research Pipeline ──────────────────────────

import { researchLocalKeywords } from "./keyword-engine";
import type { KeywordResearchInput } from "./keyword-engine";
import { analyzeContentGaps } from "./gap-analyzer";
import type { GapAnalysisInput, ExistingPage } from "./gap-analyzer";
import type { KeywordResearchJob, LocalKeyword, ContentGap, TopicCluster, ContentBrief } from "./types";

export interface FullResearchInput {
  userId: string;
  scanId: string | null;
  businessName: string;
  city: string;
  state: string;
  businessType: string;
  services: string[];
  competitorDomains: string[];
  websiteUrl: string | null;
  existingPages: ExistingPage[];
}

/**
 * Run the complete keyword research + content gap analysis pipeline.
 * Returns a KeywordResearchJob with all results populated.
 */
export async function runFullResearch(
  input: FullResearchInput
): Promise<KeywordResearchJob> {
  const startTime = Date.now();

  const job: KeywordResearchJob = {
    id: `kr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: input.userId,
    scan_id: input.scanId,
    business_name: input.businessName,
    city: input.city,
    state: input.state,
    business_type: input.businessType,
    services: input.services,
    competitors: input.competitorDomains,
    status: "running",
    keywords: [],
    contentGaps: [],
    topicClusters: [],
    contentBriefs: [],
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  try {
    // Phase 1: Keyword Research
    const keywordInput: KeywordResearchInput = {
      businessName: input.businessName,
      city: input.city,
      state: input.state,
      businessType: input.businessType,
      services: input.services,
      competitorDomains: input.competitorDomains,
    };

    const keywords = await researchLocalKeywords(keywordInput);
    job.keywords = keywords;

    // Phase 2: Content Gap Analysis
    const gapInput: GapAnalysisInput = {
      businessName: input.businessName,
      city: input.city,
      state: input.state,
      businessType: input.businessType,
      services: input.services,
      websiteUrl: input.websiteUrl,
      existingPages: input.existingPages,
      keywords,
      competitorDomains: input.competitorDomains,
    };

    const { gaps, clusters, briefs } = await analyzeContentGaps(gapInput);
    job.contentGaps = gaps;
    job.topicClusters = clusters;
    job.contentBriefs = briefs;
    job.status = "completed";
  } catch (error) {
    job.status = "failed";
    console.error("Full research pipeline failed:", error);
  }

  job.completed_at = new Date().toISOString();
  return job;
}
