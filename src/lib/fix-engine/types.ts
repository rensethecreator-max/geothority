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
  /** For ASSISTED/GUIDED: the user action required before this step can complete. */
  userAction?: string;
  /** Result message after completion or failure. */
  resultMessage?: string;
  /** Timestamps. */
  startedAt?: string;
  completedAt?: string;
  /** Post-fix verification. */
  verification?: FixVerificationResult;
}

export interface FixExecutionPlan {
  id: string;
  scanId: string;
  mode: FixExecutionMode;
  steps: FixStep[];
  createdAt: string;
  /** Overall progress 0-100. */
  progress: number;
  /** Summary counts. */
  total: number;
  completed: number;
  failed: number;
  needsInput: number;
  status: "planning" | "executing" | "paused" | "completed" | "failed";
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
