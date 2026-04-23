/**
 * GET /api/aggregator/health — Health check across all configured providers
 */

import { NextRequest, NextResponse } from "next/server";
import { healthCheckAll } from "@/lib/aggregator/config-service";

import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  const status = await healthCheckAll(userId);
  const allOk = Object.values(status).every((s) => s === "ok" || s === "not_configured");
  return NextResponse.json({ status: allOk ? "healthy" : "issues", providers: status });
}
