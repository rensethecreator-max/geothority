import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ExpansionManager } from "@/lib/smart-expansion";

/**
 * POST /api/expansion/actions/complete
 * Mark a suggested action as completed for an expansion target.
 * Body: { targetId, actionIndex, result? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetId, actionIndex, result } = await req.json();
  if (!targetId || actionIndex == null) {
    return NextResponse.json({ error: "targetId and actionIndex required" }, { status: 400 });
  }

  const manager = new ExpansionManager(supabase);

  // Verify ownership
  const targets = await manager.getTargets(user.id);
  if (!targets.some(t => t.id === targetId)) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const progress = await manager.completeAction(targetId, actionIndex, result);
  return NextResponse.json(progress);
}
