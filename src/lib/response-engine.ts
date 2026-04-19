// ============================================================
// Geothority Response Engine
// Matches detected competitor changes to rules, generates
// structured recommendations with actionable next steps.
// ============================================================

import {
  type DetectedChange,
  type ChangeSeverity,
} from "./competitor-change-detection";
import rulesJson from "./response-engine-rules.json";

// ── Types ────────────────────────────────────────────────────────

export type ActionType = string;

export interface ResponseRule {
  id: string;
  trigger: {
    changeType: string;
    severity: ChangeSeverity[];
  };
  interpretation: string;
  countermeasures: {
    action: ActionType;
    priority: number;
    label: string;
    description: string;
  }[];
}

export interface ActionDefinition {
  type: "asset_generation" | "manual_action" | "campaign" | "content_publishing" | "audit" | "technical";
  label: string;
  description: string;
  requires_approval: boolean;
  output: string;
  fields: string[];
}

export interface ActionSuggestion {
  action: ActionType;
  priority: number;
  label: string;
  description: string;
  type: ActionDefinition["type"];
  requiresApproval: boolean;
  outputKind: string;
  config: Record<string, any>;
  status: "pending" | "approved" | "executing" | "completed" | "dismissed";
}

export interface Recommendation {
  id: string;
  ruleId: string;
  competitorName: string;
  detectedChange: DetectedChange;
  interpretation: string;
  severity: ChangeSeverity;
  actionSuggestions: ActionSuggestion[];
  createdAt: string;
  status: "pending" | "partially_approved" | "approved" | "completed" | "dismissed";
}

/** The full structured output suitable for UI rendering. */
export interface ResponseEngineOutput {
  businessId: string;
  scanDate: string;
  totalChanges: number;
  recommendations: Recommendation[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    topAction: ActionType | null;
  };
}

// ── Rule Loading ─────────────────────────────────────────────────

let _rulesCache: ResponseRule[] | null = null;

export function loadRules(): ResponseRule[] {
  if (_rulesCache) return _rulesCache;
  _rulesCache = rulesJson.rules as ResponseRule[];
  return _rulesCache;
}

export function getActionDefinitions(): Record<string, ActionDefinition> {
  return rulesJson.action_definitions as Record<string, ActionDefinition>;
}

// ── Rule Matching ─────────────────────────────────────────────────

/**
 * Find the best-matching rule for a detected change.
 * Returns the first rule whose trigger.changeType and severity match.
 */
export function matchRule(change: DetectedChange): ResponseRule | null {
  const rules = loadRules();
  return (
    rules.find(
      (r) =>
        r.trigger.changeType === change.changeType &&
        r.trigger.severity.includes(change.severity)
    ) ?? null
  );
}

// ── Action Suggestion Builder ─────────────────────────────────────

/**
 * Build concrete action suggestions from a rule's countermeasures,
 * enriched with the action definition metadata and pre-populated config.
 */
export function buildActionSuggestions(
  countermeasures: ResponseRule["countermeasures"],
  change: DetectedChange
): ActionSuggestion[] {
  const defs = getActionDefinitions();

  return countermeasures.map((cm) => {
    const def = defs[cm.action];
    const config = buildActionConfig(cm.action, change, def);

    return {
      action: cm.action,
      priority: cm.priority,
      label: cm.label,
      description: cm.description,
      type: def?.type ?? "manual_action",
      requiresApproval: def?.requires_approval ?? true,
      outputKind: def?.output ?? "unknown",
      config,
      status: "pending" as const,
    };
  });
}

/**
 * Pre-populate action config with sensible defaults derived from
 * the detected change. These are starting values the UI can refine.
 */
function buildActionConfig(
  action: ActionType,
  change: DetectedChange,
  def?: ActionDefinition
): Record<string, any> {
  const base: Record<string, any> = { triggeredBy: change.changeType };

  switch (action) {
    case "generate_photos":
      base.count = Math.max(3, Math.min(8, Math.abs(Number(change.changeDetail.delta) || 3) + 1));
      base.style = "professional_branded";
      base.concepts = ["team_office", "seasonal_graphic", "service_in_action"];
      base.brand_colors = null; // filled by user profile
      break;

    case "review_push":
      base.channel = "email_sms";
      base.template = "recent_experience";
      base.target_count = 5;
      break;

    case "gbp_post":
      base.post_type = "update";
      base.topic = `Response to competitor ${change.changeType} change`;
      base.cta_text = "Learn More";
      base.image_required = true;
      break;

    case "category_audit":
    case "attributes_audit":
    case "services_audit":
      base.competitor_snapshot = change.changeDetail.after;
      base.current_snapshot = change.changeDetail.before;
      break;

    case "schema_improvement":
      base.current_schema = "LocalBusiness";
      base.target_schema_type = "LocalBusiness";
      break;

    case "service_area_pages":
    case "geo_content":
      base.cities = [];
      base.services = [];
      base.count = 3;
      base.template = "service_location";
      break;

    case "description_optimize":
      base.keywords = [];
      base.tone = "professional";
      base.max_length = 750;
      break;

    case "hours_update":
      base.current_hours = change.changeDetail.before;
      base.suggested_hours = change.changeDetail.after;
      break;

    case "faq_refresh":
      base.topics = [change.changeType];
      base.format = "gbp_qa";
      break;

    case "upload_existing_photos":
      base.source_folders = ["google_drive", "dropbox"];
      base.min_count = 3;
      break;
  }

  return base;
}

// ── Core Engine ──────────────────────────────────────────────────

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter++;
  return `${prefix}_${Date.now()}_${_idCounter}`;
}

/**
 * Process a list of detected competitor changes and produce
 * structured recommendations with action suggestions.
 */
export function generateRecommendations(
  competitorName: string,
  changes: DetectedChange[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const change of changes) {
    const rule = matchRule(change);
    if (!rule) continue; // no matching rule → skip (or log for coverage gap analysis)

    recommendations.push({
      id: nextId("rec"),
      ruleId: rule.id,
      competitorName,
      detectedChange: change,
      interpretation: rule.interpretation,
      severity: change.severity,
      actionSuggestions: buildActionSuggestions(rule.countermeasures, change),
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  // Sort: critical → warning → info, then by recency
  const severityOrder: Record<ChangeSeverity, number> = { critical: 0, warning: 1, info: 2 };
  recommendations.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return recommendations;
}

/**
 * Build the full UI-ready output from multiple competitors' changes.
 */
export function buildResponseEngineOutput(
  businessId: string,
  competitorChanges: Array<{ competitorName: string; changes: DetectedChange[] }>
): ResponseEngineOutput {
  const allRecommendations: Recommendation[] = [];

  for (const { competitorName, changes } of competitorChanges) {
    allRecommendations.push(...generateRecommendations(competitorName, changes));
  }

  const totalChanges = competitorChanges.reduce(
    (sum, c) => sum + c.changes.length,
    0
  );

  const critical = allRecommendations.filter((r) => r.severity === "critical").length;
  const warning = allRecommendations.filter((r) => r.severity === "warning").length;
  const info = allRecommendations.filter((r) => r.severity === "info").length;

  // Determine most common top-priority action
  const actionCounts: Record<string, number> = {};
  for (const rec of allRecommendations) {
    const top = rec.actionSuggestions.find((a) => a.priority === 1);
    if (top) actionCounts[top.action] = (actionCounts[top.action] || 0) + 1;
  }
  const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ActionType | null ?? null;

  return {
    businessId,
    scanDate: new Date().toISOString(),
    totalChanges,
    recommendations: allRecommendations,
    summary: { critical, warning, info, topAction },
  };
}

// ── Approval & Execution Triggers ─────────────────────────────────

/**
 * Mark a specific action as approved and return the updated recommendation.
 * If all actions in a recommendation are approved, the recommendation
 * status moves to "approved".
 */
export function approveAction(
  recommendation: Recommendation,
  actionIndex: number
): Recommendation {
  const updated = { ...recommendation };
  updated.actionSuggestions = [...updated.actionSuggestions];
  updated.actionSuggestions[actionIndex] = {
    ...updated.actionSuggestions[actionIndex],
    status: "approved",
  };

  const allApproved = updated.actionSuggestions.every(
    (a) => a.status === "approved" || a.status === "dismissed" || a.status === "completed"
  );
  const someApproved = updated.actionSuggestions.some((a) => a.status === "approved");

  updated.status = allApproved ? "approved" : someApproved ? "partially_approved" : updated.status;
  return updated;
}

/**
 * Dismiss a specific action from a recommendation.
 */
export function dismissAction(
  recommendation: Recommendation,
  actionIndex: number
): Recommendation {
  const updated = { ...recommendation };
  updated.actionSuggestions = [...updated.actionSuggestions];
  updated.actionSuggestions[actionIndex] = {
    ...updated.actionSuggestions[actionIndex],
    status: "dismissed",
  };

  const allResolved = updated.actionSuggestions.every(
    (a) => a.status === "approved" || a.status === "dismissed" || a.status === "completed"
  );
  if (allResolved) updated.status = "approved";
  return updated;
}

// ── Downstream Action Dispatchers ─────────────────────────────────

/**
 * Given an approved action, produce a dispatch payload for the
 * downstream system that will actually execute it.
 *
 * This is the integration point: the returned object should be
 * sent to the appropriate handler (image gen pipeline, review
 * campaign service, GBP API, etc.).
 */
export interface DispatchPayload {
  recommendationId: string;
  action: ActionType;
  type: ActionDefinition["type"];
  config: Record<string, any>;
  outputKind: string;
  dispatchedAt: string;
}

export function dispatchAction(
  recommendation: Recommendation,
  actionIndex: number
): DispatchPayload | null {
  const action = recommendation.actionSuggestions[actionIndex];
  if (!action || action.status !== "approved") return null;

  // Mark as executing
  action.status = "executing";

  return {
    recommendationId: recommendation.id,
    action: action.action,
    type: action.type,
    config: action.config,
    outputKind: action.outputKind,
    dispatchedAt: new Date().toISOString(),
  };
}

/**
 * Process all approved actions in a recommendation and return
 * dispatch payloads for each.
 */
export function dispatchAllApproved(
  recommendation: Recommendation
): DispatchPayload[] {
  const payloads: DispatchPayload[] = [];
  recommendation.actionSuggestions.forEach((action, i) => {
    if (action.status === "approved") {
      const payload = dispatchAction(recommendation, i);
      if (payload) payloads.push(payload);
    }
  });
  return payloads;
}
