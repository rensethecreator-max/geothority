import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { ExpansionManager } from "@/lib/smart-expansion";

/**
 * GET /api/expansion/dashboard
 * Returns expansion dashboard summary for the current user.
 */
export async function GET(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const supabase = await createServerSupabase();
  const manager = new ExpansionManager(supabase);
  const dashboard = await manager.getDashboard(gate.user.id);

  return NextResponse.json(dashboard);
}
