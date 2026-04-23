/**
 * GET  /api/aggregator/sync          — List sync jobs
 * POST /api/aggregator/sync          — Queue a new sync job
 * POST /api/aggregator/sync/all      — Sync to all enabled providers
 */

import { NextRequest, NextResponse } from "next/server";
import {
  queueSyncJob,
  executeJob,
  retryJob,
  cancelJob,
  getJob,
  listJobs,
  syncAllProviders,
} from "@/lib/aggregator/sync-job";
import type { AggregatorProvider, CanonicalBusinessData } from "@/lib/aggregator/types";

import { getAuthUser } from "@/lib/auth-helpers";

/** GET — List jobs or get a specific job */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (jobId) {
    const job = getJob(jobId);
    if (!job || job.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job);
  }

  const provider = searchParams.get("provider") as AggregatorProvider | null;
  const status = searchParams.get("status") as any;
  const jobs = listJobs({ userId, provider: provider ?? undefined, status: status ?? undefined });
  return NextResponse.json(jobs);
}

/** POST — Queue, execute, retry, or cancel a sync job */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  const body = await req.json();

  // Sync to all providers
  if (body.action === "sync_all") {
    const { businessData, providers } = body as {
      businessData: CanonicalBusinessData;
      providers: Array<{ provider: AggregatorProvider; credentials: Record<string, string> }>;
    };
    const jobs = await syncAllProviders(userId, businessData, providers);
    return NextResponse.json(jobs);
  }

  // Execute a queued job
  if (body.action === "execute") {
    const { jobId } = body as { jobId: string };
    try {
      const job = await executeJob(jobId);
      return NextResponse.json(job);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Retry a failed job
  if (body.action === "retry") {
    const { jobId } = body as { jobId: string };
    try {
      const job = await retryJob(jobId);
      return NextResponse.json(job);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Cancel a queued job
  if (body.action === "cancel") {
    const { jobId } = body as { jobId: string };
    try {
      const job = cancelJob(jobId);
      return NextResponse.json(job);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Default: queue a new job
  const { provider, credentials, businessData, maxRetries } = body as {
    provider: AggregatorProvider;
    credentials: Record<string, string>;
    businessData: CanonicalBusinessData;
    maxRetries?: number;
  };

  const job = queueSyncJob({ userId, provider, credentials, businessData, maxRetries });

  // Auto-execute if requested
  if (body.autoExecute) {
    const executed = await executeJob(job.id);
    return NextResponse.json(executed);
  }

  return NextResponse.json(job, { status: 202 });
}
