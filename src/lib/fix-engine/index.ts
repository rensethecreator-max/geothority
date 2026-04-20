// ============================================================
// Geothority Fix Engine — Phase 3-4
// AUTO / ASSISTED / GUIDED execution modes with progress
// tracking and post-fix verification.
// ============================================================

export { executeFixPackage, getFixExecutionStatus, verifyFix, autoVerifyPlan } from "./executor";
export type {
  FixExecutionMode,
  FixExecutionPlan,
  FixStep,
  FixStepStatus,
  FixVerificationResult,
  PlanVerification,
} from "./types";
