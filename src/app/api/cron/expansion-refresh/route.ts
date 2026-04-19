import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ExpansionManager } from "@/lib/smart-expansion";

/**
 * POST /api/cron/expansion-refresh
 * Cron endpoint: re-scores all active expansion targets for all users.
 * Called periodically (e.g. weekly) to keep impact scores fresh.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabase();
  const manager = new ExpansionManager(supabase);

  // Get distinct users with expansion targets
  const { data: users, error } = await supabase
    .from("expansion_targets")
    .select("user_id")
    .not("status", "in", '("completed","deprioritized")');

  if (error || !users || users.length === 0) {
    return NextResponse.json({ refreshed: 0, message: "No active targets" });
  }

  const distinctUsers = Array.from(new Set(users.map((u: any) => u.user_id)));
  let totalRefreshed = 0;

  for (const userId of distinctUsers) {
    try {
      const updated = await manager.refreshScores(userId);
      totalRefreshed += updated;
    } catch (e) {
      console.error(`Failed to refresh expansion scores for user ${userId}:`, e);
    }
  }

  return NextResponse.json({
    refreshed: totalRefreshed,
    users: distinctUsers.length,
    timestamp: new Date().toISOString(),
  });
}
