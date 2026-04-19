/**
 * Deep Citation & Local Link Authority Module — Public API
 * Geothority
 */

export type { CitationCheckConfig, CitationMatchDetail, CitationIssue, CitationHealthReport, FieldMatchResult, BusinessHours, LinkOpportunity, LinkOpportunityType, LinkAuthoritySummary, OutreachTemplate, DeepCitationAndLinkReport, ActionPlan, ActionItem, DirectoryTier, } from "./types";

export { DIRECTORY_REGISTRY, getRelevantDirectories, getDirectoryStats } from "./directory-registry";
export { generateCitationHealthReport } from "./citation-analyzer";
export { generateLinkOpportunities, buildLinkAuthoritySummary, enrichOpportunitiesWithAI } from "./link-prospector";
export type { LinkProspectConfig } from "./link-prospector";
export { generateDeepCitationAndLinkReport, formatReportAsMarkdown } from "./report-builder";
export type { DeepCitationReportConfig } from "./report-builder";
