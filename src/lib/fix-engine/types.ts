// ============================================================
// Geothority Fix Engine — Types
// ============================================================

/** How much automation the user wants. */
export type FixExecutionMode = "AUTO" | "ASSISTED" | "GUIDED";

export type FixStepStatus =
  | "pending"
  | "skipped"
  | "running"
  | "completed"
  | "failed"
  | "needs_input";

export interface FixStep {
  /** Unique id within the execution. */
  id: string;
  /** Maps to FixItem.type from the scan fix package. */
  fixType: string;
  title: string;
  impact: "high" | "medium" | "low";
  /** Whether this step can run automatically (no user input needed). */
  autoRunnable: boolean;
  status: FixStepStatus;
  /** Generated fix artifact from the fix package, if any. */
  content?: string;
  instructions?: string;
  group?: string;
  /** For ASSISTED/GUIDED: the user action required before this step can complete. */
  userAction?: string;
  /** Result message after completion or failure. */
  resultMessage?: string;
  artifactId?: string;
  artifactType?: string;
  /** Timestamps. */
  startedAt?: string;
  completedAt?: string;
  /** Post-fix verification. */
  verification?: FixVerificationResult;
}

export interface FixExecutionPlan {
  id: string;
  userId?: string;
  scanId: string;
  mode: FixExecutionMode;
  steps: FixStep[];
  createdAt: string;
  updatedAt?: string;
  /** Overall progress 0-100. */
  progress: number;
  /** Summary counts. */
  total: number;
  completed: number;
  failed: number;
  needsInput: number;
  status: "planning" | "executing" | "paused" | "completed" | "failed";
  /** Pre-fix layer scores captured from the original scan at plan creation. */
  layerScoresBefore?: Record<string, number>;
  /** Verification state for the overall plan. */
  verification?: PlanVerification;
}

export interface PlanVerification {
  status: "pending" | "running" | "completed" | "failed";
  /** Layer scores captured after re-scan or user-supplied. */
  layerScoresAfter?: Record<string, number>;
  /** Overall score before fixes. */
  scoreBefore?: number;
  /** Overall score after fixes. */
  scoreAfter?: number;
  /** Per-step verification results. */
  stepResults?: FixVerificationResult[];
  /** When verification was triggered. */
  startedAt?: string;
  /** When verification completed. */
  completedAt?: string;
  /** How many steps passed verification. */
  passedCount?: number;
  /** How many steps failed verification. */
  failedCount?: number;
}

export interface FixVerificationResult {
  /** The fix type that was verified. */
  fixType: string;
  /** Did the verification pass? */
  passed: boolean;
  /** Human-readable message. */
  message: string;
  /** Score delta if re-scanning (null if not re-scanned). */
  scoreBefore?: number;
  scoreAfter?: number;
  /** When verification ran. */
  verifiedAt: string;
}
