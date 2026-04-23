/**
 * GET  /api/aggregator/sync/[jobId]       — Get job detail + logs
 * POST /api/aggregator/sync/[jobId]       — Execute | retry | cancel a job
 */

import { NextRequest, NextResponse } from "next/server";
import { getJob, getJobLogs, executeJob, retryJob, cancelJob } from "@/lib/aggregator/sync-job";

import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Authorization: only own jobs
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  if (job.userId !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = getJobLogs(jobId);
  return NextResponse.json({ job, logs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.userId !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const action = body.action as string;

  try {
    switch (action) {
      case "execute":
        return NextResponse.json(await executeJob(jobId));
      case "retry":
        return NextResponse.json(await retryJob(jobId));
      case "cancel":
        return NextResponse.json(cancelJob(jobId));
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
