/**
 * SyncJob Pipeline — Orchestrates pushing canonical business data to aggregators
 * Handles queueing, execution, retries, logging, and result tracking.
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

// ─── In-memory job store (swap for DB in production) ─────────────────────
const jobStore = new Map<string, SyncJob>();
const logStore = new Map<string, SyncJobLog[]>();

function now(): string {
  return new Date().toISOString();
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

  // ── Canonical Identity Pre-Sync Validation (Honesty Layer) ───────
  // Normalize + validate business data before pushing to aggregators.
  // Never push stale/invalid data.
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
    return job;
  }
  addLog(job.id, "info", `Canonical profile validated (hash: ${canonicalProfile.identityHash}), confidence fields: ${canonicalProfile.businessName}, ${canonicalProfile.phone}`);
  // ── End Pre-Sync Validation ─────────────────────────────────────

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

  const results = await Promise.allSettled(jobs.map((j) => executeJob(j.id)));
  return jobs;
}

// ─── Internal ────────────────────────────────────────────────────────────

function addLog(jobId: string, level: SyncJobLog["level"], message: string, metadata: Record<string, unknown> = {}) {
  const logs = logStore.get(jobId) ?? [];
  logs.push({ id: uuid(), jobId, level, message, timestamp: now(), metadata });
  logStore.set(jobId, logs);
}

/** Stub: In production, fetch encrypted credentials from DB or vault */
async function getCredentials(_userId: string, _provider: AggregatorProvider): Promise<Record<string, string>> {
  // Will be replaced with DB lookup via Supabase
  return {};
}
