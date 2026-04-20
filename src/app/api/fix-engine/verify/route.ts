import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { autoVerifyPlan, getFixExecutionStatus } from "@/lib/fix-engine/executor";

async function getUserId() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * POST /api/fix-engine/verify
 * Body: { planId, afterScanId? }
 * Triggers automated post-fix verification by comparing original scan layer scores
 * against a newer scan's scores.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, afterScanId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const verification = await autoVerifyPlan(planId, userId, afterScanId);
    const plan = await getFixExecutionStatus(planId, userId);
    return NextResponse.json({ verification, plan });
  } catch (err) {
    console.error("Fix engine auto-verify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fix-engine/verify?planId=...
 * Returns the current verification state for a plan.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = request.nextUrl.searchParams.get("planId");
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const plan = await getFixExecutionStatus(planId, userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ verification: plan.verification ?? null, plan });
  } catch (err) {
    console.error("Fix engine verify status error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
