// Auto-Execution Engine — Phase 7 Enhancement
// Executes auto_executable actions (content generation, schema updates, etc.)
// without user intervention, based on user settings.

import {
  ExpansionTarget,
  SuggestedAction,
  MeasurableResult,
} from "./types";

export interface AutoExecResult {
  success: boolean;
  actionType: string;
  targetId: string;
  message: string;
  result?: MeasurableResult;
  error?: string;
}

export interface AutoExecConfig {
  enabled: boolean;
  dryRun: boolean; // if true, logs what would happen without executing
  maxConcurrent: number;
  allowedTypes: SuggestedAction["type"][];
}

const DEFAULT_CONFIG: AutoExecConfig = {
  enabled: false, // off by default — user must opt in
  dryRun: true,
  maxConcurrent: 3,
  allowedTypes: ["add_schema_markup", "build_local_citations", "create_city_page", "create_service_page"],
};

/**
 * Process all auto-executable actions for a set of targets.
 * Returns results for each action attempted.
 */
export async function processAutoExecutableActions(
  targets: ExpansionTarget[],
  supabase: any,
  config: Partial<AutoExecConfig> = {}
): Promise<AutoExecResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.enabled) return [];

  const results: AutoExecResult[] = [];
  let concurrent = 0;

  for (const target of targets) {
    if (target.status === "completed" || target.status === "deprioritized") continue;

    for (const action of target.suggested_actions) {
      if (!action.auto_executable) continue;
      if (!cfg.allowedTypes.includes(action.type)) continue;
      if (concurrent >= cfg.maxConcurrent) break;

      concurrent++;
      const result = await executeAction(target, action, supabase, cfg.dryRun);
      results.push(result);
    }
  }

  return results;
}

async function executeAction(
  target: ExpansionTarget,
  action: SuggestedAction,
  supabase: any,
  dryRun: boolean
): Promise<AutoExecResult> {
  const baseResult = {
    actionType: action.type,
    targetId: target.id,
  };

  if (dryRun) {
    return {
      ...baseResult,
      success: true,
      message: `[DRY RUN] Would execute: ${action.title} for ${target.name}`,
    };
  }

  try {
    switch (action.type) {
      case "add_schema_markup":
        return await executeSchemaUpdate(target, action, supabase, baseResult);
      case "create_city_page":
        return await executeCityPageCreation(target, action, supabase, baseResult);
      case "create_service_page":
        return await executeServicePageCreation(target, action, supabase, baseResult);
      case "build_local_citations":
        return await executeCitationBuild(target, action, supabase, baseResult);
      default:
        return { ...baseResult, success: false, message: `Auto-exec not implemented for ${action.type}`, error: "NOT_IMPLEMENTED" };
    }
  } catch (e) {
    return { ...baseResult, success: false, message: `Failed: ${action.title}`, error: (e as Error).message };
  }
}

async function executeSchemaUpdate(
  target: ExpansionTarget,
  action: SuggestedAction,
  supabase: any,
  baseResult: { actionType: string; targetId: string }
): Promise<AutoExecResult> {
  // Queue schema markup addition as a generated_content task
  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    content_type: "schema_markup",
    slug: `schema-${target.slug}`,
    title: action.title,
    body: JSON.stringify({
      type: "ServiceArea",
      areaServed: target.name,
      areaServedState: target.state,
      targetId: target.id,
    }),
    status: "draft",
    meta: { target_type: target.type, auto_generated: true },
  });

  if (error) throw error;

  return {
    ...baseResult,
    success: true,
    message: `Schema markup draft created for ${target.name}`,
    result: { metric: "schema_drafts_created", before: null, after: 1, measured_at: new Date().toISOString() },
  };
}

async function executeCityPageCreation(
  target: ExpansionTarget,
  action: SuggestedAction,
  supabase: any,
  baseResult: { actionType: string; targetId: string }
): Promise<AutoExecResult> {
  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    content_type: "city_page",
    slug: target.slug,
    title: action.title,
    body: JSON.stringify({
      city: target.name,
      state: target.state,
      rationale: target.rationale,
      targetId: target.id,
      signals: target.signals.map((s) => ({ type: s.type, value: s.value })),
    }),
    status: "draft",
    meta: { target_type: "city", impact_score: target.impact_score, auto_generated: true },
  });

  if (error) throw error;

  return {
    ...baseResult,
    success: true,
    message: `City page draft created for ${target.name}`,
    result: { metric: "city_pages_created", before: null, after: 1, measured_at: new Date().toISOString() },
  };
}

async function executeServicePageCreation(
  target: ExpansionTarget,
  action: SuggestedAction,
  supabase: any,
  baseResult: { actionType: string; targetId: string }
): Promise<AutoExecResult> {
  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    content_type: "service_page",
    slug: target.slug,
    title: action.title,
    body: JSON.stringify({
      service: target.name,
      rationale: target.rationale,
      targetId: target.id,
      signals: target.signals.map((s) => ({ type: s.type, value: s.value })),
    }),
    status: "draft",
    meta: { target_type: "service", impact_score: target.impact_score, auto_generated: true },
  });

  if (error) throw error;

  return {
    ...baseResult,
    success: true,
    message: `Service page draft created for ${target.name}`,
    result: { metric: "service_pages_created", before: null, after: 1, measured_at: new Date().toISOString() },
  };
}

async function executeCitationBuild(
  target: ExpansionTarget,
  action: SuggestedAction,
  supabase: any,
  baseResult: { actionType: string; targetId: string }
): Promise<AutoExecResult> {
  // Queue citation consistency check and NAP data preparation
  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    content_type: "citation_task",
    slug: `citation-${target.slug}`,
    title: action.title,
    body: JSON.stringify({
      directory: target.name,
      targetId: target.id,
      task: "verify_nap_consistency",
    }),
    status: "draft",
    meta: { target_type: "niche_directory", auto_generated: true },
  });

  if (error) throw error;

  return {
    ...baseResult,
    success: true,
    message: `Citation task queued for ${target.name}`,
    result: { metric: "citation_tasks_created", before: null, after: 1, measured_at: new Date().toISOString() },
  };
}
