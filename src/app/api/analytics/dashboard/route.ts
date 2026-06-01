import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function buildDayMap(since: string, days: number) {
  const map = new Map<string, Set<string>>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(since);
    date.setDate(date.getDate() + offset);
    map.set(date.toISOString().split("T")[0], new Set<string>());
  }
  return map;
}

function countDistinctActors(rows: Array<{ user_id?: string | null; session_id?: string | null }>) {
  const distinctActors = new Set<string>();
  for (const row of rows) {
    const actorId = row.user_id ?? row.session_id;
    if (actorId) distinctActors.add(actorId);
  }
  return distinctActors.size;
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
    // Total events
    const { count: totalEvents } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);

    // New signups
    const { data: signupRows } = await supabase
      .from("analytics_events")
      .select("user_id, session_id")
      .in("event_name", ["user_registered", "signup_completed"])
      .gte("created_at", since);
    const newSignups = countDistinctActors((signupRows ?? []) as Array<{ user_id?: string | null; session_id?: string | null }>);

    // Daily active users (fallback computed from analytics_events rather than RPC)
    const { data: dauRows } = await supabase
      .from("analytics_events")
      .select("created_at, user_id, session_id")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);

    const dauMap = buildDayMap(since, days);
    for (const row of (dauRows ?? []) as any[]) {
      const day = row.created_at?.split("T")[0];
      if (!day || !dauMap.has(day)) continue;
      const actorId = row.user_id ?? row.session_id ?? `anon:${day}`;
      dauMap.get(day)?.add(actorId);
    }
    const dau = Array.from(dauMap.entries()).map(([day, actors]) => ({
      day,
      dau: actors.size,
    }));

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

    // Revenue from daily_metrics if the table exists; otherwise return an empty series
    const { data: revenueData, error: revenueError } = await supabase
      .from("daily_metrics")
      .select("date, value")
      .eq("metric", "revenue_cents")
      .gte("date", since)
      .order("date", { ascending: true });

    const revenue = (revenueError ? [] : (revenueData ?? [])).map((r: any) => ({
      date: r.date,
      revenue_cents: r.value,
    }));

    return NextResponse.json({
      range: days,
      since,
      dau,
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
