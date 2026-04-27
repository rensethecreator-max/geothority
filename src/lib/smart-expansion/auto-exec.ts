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

  for (const target of targets) {
    if (target.status === "completed" || target.status === "deprioritized") continue;

    for (const action of target.suggested_actions) {
      if (!action.auto_executable) continue;
      if (!cfg.allowedTypes.includes(action.type)) continue;
      if (results.length >= cfg.maxConcurrent) return results;

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
  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "Service",
    areaServed: {
      "@type": "City",
      name: target.name,
      ...(target.state ? { addressRegion: target.state } : {}),
    },
    additionalType: target.type,
    identifier: target.id,
  };

  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    type: "trust_page",
    city: target.type === "city" ? target.name : null,
    service: target.type === "service" ? target.name : null,
    title: action.title,
    meta_description: `Schema markup draft for ${target.name}`,
    content_html: `<script type="application/ld+json">${JSON.stringify(schemaJson, null, 2)}</script>`,
    content_markdown: `Schema markup draft for ${target.name}`,
    schema_json: schemaJson,
    quality_score: 90,
    status: "draft",
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
  const draftBody = `# ${action.title}\n\nTarget city: ${target.name}${target.state ? `, ${target.state}` : ""}\n\nWhy this matters: ${target.rationale}`;

  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    type: "city_page",
    city: target.name,
    title: action.title,
    meta_description: `City expansion draft for ${target.name}`,
    content_markdown: draftBody,
    content_html: `<pre>${draftBody.replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char))}</pre>`,
    quality_score: Math.max(60, Math.round(target.impact_score)),
    status: "draft",
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
  const draftBody = `# ${action.title}\n\nTarget service: ${target.name}\n\nWhy this matters: ${target.rationale}`;

  const { error } = await supabase.from("generated_content").insert({
    user_id: target.user_id,
    type: "service_page",
    service: target.name,
    title: action.title,
    meta_description: `Service expansion draft for ${target.name}`,
    content_markdown: draftBody,
    content_html: `<pre>${draftBody.replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char))}</pre>`,
    quality_score: Math.max(60, Math.round(target.impact_score)),
    status: "draft",
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
  const { data: profile, error: profileError } = await supabase
    .from("business_profiles")
    .select("business_name, address, city, state, zip, phone, website")
    .eq("user_id", target.user_id)
    .single();

  if (profileError || !profile) {
    throw new Error("No business profile found for citation sync");
  }

  const { error } = await supabase.from("aggregator_sync_jobs").insert({
    user_id: target.user_id,
    provider: "yext",
    status: "queued",
    business_data: {
      ...profile,
      targetDirectory: target.name,
      targetId: target.id,
      initiatedBy: action.type,
    },
  });

  if (error) throw error;

  return {
    ...baseResult,
    success: true,
    message: `Citation task queued for ${target.name}`,
    result: { metric: "citation_tasks_created", before: null, after: 1, measured_at: new Date().toISOString() },
  };
}
