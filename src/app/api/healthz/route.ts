import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Liveness check for the hosting platform; dependency readiness is /api/health. */
export async function GET() {
  return NextResponse.json({ status: "alive", timestamp: new Date().toISOString() });
}
