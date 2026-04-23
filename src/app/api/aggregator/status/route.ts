/**
 * GET /api/aggregator/status — Combined status overview
 *
 * Returns connection health + most recent sync job status per provider,
 * giving the UI a single endpoint for a dashboard summary card.
 */

import { NextRequest, NextResponse } from "next/server";
import { healthCheckAll, getUserConfig } from "@/lib/aggregator/config-service";
import { listJobs } from "@/lib/aggregator/sync-job";
import type { AggregatorProvider, SyncJob } from "@/lib/aggregator/types";

import { getAuthUser } from "@/lib/auth-helpers";

const ALL_PROVIDERS: AggregatorProvider[] = ["semrush", "vendasta", "yext"];

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;

  const [providerHealth, config] = await Promise.all([
    healthCheckAll(userId),
    getUserConfig(userId),
  ]);

  // Gather latest sync job per provider
  const recentJobs: Record<string, SyncJob | null> = {};
  for (const provider of ALL_PROVIDERS) {
    const jobs = listJobs({ userId, provider });
    // Most recent first (by queuedAt descending)
    const sorted = jobs.sort(
      (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
    );
    recentJobs[provider] = sorted[0] ?? null;
  }

  // Build per-provider summary
  const providers = ALL_PROVIDERS.map((provider) => {
    const provConfig = config.providers.find((p) => p.provider === provider);
    const lastJob = recentJobs[provider];
    return {
      provider,
      configured: !!provConfig,
      enabled: provConfig?.enabled ?? false,
      health: providerHealth[provider],
      syncFrequency: provConfig?.syncFrequency ?? config.globalSyncFrequency,
      lastSync: lastJob
        ? {
            jobId: lastJob.id,
            status: lastJob.status,
            queuedAt: lastJob.queuedAt,
            completedAt: lastJob.completedAt,
            error: lastJob.error,
            syncedFields: lastJob.result?.syncedFields ?? [],
          }
        : null,
    };
  });

  const configuredCount = providers.filter((p) => p.configured).length;
  const healthyCount = providers.filter((p) => p.health === "ok").length;
  const overallStatus =
    configuredCount === 0
      ? "no_providers"
      : healthyCount === configuredCount
        ? "healthy"
        : healthyCount > 0
          ? "partial"
          : "unhealthy";

  return NextResponse.json({
    overallStatus,
    configuredCount,
    healthyCount,
    totalProviders: ALL_PROVIDERS.length,
    globalSyncFrequency: config.globalSyncFrequency,
    autoSync: config.autoSync,
    providers,
  });
}
