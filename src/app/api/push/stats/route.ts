import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rangeStr = url.searchParams.get("range");
  const days = rangeStr === "30" ? 30 : rangeStr === "90" ? 90 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceClient();

  const { data: statusData } = await supabase
    .from("push_notification_log")
    .select("status")
    .gte("sent_at", since);

  const statusCounts: Record<string, number> = {};
  for (const row of statusData ?? []) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  const totalSent = Object.entries(statusCounts)
    .filter(([s]) => s !== "failed")
    .reduce((acc, [, c]) => acc + c, 0);
  const totalClicked = statusCounts["clicked"] ?? 0;

  const { count: activeSubs } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    range: days,
    activeSubscriptions: activeSubs ?? 0,
    totalSent,
    totalClicked,
    ctr: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100 * 10) / 10 : 0,
    statusBreakdown,
    dailySends: [],
  });
}
