/**
 * Canonical Identity Engine — Phase 1-2 Core
 *
 * Normalizes, validates, and scores business identity data to produce
 * a single "canonical truth" record. This is the foundation for:
 * - Citation consistency checking (NAP truth)
 * - Aggregator sync honesty (never push stale/wrong data)
 * - Impact scoring (how much does each inconsistency hurt?)
 *
 * Design: pure functions, no DB coupling, easy to test.
 */

export { normalizeBusinessProfile, validateCanonicalProfile, computeIdentityConfidence, diffCanonicalVsFound, scoreCitationImpact, prioritizeFixActions } from "./normalizer";
export type { ConfidenceInput } from "./normalizer";
export type { CanonicalProfile, IdentityConfidence, FieldConfidence, FieldDiff, CitationImpactScore, PrioritizedAction, ValidationIssue } from "./types";
