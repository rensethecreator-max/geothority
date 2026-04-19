import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { ExpansionManager } from "@/lib/smart-expansion";

/**
 * GET /api/expansion/targets?type=city|service|niche_directory&status=identified
 * List expansion targets for the current user.
 */
export async function GET(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const supabase = await createServerSupabase();
  const manager = new ExpansionManager(supabase);

  const type = req.nextUrl.searchParams.get("type") as "city" | "service" | "niche_directory" | null;
  const targets = await manager.getTargets(gate.user.id, type ?? undefined);

  return NextResponse.json({ targets, total: targets.length });
}

/**
 * PATCH /api/expansion/targets
 * Update a target's status.
 * Body: { targetId, status }
 */
export async function PATCH(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const { targetId, status } = await req.json();
  if (!targetId || !status) {
    return NextResponse.json({ error: "targetId and status required" }, { status: 400 });
  }

  const validStatuses = ["identified", "researching", "ready", "in_progress", "completed", "deprioritized"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const manager = new ExpansionManager(supabase);
  const updated = await manager.updateStatus(targetId, status);

  return NextResponse.json(updated);
}

/**
 * DELETE /api/expansion/targets?targetId=xxx
 */
export async function DELETE(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const targetId = req.nextUrl.searchParams.get("targetId");
  if (!targetId) {
    return NextResponse.json({ error: "targetId required" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const manager = new ExpansionManager(supabase);
  await manager.deleteTarget(targetId);

  return NextResponse.json({ ok: true });
}
