import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  completeStep,
  skipStep,
  verifyFix,
  verifyAllFixes,
  getFixExecutionStatus,
} from "@/lib/fix-engine/executor";

async function getUserId() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** POST body: { planId, stepId, action: "complete" | "skip" } */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, stepId, action } = await request.json();
    if (!planId || !stepId || !action) {
      return NextResponse.json({ error: "planId, stepId, and action required" }, { status: 400 });
    }

    if (action === "complete") {
      const plan = await completeStep(planId, stepId, userId);
      return NextResponse.json(plan);
    }

    if (action === "skip") {
      const plan = await skipStep(planId, stepId, userId);
      return NextResponse.json(plan);
    }

    return NextResponse.json({ error: "action must be 'complete' or 'skip'" }, { status: 400 });
  } catch (err) {
    console.error("Fix engine step error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/** PUT /api/fix-engine/step — verification */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    if (body.layerScoresBefore && body.layerScoresAfter) {
      const results = await verifyAllFixes(
        planId,
        body.layerScoresBefore,
        body.layerScoresAfter,
        userId
      );
      const plan = await getFixExecutionStatus(planId, userId);
      return NextResponse.json({ results, plan });
    }

    const { stepId, scoreBefore, scoreAfter } = body;
    if (!stepId || scoreBefore === undefined || scoreAfter === undefined) {
      return NextResponse.json(
        { error: "stepId, scoreBefore, and scoreAfter required (or layerScoresBefore/After for bulk)" },
        { status: 400 }
      );
    }

    const result = await verifyFix(planId, stepId, scoreBefore, scoreAfter, userId);
    const plan = await getFixExecutionStatus(planId, userId);
    return NextResponse.json({ result, plan });
  } catch (err) {
    console.error("Fix engine verify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
