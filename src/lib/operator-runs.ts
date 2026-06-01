import { createServiceClient } from "@/lib/supabase/server";

export interface OperatorRunRecord {
  id: string;
  user_id: string;
  scan_id: string | null;
  status: "blocked" | "ready" | "launched" | "resumed" | "failed";
  operator_action: string;
  message: string;
  redirect_to: string | null;
  metadata: Record<string, unknown>;
  current_stage: string;
  stage_status: string;
  plan_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperatorRunEventRecord {
  id: string;
  run_id: string;
  user_id: string;
  stage: string;
  status: "started" | "completed" | "blocked" | "redirected" | "failed" | "info";
  title: string;
  detail: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface CreateOperatorRunInput {
  userId: string;
  scanId?: string | null;
  operatorAction?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

interface AppendOperatorRunEventInput {
  runId: string;
  userId: string;
  stage: string;
  status: OperatorRunEventRecord["status"];
  title: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

interface FinalizeOperatorRunInput {
  runId: string;
  status: OperatorRunRecord["status"];
  operatorAction: string;
  message: string;
  redirectTo?: string | null;
  metadata?: Record<string, unknown>;
  currentStage: string;
  stageStatus: string;
  planId?: string | null;
}

let operatorRunCounter = 0;
let operatorRunEventCounter = 0;

function nextRunId() {
  operatorRunCounter += 1;
  return `oprun_${Date.now()}_${operatorRunCounter}`;
}

function nextEventId() {
  operatorRunEventCounter += 1;
  return `oprevt_${Date.now()}_${operatorRunEventCounter}`;
}

export async function createOperatorRun(input: CreateOperatorRunInput) {
  const supabase = createServiceClient();
  const payload = {
    id: nextRunId(),
    user_id: input.userId,
    scan_id: input.scanId ?? null,
    status: "ready",
    operator_action: input.operatorAction ?? "operator_launch_started",
    message: input.message ?? "Operator run started.",
    redirect_to: null,
    metadata: input.metadata ?? {},
    current_stage: "intake",
    stage_status: "started",
    plan_id: null,
    completed_at: null,
  };

  const { data, error } = await supabase
    .from("operator_runs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create operator run", error);
    return null;
  }

  return data as OperatorRunRecord;
}

export async function appendOperatorRunEvent(input: AppendOperatorRunEventInput) {
  const supabase = createServiceClient();
  const payload = {
    id: nextEventId(),
    run_id: input.runId,
    user_id: input.userId,
    stage: input.stage,
    status: input.status,
    title: input.title,
    detail: input.detail,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("operator_run_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to append operator run event", error);
    return null;
  }

  return data as OperatorRunEventRecord;
}

export async function finalizeOperatorRun(input: FinalizeOperatorRunInput) {
  const supabase = createServiceClient();
  const payload = {
    status: input.status,
    operator_action: input.operatorAction,
    message: input.message,
    redirect_to: input.redirectTo ?? null,
    metadata: input.metadata ?? {},
    current_stage: input.currentStage,
    stage_status: input.stageStatus,
    plan_id: input.planId ?? null,
    updated_at: new Date().toISOString(),
    completed_at: ["blocked", "ready", "launched", "resumed", "failed"].includes(input.status)
      ? new Date().toISOString()
      : null,
  };

  const { data, error } = await supabase
    .from("operator_runs")
    .update(payload)
    .eq("id", input.runId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to finalize operator run", error);
    return null;
  }

  return data as OperatorRunRecord;
}
