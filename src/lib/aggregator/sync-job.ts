/**
 * SyncJob Pipeline — Orchestrates pushing canonical business data to aggregators
 * Handles queueing, execution, retries, logging, and result tracking.
 * Now persists to Supabase (aggregator_sync_jobs + aggregator_sync_logs)
 * with in-memory fallback for serverless cold starts.
 */

import { v4 as uuid } from "uuid";
import { normalizeBusinessProfile, validateCanonicalProfile, computeIdentityConfidence } from "../canonical-identity";
import type { CanonicalProfile, ValidationIssue } from "../canonical-identity";
import type {
  AggregatorProvider,
  CanonicalBusinessData,
  SyncJob,
  SyncJobLog,
  SyncJobStatus,
  PushResult,
} from "./types";
import { createAdapter } from "./adapter-registry";

// ─── In-memory job store (fallback + cache) ─────────────────────
const jobStore = new Map<string, SyncJob>();
const logStore = new Map<string, SyncJobLog[]>();

function now(): string {
  return new Date().toISOString();
}

// ─── Supabase persistence helpers ─────────────────────────────────

async function getSupabase() {
  try {
    const { createServerSupabase } = await import("@/lib/supabase/server");
    return await createServerSupabase();
  } catch {
    return null;
  }
}

async function persistJob(job: SyncJob) {
  const supabase = await getSupabase();
  if (!supabase) return;

  const row = {
    id: job.id,
    user_id: job.userId,
    provider: job.provider,
    status: job.status,
    business_data: job.businessData,
    result: job.result,
    error: job.error,
    attempts: job.retryCount,
    max_retries: job.maxRetries,
    last_attempt_at: job.startedAt,
    completed_at: job.completedAt,
    updated_at: now(),
  };

  await supabase
    .from("aggregator_sync_jobs")
    .upsert(row, { onConflict: "id" });
}

async function persistLog(jobId: string, level: string, message: string, metadata: Record<string, unknown> = {}) {
  const supabase = await getSupabase();
  if (!supabase) return;

  const job = jobStore.get(jobId);
  if (!job) return;

  await supabase.from("aggregator_sync_logs").insert({
    job_id: jobId,
    user_id: job.userId,
    level,
    message,
    data: Object.keys(metadata).length > 0 ? metadata : null,
  });
}

// ─── Public API ──────────────────────────────────────────────────────────

export interface SyncJobOptions {
  userId: string;
  provider: AggregatorProvider;
  credentials: Record<string, string>;
  businessData: CanonicalBusinessData;
  maxRetries?: number;
  syncFrequency?: string;
}

/** Queue a new sync job */
export function queueSyncJob(opts: SyncJobOptions): SyncJob {
  const job: SyncJob = {
    id: uuid(),
    userId: opts.userId,
    provider: opts.provider,
    status: "queued",
    businessData: opts.businessData,
    result: null,
    queuedAt: now(),
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: opts.maxRetries ?? 3,
    error: null,
  };
  jobStore.set(job.id, job);
  logStore.set(job.id, []);
  addLog(job.id, "info", `Job queued for ${opts.provider}`);
  void persistJob(job);
  return job;
}

/** Execute a queued/pending job immediately */
export async function executeJob(jobId: string): Promise<SyncJob> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error(`SyncJob not found: ${jobId}`);
  if (job.status === "running") throw new Error("Job already running");

  job.status = "running";
  job.startedAt = now();
  addLog(job.id, "info", "Job execution started");

  // ── Canonical Identity Pre-Sync Validation ───────
  const canonicalProfile = normalizeBusinessProfile({
    businessName: job.businessData.businessName,
    streetAddress: job.businessData.streetAddress,
    city: job.businessData.city,
    state: job.businessData.state,
    postalCode: job.businessData.postalCode,
    country: job.businessData.country,
    phone: job.businessData.phone,
    website: job.businessData.website,
    email: job.businessData.email ?? undefined,
    description: job.businessData.description,
    categories: job.businessData.categories,
    hours: job.businessData.hours as any,
    geo: job.businessData.geo,
    logoUrl: job.businessData.logoUrl ?? undefined,
    photoUrls: job.businessData.photoUrls,
    socialProfiles: job.businessData.socialProfiles,
    attributes: job.businessData.attributes as any,
    services: job.businessData.services,
    paymentMethods: job.businessData.paymentMethods,
    yearEstablished: job.businessData.yearEstablished ?? undefined,
    languages: job.businessData.languages,
  });

  const validationIssues = validateCanonicalProfile(canonicalProfile);
  const errors = validationIssues.filter((v) => v.severity === "error");
  if (errors.length > 0) {
    job.status = "failed";
    job.error = `Canonical validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`;
    job.completedAt = now();
    addLog(job.id, "error", `Blocked by canonical validation: ${job.error}`);
    void persistJob(job);
    return job;
  }
  addLog(job.id, "info", `Canonical profile validated (hash: ${canonicalProfile.identityHash})`);

  try {
    const adapter = createAdapter({
      provider: job.provider,
      credentials: await getCredentials(job.userId, job.provider),
      syncFrequency: "manual",
      enabled: true,
      options: {},
    });

    const result = await adapter.pushBusiness(job.businessData);
    job.result = result;
    job.status = result.success ? "completed" : "failed";
    job.completedAt = now();

    if (result.success) {
      addLog(job.id, "info", `Sync completed. Fields: ${result.syncedFields.join(", ")}`);
    } else {
      addLog(job.id, "error", `Sync failed: ${result.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`);
    }
  } catch (err: any) {
    job.error = err.message;
    job.status = "failed";
    job.completedAt = now();
    addLog(job.id, "error", `Exception: ${err.message}`);
  }

  void persistJob(job);
  return job;
}

/** Retry a failed job */
export async function retryJob(jobId: string): Promise<SyncJob> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error(`SyncJob not found: ${jobId}`);
  if (job.retryCount >= job.maxRetries) throw new Error("Max retries exceeded");

  job.retryCount++;
  job.status = "queued";
  job.error = null;
  job.result = null;
  job.startedAt = null;
  job.completedAt = null;
  addLog(job.id, "info", `Retry #${job.retryCount} queued`);

  return executeJob(jobId);
}

/** Cancel a queued job */
export function cancelJob(jobId: string): SyncJob {
  const job = jobStore.get(jobId);
  if (!job) throw new Error(`SyncJob not found: ${jobId}`);
  if (job.status !== "queued") throw new Error(`Can only cancel queued jobs, got: ${job.status}`);
  job.status = "cancelled";
  job.completedAt = now();
  addLog(job.id, "info", "Job cancelled");
  void persistJob(job);
  return job;
}

/** Get job by ID */
export function getJob(jobId: string): SyncJob | undefined {
  return jobStore.get(jobId);
}

/** List jobs for a user, optionally filtered by provider/status */
export function listJobs(opts: {
  userId: string;
  provider?: AggregatorProvider;
  status?: SyncJobStatus;
}): SyncJob[] {
  return Array.from(jobStore.values()).filter(
    (j) =>
      j.userId === opts.userId &&
      (!opts.provider || j.provider === opts.provider) &&
      (!opts.status || j.status === opts.status)
  );
}

/** Get logs for a job */
export function getJobLogs(jobId: string): SyncJobLog[] {
  return logStore.get(jobId) ?? [];
}

/** Sync to ALL enabled providers at once */
export async function syncAllProviders(
  userId: string,
  businessData: CanonicalBusinessData,
  providers: Array<{ provider: AggregatorProvider; credentials: Record<string, string> }>
): Promise<SyncJob[]> {
  const jobs = providers.map((p) =>
    queueSyncJob({
      userId,
      provider: p.provider,
      credentials: p.credentials,
      businessData,
    })
  );

  await Promise.allSettled(jobs.map((j) => executeJob(j.id)));
  return jobs;
}

// ─── Internal ────────────────────────────────────────────────────────────

function addLog(jobId: string, level: SyncJobLog["level"], message: string, metadata: Record<string, unknown> = {}) {
  const logs = logStore.get(jobId) ?? [];
  logs.push({ id: uuid(), jobId, level, message, timestamp: now(), metadata });
  logStore.set(jobId, logs);
  void persistLog(jobId, level, message, metadata);
}

/** Fetch credentials from Supabase aggregator config */
async function getCredentials(userId: string, provider: AggregatorProvider): Promise<Record<string, string>> {
  const supabase = await getSupabase();
  if (!supabase) return {};

  try {
    const { data } = await supabase
      .from("aggregator_user_configs")
      .select("credentials")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("enabled", true)
      .single();

    return data?.credentials ?? {};
  } catch {
    return {};
  }
}
