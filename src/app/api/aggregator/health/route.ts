/**
 * GET /api/aggregator/health — Health check across all configured providers
 */

import { NextRequest, NextResponse } from "next/server";
import { healthCheckAll } from "@/lib/aggregator/config-service";

function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id") ?? "anonymous";
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const status = await healthCheckAll(userId);
  const allOk = Object.values(status).every((s) => s === "ok" || s === "not_configured");
  return NextResponse.json({ status: allOk ? "healthy" : "issues", providers: status });
}
