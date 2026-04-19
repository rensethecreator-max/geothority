// ============================================================
// Geothority Fix Engine — Executor
// Handles AUTO/ASSISTED/GUIDED mode execution, progress tracking,
// post-fix verification, and persisted execution plans.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import {
  type FixExecutionMode,
  type FixExecutionPlan,
  type FixStep,
  type FixStepStatus,
  type FixVerificationResult,
} from "./types";

const executions = new Map<string, FixExecutionPlan>();

const AUTO_RUNNABLE_TYPES = new Set([
  "listing_sync",
  "meta_tags",
  "schema",
]);

interface FixItemInput {
  type: string;
  title: string;
  impact: "high" | "medium" | "low";
  autoApplied: boolean;
  content?: string;
  instructions?: string;
  group?: string;
}

interface FixExecutionPlanRow {
  id: string;
  user_id: string;
  scan_id: string;
  mode: FixExecutionMode;
  steps: FixStep[];
  progress: number;
  total: number;
  completed: number;
  failed: number;
  needs_input: number;
  status: FixExecutionPlan["status"];
  created_at: string;
  updated_at: string;
}

let planCounter = 0;

function canAutoRun(fixType: string, mode: FixExecutionMode): boolean {
  if (mode === "GUIDED") return false;
  if (mode === "AUTO") return true;
  return AUTO_RUNNABLE_TYPES.has(fixType);
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

function toPlan(row: FixExecutionPlanRow): FixExecutionPlan {
  return {
    id: row.id,
    userId: row.user_id,
    scanId: row.scan_id,
    mode: row.mode,
    steps: row.steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progress: row.progress,
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    needsInput: row.needs_input,
    status: row.status,
  };
}

function toRow(plan: FixExecutionPlan): Omit<FixExecutionPlanRow, "updated_at"> {
  return {
    id: plan.id,
    user_id: plan.userId!,
    scan_id: plan.scanId,
    mode: plan.mode,
    steps: plan.steps,
    progress: plan.progress,
    total: plan.total,
    completed: plan.completed,
    failed: plan.failed,
    needs_input: plan.needsInput,
    status: plan.status,
    created_at: plan.createdAt,
  };
}

async function saveExecution(plan: FixExecutionPlan): Promise<FixExecutionPlan> {
  executions.set(plan.id, plan);

  if (!plan.userId) {
    return plan;
  }

  const supabase = createServiceClient();
  const payload = {
    ...toRow(plan),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("fix_execution_plans")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to persist fix execution plan", error);
    return plan;
  }

  const persisted = toPlan(data as FixExecutionPlanRow);
  executions.set(plan.id, persisted);
  return persisted;
}

export async function getExecution(
  planId: string,
  userId?: string
): Promise<FixExecutionPlan | undefined> {
  const inMemory = executions.get(planId);
  if (inMemory && (!userId || inMemory.userId === userId)) {
    return inMemory;
  }

  const supabase = createServiceClient();
  let query = supabase.from("fix_execution_plans").select("*").eq("id", planId);
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return undefined;
  }

  const plan = toPlan(data as FixExecutionPlanRow);
  executions.set(plan.id, plan);
  return plan;
}

export async function buildExecutionPlan(
  userId: string,
  scanId: string,
  mode: FixExecutionMode,
  fixes: FixItemInput[]
): Promise<FixExecutionPlan> {
  planCounter++;
  const planId = `plan_${Date.now()}_${planCounter}`;

  const steps: FixStep[] = fixes.map((fix, i) => {
    const auto = canAutoRun(fix.type, mode) || fix.autoApplied;
    let status: FixStepStatus = "pending";
    let userAction: string | undefined;

    if (fix.autoApplied) {
      status = "pending";
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
      content: fix.content,
      instructions: fix.instructions,
      group: fix.group,
      userAction,
    };
  });

  const plan: FixExecutionPlan = {
    id: planId,
    userId,
    scanId,
    mode,
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 0,
    total: steps.length,
    completed: 0,
    failed: 0,
    needsInput: steps.filter((s) => s.status === "needs_input").length,
    status: "planning",
  };

  return saveExecution(plan);
}

export async function executeFixPackage(
  planId: string,
  userId?: string
): Promise<FixExecutionPlan> {
  const plan = await getExecution(planId, userId);
  if (!plan) throw new Error(`Execution plan ${planId} not found`);
  if (plan.status === "executing") throw new Error("Execution already in progress");

  plan.status = "executing";
  plan.updatedAt = new Date().toISOString();
  await saveExecution(plan);

  for (const step of plan.steps) {
    if (step.status === "needs_input") continue;
    if (step.status === "completed" || step.status === "skipped") continue;

    step.status = "running";
    step.startedAt = new Date().toISOString();

    try {
      await executeStep(step, plan);
      step.status = "completed";
      step.completedAt = new Date().toISOString();
      plan.completed++;
    } catch (err) {
      step.status = "failed";
      step.resultMessage = err instanceof Error ? err.message : "Unknown error";
      plan.failed++;
    }

    const resolved = plan.steps.filter((s) =>
      s.status === "completed" || s.status === "skipped" || s.status === "failed"
    ).length;
    plan.progress = Math.round((resolved / Math.max(plan.total, 1)) * 100);
    plan.needsInput = plan.steps.filter((s) => s.status === "needs_input").length;
    plan.updatedAt = new Date().toISOString();
    await saveExecution(plan);
  }

  if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  } else if (plan.failed > 0 && plan.completed < plan.total) {
    plan.status = plan.completed > 0 ? "completed" : "failed";
  } else {
    plan.status = "completed";
  }

  plan.updatedAt = new Date().toISOString();
  return saveExecution(plan);
}

async function loadScanContext(plan: FixExecutionPlan) {
  if (!plan.userId) {
    throw new Error("Execution plan missing user context");
  }

  const supabase = createServiceClient();
  const { data: scan, error } = await supabase
    .from("scans")
    .select("id, business_name, city, state, url, raw_scan_data")
    .eq("id", plan.scanId)
    .eq("user_id", plan.userId)
    .single();

  if (error || !scan) {
    throw new Error("Associated scan not found for execution plan");
  }

  return { supabase, scan };
}

async function executeSchemaHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { supabase, scan } = await loadScanContext(plan);
  if (!step.content) throw new Error("No schema content available");

  let schemaJson: Record<string, unknown>;
  try {
    schemaJson = JSON.parse(step.content);
  } catch {
    throw new Error("Schema content is not valid JSON");
  }

  const { data, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: plan.userId,
      scan_id: plan.scanId,
      type: "trust_page",
      city: scan.city,
      service: null,
      title: step.title,
      meta_description: "LocalBusiness schema draft generated by Geothority.",
      content_html: `<script type=\"application/ld+json\">\n${step.content}\n</script>`,
      content_markdown: step.instructions ?? null,
      schema_json: schemaJson,
      quality_score: 100,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw error;

  step.artifactId = data.id;
  step.artifactType = "generated_content";
  step.resultMessage = "Schema draft saved to generated content.";
}

function extractMetaContent(content: string) {
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
  return {
    title: titleMatch?.[1]?.trim() || "SEO Meta Tags Draft",
    description: descMatch?.[1]?.trim() || "",
  };
}

async function executeMetaTagsHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { supabase, scan } = await loadScanContext(plan);
  if (!step.content) throw new Error("No meta tag content available");

  const parsed = extractMetaContent(step.content);
  const { data, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: plan.userId,
      scan_id: plan.scanId,
      type: "trust_page",
      city: scan.city,
      service: null,
      title: parsed.title,
      meta_description: parsed.description,
      content_html: `<pre>${step.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
      content_markdown: step.instructions ?? step.content,
      schema_json: null,
      quality_score: 90,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw error;

  step.artifactId = data.id;
  step.artifactType = "generated_content";
  step.resultMessage = "Meta tag draft saved to generated content.";
}

async function executeListingSyncHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { supabase, scan } = await loadScanContext(plan);
  const raw = (scan.raw_scan_data ?? {}) as Record<string, any>;
  const businessName = raw.businessName || raw.business_name || scan.business_name;
  const city = raw.city || scan.city;
  const state = raw.state || scan.state;

  if (!businessName || !city || !state) {
    throw new Error("Missing business context for listing sync");
  }

  const { verifyAndSync } = await import("@/lib/foursquare");
  const result = await verifyAndSync({
    name: businessName,
    address: raw.address || raw.streetAddress || undefined,
    city,
    state,
    phone: raw.phone || undefined,
    website: scan.url || raw.url || undefined,
  });

  const directoriesReached = result.action === "verified" || result.action === "found" ? 50 : 0;
  const { data, error } = await supabase
    .from("listing_syncs")
    .insert({
      user_id: plan.userId,
      business_name: businessName,
      city,
      state,
      fsq_id: result.venue?.id ?? null,
      sync_status: result.action,
      directories_reached: directoriesReached,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!result.success && result.action === "error") {
    throw new Error(result.details);
  }

  step.artifactId = data.id;
  step.artifactType = "listing_sync";
  step.resultMessage = result.details;
}

async function executeStep(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  switch (step.fixType) {
    case "listing_sync":
      await executeListingSyncHandler(step, plan);
      break;
    case "schema":
      await executeSchemaHandler(step, plan);
      break;
    case "meta_tags":
      await executeMetaTagsHandler(step, plan);
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

  await new Promise((r) => setTimeout(r, 50));
}

export async function completeStep(
  planId: string,
  stepId: string,
  userId?: string
): Promise<FixExecutionPlan> {
  const plan = await getExecution(planId, userId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);

  if (step.status === "needs_input" || step.status === "pending") {
    step.status = "completed";
    step.completedAt = new Date().toISOString();
    plan.completed++;
  }

  const resolved = plan.steps.filter((s) =>
    s.status === "completed" || s.status === "skipped" || s.status === "failed"
  ).length;
  plan.progress = Math.round((resolved / Math.max(plan.total, 1)) * 100);
  plan.needsInput = plan.steps.filter((s) => s.status === "needs_input").length;

  if (plan.steps.every((s) => s.status === "completed" || s.status === "skipped" || s.status === "failed")) {
    plan.status = plan.failed > 0 && plan.completed === 0 ? "failed" : "completed";
  } else if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  }

  plan.updatedAt = new Date().toISOString();
  return saveExecution(plan);
}

export async function skipStep(
  planId: string,
  stepId: string,
  userId?: string
): Promise<FixExecutionPlan> {
  const plan = await getExecution(planId, userId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found`);

  step.status = "skipped";
  step.completedAt = new Date().toISOString();
  plan.needsInput = plan.steps.filter((s) => s.status === "needs_input").length;

  const resolved = plan.steps.filter((s) =>
    s.status === "completed" || s.status === "skipped" || s.status === "failed"
  ).length;
  plan.progress = Math.round((resolved / Math.max(plan.total, 1)) * 100);

  if (plan.steps.every((s) => s.status === "completed" || s.status === "skipped" || s.status === "failed")) {
    plan.status = plan.failed > 0 && plan.completed === 0 ? "failed" : "completed";
  } else if (plan.steps.some((s) => s.status === "needs_input")) {
    plan.status = "paused";
  }

  plan.updatedAt = new Date().toISOString();
  return saveExecution(plan);
}

export async function getFixExecutionStatus(
  planId: string,
  userId?: string
): Promise<FixExecutionPlan | null> {
  return (await getExecution(planId, userId)) ?? null;
}

export async function verifyFix(
  planId: string,
  stepId: string,
  scoreBefore: number,
  scoreAfter: number,
  userId?: string
): Promise<FixVerificationResult> {
  const plan = await getExecution(planId, userId);
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
  plan.updatedAt = new Date().toISOString();
  await saveExecution(plan);
  return result;
}

export async function verifyAllFixes(
  planId: string,
  layerScoresBefore: Record<string, number>,
  layerScoresAfter: Record<string, number>,
  userId?: string
): Promise<FixVerificationResult[]> {
  const plan = await getExecution(planId, userId);
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

    const result = await verifyFix(planId, step.id, before, after, userId);
    results.push(result);
  }

  return results;
}
