import { NextRequest, NextResponse } from "next/server";
import { completeStep, skipStep, verifyFix, verifyAllFixes, getFixExecutionStatus } from "@/lib/fix-engine/executor";

/** POST body: { planId, stepId, action: "complete" | "skip" } */
export async function POST(request: NextRequest) {
  try {
    const { planId, stepId, action } = await request.json();
    if (!planId || !stepId || !action) {
      return NextResponse.json({ error: "planId, stepId, and action required" }, { status: 400 });
    }

    if (action === "complete") {
      const plan = completeStep(planId, stepId);
      return NextResponse.json(plan);
    } else if (action === "skip") {
      const plan = skipStep(planId, stepId);
      return NextResponse.json(plan);
    } else {
      return NextResponse.json({ error: "action must be 'complete' or 'skip'" }, { status: 400 });
    }
  } catch (err) {
    console.error("Fix engine step error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST /api/fix-engine/verify — { planId, stepId?, scoreBefore, scoreAfter, layerScoresBefore?, layerScoresAfter? } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    // Bulk verify
    if (body.layerScoresBefore && body.layerScoresAfter) {
      const results = verifyAllFixes(planId, body.layerScoresBefore, body.layerScoresAfter);
      const plan = getFixExecutionStatus(planId);
      return NextResponse.json({ results, plan });
    }

    // Single step verify
    const { stepId, scoreBefore, scoreAfter } = body;
    if (!stepId || scoreBefore === undefined || scoreAfter === undefined) {
      return NextResponse.json(
        { error: "stepId, scoreBefore, and scoreAfter required (or layerScoresBefore/After for bulk)" },
        { status: 400 }
      );
    }

    const result = verifyFix(planId, stepId, scoreBefore, scoreAfter);
    const plan = getFixExecutionStatus(planId);
    return NextResponse.json({ result, plan });
  } catch (err) {
    console.error("Fix engine verify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
