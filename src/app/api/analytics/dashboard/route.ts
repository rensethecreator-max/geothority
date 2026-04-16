import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rangeStr = url.searchParams.get("range");
  const days = rangeStr === "90" ? 90 : rangeStr === "30" ? 30 : 7;
  const since = daysAgo(days);

  const supabase = createServiceClient();

  try {
    // Daily active users
    const { data: dauData } = await supabase
      .rpc("analytics_dau", { since_date: since })
      .select();

    // Total events
    const { count: totalEvents } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);

    // New signups
    const { count: newSignups } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "user_registered")
      .gte("created_at", since);

    // Top events
    const { data: topEventsData } = await supabase
      .from("analytics_events")
      .select("event_name")
      .gte("created_at", since)
      .limit(1000);

    // Aggregate top events client-side
    const eventCounts: Record<string, number> = {};
    for (const row of (topEventsData ?? []) as any[]) {
      eventCounts[row.event_name] = (eventCounts[row.event_name] ?? 0) + 1;
    }
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event_name, count]) => ({ event_name, count }));

    // Page views per day (simplified)
    const { data: pageViewData } = await supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_name", "page_view")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    const pageViewsByDay: Record<string, number> = {};
    for (const row of (pageViewData ?? []) as any[]) {
      const day = row.created_at?.split("T")[0] ?? "";
      if (day) pageViewsByDay[day] = (pageViewsByDay[day] ?? 0) + 1;
    }
    const pageViews = Object.entries(pageViewsByDay).map(([day, views]) => ({ day, views }));

    // Revenue from daily_metrics
    const { data: revenueData } = await supabase
      .from("daily_metrics")
      .select("date, value")
      .eq("metric", "revenue_cents")
      .gte("date", since)
      .order("date", { ascending: true });

    const revenue = (revenueData ?? []).map((r: any) => ({
      date: r.date,
      revenue_cents: r.value,
    }));

    return NextResponse.json({
      range: days,
      since,
      dau: [],
      pageViews,
      topEvents,
      totalEvents: totalEvents ?? 0,
      newSignups: newSignups ?? 0,
      revenue,
    });
  } catch (err: any) {
    console.error("[analytics] dashboard error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
