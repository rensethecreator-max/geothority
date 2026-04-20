import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildExecutionPlan } from "@/lib/fix-engine/executor";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId, mode } = await request.json();
    if (!scanId || !mode) {
      return NextResponse.json({ error: "scanId and mode required" }, { status: 400 });
    }

    if (!["AUTO", "ASSISTED", "GUIDED"].includes(mode)) {
      return NextResponse.json({ error: "mode must be AUTO, ASSISTED, or GUIDED" }, { status: 400 });
    }

    // Fetch existing fix package
    const { data: fixPkg, error } = await supabase
      .from("fix_packages")
      .select("fixes")
      .eq("scan_id", scanId)
      .eq("user_id", user.id)
      .single();

    if (error || !fixPkg) {
      return NextResponse.json({ error: "No fix package found. Run fix-all first." }, { status: 404 });
    }

    // Capture layer scores from the original scan for later verification
    let layerScoresBefore: Record<string, number> | undefined;
    const { data: scanRow } = await supabase
      .from("scans")
      .select("layer_scores")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();
    if (scanRow?.layer_scores) {
      layerScoresBefore = scanRow.layer_scores as Record<string, number>;
    }

    const plan = await buildExecutionPlan(user.id, scanId, mode, fixPkg.fixes, layerScoresBefore);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("Fix engine plan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
