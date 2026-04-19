// Smart Expansion Layer — Phase 7 Public API
export { ExpansionManager } from "./expansion-manager";
export type { ExpansionDashboard } from "./expansion-manager";
export { MIGRATION_SQL } from "./expansion-manager";
export {
  computeImpactScore,
  classifyConfidence,
  assignQuadrant,
  buildPriorityMatrix,
  identifyCityTargets,
  identifyServiceTargets,
  identifyDirectoryTargets,
  generateExpansionRecommendation,
} from "./expansion-engine";
export type {
  CityExpansionInput,
  ServiceExpansionInput,
  DirectoryExpansionInput,
} from "./expansion-engine";
export type {
  ExpansionTarget,
  ExpansionSignal,
  SuggestedAction,
  CompetitorPresence,
  ExpansionRecommendation,
  PriorityMatrix,
  ExpansionProgress,
  MeasurableResult,
  EXPANSION_CONFIG,
} from "./types";
export { generateAIRationale } from "./ai-rationale";
export type { RationaleContext } from "./ai-rationale";
export { processAutoExecutableActions } from "./auto-exec";
export type { AutoExecResult, AutoExecConfig } from "./auto-exec";
export { getNearbyCitiesLive } from "./expansion-engine";
