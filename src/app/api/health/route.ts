import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 * Basic health check: DB connectivity, API status, version.
 */
export async function GET() {
  const checks: Record<string, string> = {
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

  // Check if critical env vars are set (don't leak values)
  checks.supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    ? "yes"
    : "no";
  checks.stripeConfigured = !!process.env.STRIPE_SECRET_KEY ? "yes" : "no";
  checks.googleMapsConfigured = !!process.env.GOOGLE_MAPS_API_KEY
    ? "yes"
    : "no";
  checks.openaiConfigured = !!process.env.OPENAI_API_KEY ? "yes" : "no";
  checks.resendConfigured = !!process.env.RESEND_API_KEY ? "yes" : "no";

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
