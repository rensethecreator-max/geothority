// ============================================================
// Geothority Fix Engine — Executor
// Handles AUTO/ASSISTED/GUIDED mode execution, progress tracking,
// and post-fix verification.
// ============================================================

import {
  type FixExecutionMode,
  type FixExecutionPlan,
  type FixStep,
  type FixStepStatus,
  type FixVerificationResult,
} from "./types";

// ── In-memory execution state (per process) ─────────────────────
// In production this would be persisted to Supabase; for now we
// keep a Map keyed by execution plan id.

const executions = new Map<string, FixExecutionPlan>();

export function getExecution(planId: string): FixExecutionPlan | undefined {
  return executions.get(planId);
}

// ── Step auto-runnability rules ──────────────────────────────────

const AUTO_RUNNABLE_TYPES = new Set([
  "listing_sync",       // always auto (queued to aggregator)
  "meta_tags",          // content generated, user just copies
  "schema",             // content generated, user just copies
]);

/**
 * Determine whether a fix type can run automatically based on mode.
 * AUTO  → everything auto-runnable executes immediately
 * ASSISTED → auto-runnable steps execute; others need one confirmation
 * GUIDED → every step requires explicit user action
 */
function canAutoRun(fixType: string, mode: FixExecutionMode): boolean {
  if (mode === "GUIDED") return false;
  if (mode === "AUTO") return true;
  // ASSISTED
  return AUTO_RUNNABLE_TYPES.has(fixType);
}

// ── Build Execution Plan ────────────────────────────────────────

interface FixItemInput {
  type: string;
  title: string;
  impact: "high" | "medium" | "low";
  autoApplied: boolean;
}

let _planCounter = 0;

export function buildExecutionPlan(
  scanId: string,
  mode: FixExecutionMode,
  fixes: FixItemInput[]
): FixExecutionPlan {
  _planCounter++;
  const planId = `plan_${Date.now()}_${_planCounter}`;

  const steps: FixStep[] = fixes.map((fix, i) => {
    const auto = canAutoRun(fix.type, mode) || fix.autoApplied;
    let status: FixStepStatus = "pending";
    let userAction: string | undefined;

    if (fix.autoApplied) {
      status = "pending"; // will auto-execute
    } else if (!auto) {
      status = "needs_input";
      userAction = getUserActionHint(fix.type);
    }

    return {
      id: `step_${planId}_${i}`,
      fixType: fix.type,
      title: fix.title,
      impact: fix.impact,
      autoRunnable: auto,
      status,
      userAction,
    };
  });

  const plan: FixExecutionPlan = {
    id: planId,
    scanId,
    mode,
    steps,
    createdAt: new Date().toISOString(),
    progress: 0,
    total: steps.length,
    completed: 0,
    failed: 0,
    needsInput: steps.filter((s) => s.status === "needs_input").length,
    status: "planning",
  };

  executions.set(planId, plan);
  return plan;
}

function getUserActionHint(fixType: string): string {
  switch (fixType) {
    case "schema":
      return "Copy the generated JSON-LD and add it to your website's <head> section.";
    case "faq":
      return "Create a /faq page on your site and paste the generated HTML content.";
    case "about":
      return "Replace your About page content with the generated copy.";
    case "landing_page":
      return "Create a new city-specific page and paste the generated content.";
    case "meta_tags":
      return "Replace your current <title> and <meta name='description'> tags.";
    case "ai_optimization":
      return "Follow the 4-step AI Optimization checklist to add schema, content, and sameAs links.";
    default:
      return "Review the generated content and apply it to your website.";
  }
}

// ── Execute Plan ─────────────────────────────────────────────────

/**
 * Execute a fix plan. In AUTO mode all auto-runnable steps fire
// immediately; in ASSISTED/GUIDED the user drives each step.
 * Returns the updated plan.
 */
export async function executeFixPackage(
  planId: string
): Promise<FixExecutionPlan> {
  const plan = executions.get(planId);
  if (!plan) throw new Error(`Execution plan ${planId} not found`);

  plan.status = "executing";

  for (const step of plan.steps) {
    // Skip steps that need user input
    if (step.status === "needs_input") continue;
    if (step.status === "completed" || step.status === "skipped") continue;

    // Auto-execute
    step.status = "running";
    step.startedAt = new Date().toISOString();

    try {
      await executeStep(step);
      step.status = "completed";
      step.completedAt = new Date().toISOString();
      plan.completed++;
    } catch (err) {
      step.status = "failed";
      step.resultMessage = err instanceof Error ? err.message : "Unknown error";
      plan.failed++;
    }

    // Update progress
    const resolved = plan.completed + plan.failed;
    plan.progress = Math.round((resolved / plan.total) * 100);
  }

  // Check if any steps still need input
  if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  } else if (plan.failed > 0 && plan.completed < plan.total) {
    plan.status = plan.completed > 0 ? "completed" : "failed";
  } else {
    plan.status = "completed";
  }

  return plan;
}

/**
 * Execute a single step. For now this is a stub that simulates
 * work; in production it would call the actual fix handlers
 * (schema insertion, listing sync, etc.).
 */
async function executeStep(step: FixStep): Promise<void> {
  // Simulate async work for auto-runnable steps
  switch (step.fixType) {
    case "listing_sync":
      step.resultMessage = "Listings queued for sync across 50+ directories.";
      break;
    case "schema":
      step.resultMessage = "Schema markup generated. Copy and add to your <head>.";
      break;
    case "meta_tags":
      step.resultMessage = "Meta tags generated. Copy and replace existing tags.";
      break;
    case "faq":
      step.resultMessage = "FAQ content generated. Create a /faq page and paste.";
      break;
    case "about":
      step.resultMessage = "About page copy generated. Replace your About page content.";
      break;
    case "landing_page":
      step.resultMessage = "Landing page content generated. Create the page and paste.";
      break;
    case "ai_optimization":
      step.resultMessage = "AI optimization package generated. Follow the 4-step checklist.";
      break;
    default:
      step.resultMessage = "Fix content generated.";
  }

  // Small delay to represent actual work
  await new Promise((r) => setTimeout(r, 200));
}

// ── User-driven step completion ─────────────────────────────────

/**
 * Mark a step as completed by the user (ASSISTED/GUIDED flow).
 */
export function completeStep(planId: string, stepId: string): FixExecutionPlan {
  const plan = executions.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);

  if (step.status === "needs_input" || step.status === "pending") {
    step.status = "completed";
    step.completedAt = new Date().toISOString();
    plan.completed++;
    plan.needsInput = plan.steps.filter((s) => s.status === "needs_input").length;
  }

  // Recalculate progress
  const resolved = plan.completed + plan.failed;
  plan.progress = Math.round((resolved / plan.total) * 100);

  // Check overall status
  if (plan.steps.every((s) => s.status === "completed" || s.status === "skipped" || s.status === "failed")) {
    plan.status = plan.failed > 0 && plan.completed === 0 ? "failed" : "completed";
  } else if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  }

  return plan;
}

/**
 * Skip a step the user doesn't want to apply.
 */
export function skipStep(planId: string, stepId: string): FixExecutionPlan {
  const plan = executions.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);

  step.status = "skipped";
  step.completedAt = new Date().toISOString();
  plan.needsInput = plan.steps.filter((s) => s.status === "needs_input").length;

  const resolved = plan.steps.filter((s) => s.status === "completed" || s.status === "skipped" || s.status === "failed").length;
  plan.progress = Math.round((resolved / plan.total) * 100);

  if (plan.steps.every((s) => s.status === "completed" || s.status === "skipped" || s.status === "failed")) {
    plan.status = plan.failed > 0 && plan.completed === 0 ? "failed" : "completed";
  } else if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  }

  return plan;
}

// ── Get Status ──────────────────────────────────────────────────

export function getFixExecutionStatus(planId: string): FixExecutionPlan | null {
  return executions.get(planId) ?? null;
}

// ── Post-Fix Verification ───────────────────────────────────────

/**
 * Run a lightweight post-fix verification for a given step.
 * In production this would re-scan the specific layer or check
 * the live site. For now it provides a structured result.
 */
export function verifyFix(
  planId: string,
  stepId: string,
  scoreBefore: number,
  scoreAfter: number
): FixVerificationResult {
  const plan = executions.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);

  const improved = scoreAfter > scoreBefore;
  const result: FixVerificationResult = {
    fixType: step.fixType,
    passed: improved,
    message: improved
      ? `Score improved from ${scoreBefore} to ${scoreAfter} (+${scoreAfter - scoreBefore}). Fix verified!`
      : `Score unchanged (${scoreBefore} → ${scoreAfter}). The fix may not have been applied correctly.`,
    scoreBefore,
    scoreAfter,
    verifiedAt: new Date().toISOString(),
  };

  step.verification = result;
  return result;
}

/**
 * Bulk-verify all completed steps in a plan.
 */
export function verifyAllFixes(
  planId: string,
  layerScoresBefore: Record<string, number>,
  layerScoresAfter: Record<string, number>
): FixVerificationResult[] {
  const plan = executions.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const layerMap: Record<string, string> = {
    schema: "layer1",
    meta_tags: "layer1",
    faq: "layer2",
    about: "layer2",
    landing_page: "layer2",
    ai_optimization: "layer5",
    listing_sync: "layer3",
  };

  const results: FixVerificationResult[] = [];

  for (const step of plan.steps) {
    if (step.status !== "completed") continue;

    const layer = layerMap[step.fixType] ?? "layer1";
    const before = layerScoresBefore[layer] ?? 0;
    const after = layerScoresAfter[layer] ?? 0;

    const result = verifyFix(planId, step.id, before, after);
    results.push(result);
  }

  return results;
}
