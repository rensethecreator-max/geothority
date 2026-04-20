// ============================================================
// Geothority Fix Engine — Executor
// Handles AUTO/ASSISTED/GUIDED mode execution, progress tracking,
// post-fix verification, and persisted execution plans.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_AUTOMATION_POLICIES,
  type AutomationActionKey,
  type AutomationPolicyMode,
} from "@/lib/types";
import {
  type FixExecutionMode,
  type FixExecutionPlan,
  type FixStep,
  type FixStepStatus,
  type FixVerificationResult,
  type PlanVerification,
} from "./types";

const executions = new Map<string, FixExecutionPlan>();

const AUTO_RUNNABLE_TYPES = new Set([
  "listing_sync",
  "meta_tags",
  "schema",
  "faq",
  "about",
  "landing_page",
  "ai_optimization",
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
  layer_scores_before?: Record<string, number>;
  verification?: PlanVerification;
}

let planCounter = 0;

function mapFixTypeToPolicyAction(fixType: string): AutomationActionKey | null {
  if (fixType === "listing_sync") return "listing_sync";
  if (["schema", "faq", "about", "landing_page", "meta_tags", "ai_optimization"].includes(fixType)) {
    return "generate_content";
  }
  return null;
}

async function loadAutomationPolicies(userId: string): Promise<Record<AutomationActionKey, AutomationPolicyMode>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("automation_policies")
    .eq("id", userId)
    .single();

  return {
    ...DEFAULT_AUTOMATION_POLICIES,
    ...((data?.automation_policies as Partial<Record<AutomationActionKey, AutomationPolicyMode>> | null) ?? {}),
  };
}

function canAutoRun(
  fixType: string,
  mode: FixExecutionMode,
  policyMode?: AutomationPolicyMode
): boolean {
  if (policyMode && policyMode !== "auto_apply") return false;
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
    layerScoresBefore: row.layer_scores_before,
    verification: row.verification,
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
    layer_scores_before: plan.layerScoresBefore,
    verification: plan.verification,
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
  fixes: FixItemInput[],
  layerScoresBefore?: Record<string, number>
): Promise<FixExecutionPlan> {
  planCounter++;
  const planId = `plan_${Date.now()}_${planCounter}`;
  const policies = await loadAutomationPolicies(userId);

  const steps: FixStep[] = fixes.map((fix, i) => {
    const policyAction = mapFixTypeToPolicyAction(fix.type);
    const policyMode = policyAction ? policies[policyAction] : undefined;
    const auto = canAutoRun(fix.type, mode, policyMode) || fix.autoApplied;
    let status: FixStepStatus = "pending";
    let userAction: string | undefined;

    if (fix.autoApplied) {
      status = "pending";
    } else if (!auto) {
      status = "needs_input";
      const baseHint = getUserActionHint(fix.type);
      userAction =
        policyMode === "approval_required"
          ? `Approval required before automation. ${baseHint}`
          : policyMode === "manual_only"
            ? `Manual-only action. ${baseHint}`
            : baseHint;
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
    layerScoresBefore: layerScoresBefore ?? undefined,
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deriveBusinessContext(scan: { business_name: string | null; city: string | null; state: string | null; url: string | null; raw_scan_data: unknown }) {
  const raw = (scan.raw_scan_data ?? {}) as Record<string, any>;
  const businessName = raw.businessName || raw.business_name || scan.business_name || "Business";
  const city = raw.city || scan.city || null;
  const state = raw.state || scan.state || null;
  const location = city && state ? `${city}, ${state}` : city || state || "Local Area";
  const businessType = raw.businessType || raw.primaryCategory || raw.category || raw.industry || "local business";

  return {
    raw,
    businessName,
    city,
    state,
    location,
    businessType,
    website: scan.url || raw.url || null,
  };
}

async function createGeneratedDraft(
  plan: FixExecutionPlan,
  step: FixStep,
  overrides: {
    type: "landing_page" | "localized_faq" | "trust_page" | "about";
    city: string | null;
    service?: string | null;
    title: string;
    metaDescription?: string | null;
    contentHtml?: string | null;
    contentMarkdown?: string | null;
    schemaJson?: Record<string, unknown> | null;
    qualityScore?: number | null;
  }
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: plan.userId,
      scan_id: plan.scanId,
      type: overrides.type,
      city: overrides.city,
      service: overrides.service ?? null,
      title: overrides.title,
      meta_description: overrides.metaDescription ?? null,
      content_html: overrides.contentHtml ?? null,
      content_markdown: overrides.contentMarkdown ?? null,
      schema_json: overrides.schemaJson ?? null,
      quality_score: overrides.qualityScore ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw error;

  step.artifactId = data.id;
  step.artifactType = "generated_content";
  return data.id;
}

function parseAiOptimizationPackage(content: string) {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  return {
    faqSchema: (parsed.faqSchema as Record<string, unknown> | undefined) ?? null,
    entityContent: typeof parsed.entityContent === "string" ? parsed.entityContent : "",
    sameAsSchema: (parsed.sameAsSchema as Record<string, unknown> | undefined) ?? null,
    aiOptimizedAbout: typeof parsed.aiOptimizedAbout === "string" ? parsed.aiOptimizedAbout : "",
  };
}

async function executeSchemaHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { scan } = await loadScanContext(plan);
  if (!step.content) throw new Error("No schema content available");

  let schemaJson: Record<string, unknown>;
  try {
    schemaJson = JSON.parse(step.content);
  } catch {
    throw new Error("Schema content is not valid JSON");
  }

  await createGeneratedDraft(plan, step, {
    type: "trust_page",
    city: scan.city,
    title: step.title,
    metaDescription: "LocalBusiness schema draft generated by Geothority.",
    contentHtml: `<script type=\"application/ld+json\">\n${step.content}\n</script>`,
    contentMarkdown: step.instructions ?? null,
    schemaJson,
    qualityScore: 100,
  });

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
  const { scan } = await loadScanContext(plan);
  if (!step.content) throw new Error("No meta tag content available");

  const parsed = extractMetaContent(step.content);
  await createGeneratedDraft(plan, step, {
    type: "trust_page",
    city: scan.city,
    title: parsed.title,
    metaDescription: parsed.description,
    contentHtml: `<pre>${escapeHtml(step.content)}</pre>`,
    contentMarkdown: step.instructions ?? step.content,
    qualityScore: 90,
  });

  step.resultMessage = "Meta tag draft saved to generated content.";
}

async function executeListingSyncHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { supabase, scan } = await loadScanContext(plan);
  const context = deriveBusinessContext(scan);
  const { raw, businessName, city, state } = context;

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

async function executeFaqHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { scan } = await loadScanContext(plan);
  const context = deriveBusinessContext(scan);

  if (!step.content) throw new Error("No FAQ content available");

  await createGeneratedDraft(plan, step, {
    type: "localized_faq",
    city: context.city,
    title: step.title,
    metaDescription: `${context.businessName} FAQ content for ${context.location}.`,
    contentHtml: step.content,
    contentMarkdown: step.instructions ?? null,
    qualityScore: 88,
  });

  step.resultMessage = "FAQ draft saved to generated content.";
}

async function executeAboutHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { scan } = await loadScanContext(plan);
  const context = deriveBusinessContext(scan);

  if (!step.content) throw new Error("No About page content available");

  await createGeneratedDraft(plan, step, {
    type: "about",
    city: context.city,
    title: step.title,
    metaDescription: `About ${context.businessName} in ${context.location}.`,
    contentHtml: step.content,
    contentMarkdown: step.instructions ?? null,
    qualityScore: 86,
  });

  step.resultMessage = "About page draft saved to generated content.";
}

async function executeLandingPageHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { scan } = await loadScanContext(plan);
  const context = deriveBusinessContext(scan);

  if (!step.content) throw new Error("No landing page content available");

  await createGeneratedDraft(plan, step, {
    type: "landing_page",
    city: context.city,
    service: context.businessType,
    title: step.title,
    metaDescription: `${context.businessType} landing page for ${context.location}.`,
    contentHtml: step.content,
    contentMarkdown: step.instructions ?? null,
    qualityScore: 90,
  });

  step.resultMessage = "Landing page draft saved to generated content.";
}

async function executeAiOptimizationHandler(step: FixStep, plan: FixExecutionPlan): Promise<void> {
  const { scan } = await loadScanContext(plan);
  const context = deriveBusinessContext(scan);

  if (!step.content) throw new Error("No AI optimization package available");

  let pkg: ReturnType<typeof parseAiOptimizationPackage>;
  try {
    pkg = parseAiOptimizationPackage(step.content);
  } catch {
    throw new Error("AI optimization package is not valid JSON");
  }

  const combinedSchema = {
    faqSchema: pkg.faqSchema,
    sameAsSchema: pkg.sameAsSchema,
  };

  const htmlParts = [
    pkg.aiOptimizedAbout,
    pkg.entityContent ? `<section><h2>Entity-Rich Content</h2><div>${escapeHtml(pkg.entityContent).replace(/\n/g, "<br />")}</div></section>` : "",
    pkg.faqSchema ? `<script type=\"application/ld+json\">\n${JSON.stringify(pkg.faqSchema, null, 2)}\n</script>` : "",
    pkg.sameAsSchema ? `<script type=\"application/ld+json\">\n${JSON.stringify(pkg.sameAsSchema, null, 2)}\n</script>` : "",
  ].filter(Boolean);

  await createGeneratedDraft(plan, step, {
    type: "trust_page",
    city: context.city,
    title: step.title,
    metaDescription: `AI optimization package for ${context.businessName} in ${context.location}.`,
    contentHtml: htmlParts.join("\n\n"),
    contentMarkdown: step.instructions ?? step.content,
    schemaJson: combinedSchema,
    qualityScore: 95,
  });

  step.resultMessage = "AI optimization package saved to generated content.";
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
      await executeFaqHandler(step, plan);
      break;
    case "about":
      await executeAboutHandler(step, plan);
      break;
    case "landing_page":
      await executeLandingPageHandler(step, plan);
      break;
    case "ai_optimization":
      await executeAiOptimizationHandler(step, plan);
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

/**
 * Auto-verify: fetch the original scan's layer scores as "before"
 * and either use a newly provided scan's scores as "after" or look up
 * the latest scan for the same user+business.
 */
export async function autoVerifyPlan(
  planId: string,
  userId: string,
  afterScanId?: string
): Promise<PlanVerification> {
  const plan = await getExecution(planId, userId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  // If plan already has a running verification, don't duplicate
  if (plan.verification?.status === "running") {
    throw new Error("Verification already in progress");
  }

  plan.verification = {
    status: "running",
    startedAt: new Date().toISOString(),
  };
  await saveExecution(plan);

  try {
    const supabase = createServiceClient();

    // Fetch before scores: prefer plan's captured scores, then fall back to original scan
    let layerScoresBefore = plan.layerScoresBefore;
    let scoreBefore: number | undefined;
    if (!layerScoresBefore) {
      const { data: originalScan } = await supabase
        .from("scans")
        .select("layer_scores, overall_score")
        .eq("id", plan.scanId)
        .eq("user_id", userId)
        .single();
      if (originalScan) {
        layerScoresBefore = originalScan.layer_scores as Record<string, number> | undefined;
        scoreBefore = originalScan.overall_score as number | undefined;
      }
    }
    if (!layerScoresBefore) {
      layerScoresBefore = { layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0 };
    }
    if (scoreBefore === undefined) {
      scoreBefore =
        (layerScoresBefore.layer1 ?? 0) * 0.25 +
        (layerScoresBefore.layer2 ?? 0) * 0.2 +
        (layerScoresBefore.layer3 ?? 0) * 0.25 +
        (layerScoresBefore.layer4 ?? 0) * 0.15 +
        (layerScoresBefore.layer5 ?? 0) * 0.15;
      scoreBefore = Math.round(scoreBefore);
    }

    // Persist before scores on the plan if not already there
    if (!plan.layerScoresBefore) {
      plan.layerScoresBefore = layerScoresBefore;
    }

    // Fetch after scores: use provided scan, or find the latest scan after the plan was created
    let layerScoresAfter: Record<string, number> | undefined;
    let scoreAfter: number | undefined;

    if (afterScanId) {
      const { data: afterScan } = await supabase
        .from("scans")
        .select("layer_scores, overall_score")
        .eq("id", afterScanId)
        .eq("user_id", userId)
        .single();
      if (afterScan) {
        layerScoresAfter = afterScan.layer_scores as Record<string, number> | undefined;
        scoreAfter = afterScan.overall_score as number | undefined;
      }
    } else {
      // Look for any scan for this user created after the plan
      const { data: newerScans } = await supabase
        .from("scans")
        .select("id, layer_scores, overall_score, created_at")
        .eq("user_id", userId)
        .gt("created_at", plan.createdAt)
        .order("created_at", { ascending: false })
        .limit(1);
      if (newerScans && newerScans.length > 0) {
        layerScoresAfter = newerScans[0].layer_scores as Record<string, number> | undefined;
        scoreAfter = newerScans[0].overall_score as number | undefined;
      }
    }

    if (!layerScoresAfter) {
      plan.verification = {
        status: "failed",
        layerScoresAfter: undefined,
        scoreBefore,
        scoreAfter: undefined,
        startedAt: plan.verification.startedAt,
        completedAt: new Date().toISOString(),
        passedCount: 0,
        failedCount: 0,
      };
      await saveExecution(plan);
      throw new Error("No post-fix scan found. Run a new scan first, or provide afterScanId.");
    }

    if (scoreAfter === undefined) {
      scoreAfter =
        (layerScoresAfter.layer1 ?? 0) * 0.25 +
        (layerScoresAfter.layer2 ?? 0) * 0.2 +
        (layerScoresAfter.layer3 ?? 0) * 0.25 +
        (layerScoresAfter.layer4 ?? 0) * 0.15 +
        (layerScoresAfter.layer5 ?? 0) * 0.15;
      scoreAfter = Math.round(scoreAfter);
    }

    // Run per-step verification
    const stepResults = await verifyAllFixes(planId, layerScoresBefore, layerScoresAfter, userId);
    const passedCount = stepResults.filter((r) => r.passed).length;
    const failedCount = stepResults.filter((r) => !r.passed).length;

    plan.verification = {
      status: "completed",
      layerScoresAfter,
      scoreBefore,
      scoreAfter,
      stepResults,
      startedAt: plan.verification.startedAt,
      completedAt: new Date().toISOString(),
      passedCount,
      failedCount,
    };
    await saveExecution(plan);
    return plan.verification;
  } catch (err) {
    plan.verification = {
      ...(plan.verification ?? {}),
      status: "failed",
      completedAt: new Date().toISOString(),
    };
    await saveExecution(plan);
    throw err;
  }
}
