import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Readiness check. It never returns configuration values or provider errors. */
export async function GET() {
  let database = "unavailable";

  try {
    const supabase = createServiceClient();
    if (supabase) {
      const { error } = await supabase.from("scans").select("id").limit(1);
      if (!error) database = "connected";
    }
  } catch (error) {
    console.error("Readiness database check failed", error);
  }

  const ready = database === "connected";
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      database,
      version: process.env.npm_package_version || "0.1.0",
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
