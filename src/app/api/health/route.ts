import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getKeysSummary } from "@/lib/api-key-check";

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

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
