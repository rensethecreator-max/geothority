import { NextRequest, NextResponse } from "next/server";
import { executeFixPackage, getFixExecutionStatus } from "@/lib/fix-engine/executor";

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const plan = await executeFixPackage(planId);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("Fix engine execute error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json({ error: "planId required" }, { status: 400 });
  }

  const plan = getFixExecutionStatus(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}
