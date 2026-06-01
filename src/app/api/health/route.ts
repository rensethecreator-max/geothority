import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getKeysSummary } from "@/lib/api-key-check";
import { getReputationTransportDiagnostics } from "@/lib/reputation/diagnostics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health
 * Basic health check: DB connectivity, API key status, version.
 */
export async function GET() {
  const checks: Record<string, string | object> = {
    status: "ok",
    version: process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  };

  // Check Supabase DB connectivity
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("scans").select("id").limit(1);
    checks.database = error ? `error: ${error.message}` : "connected";
    if (error) {
      checks.status = "degraded";
    }
  } catch (e: any) {
    checks.database = `error: ${e.message}`;
    checks.status = "degraded";
  }

  // API key status summary
  const keySummary = getKeysSummary();
  checks.apiKeys = {
    configured: `${keySummary.configured}/${keySummary.total}`,
    criticalMissing: keySummary.criticalMissing,
    recommendedMissing: keySummary.recommendedMissing,
  };

  if (keySummary.criticalMissing.length > 0) {
    checks.status = "degraded";
  }

  const reputation = getReputationTransportDiagnostics();
  checks.reputation = {
    mode: reputation.mode,
    validMode: reputation.validMode,
    ready: reputation.ready,
    activeTransport: reputation.activeTransport,
    callbacksReady: reputation.callbacksReady,
    queueReady: reputation.queueReady,
    automationReady: reputation.automationReady,
    missing: reputation.missing,
  };

  if (!reputation.validMode || (reputation.mode === "twilio" && !reputation.ready)) {
    checks.status = "degraded";
  }

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
