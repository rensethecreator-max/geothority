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

  const countEvent = async (eventName: string) => {
    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", eventName)
      .gte("created_at", since)
      .not("user_id", "is", null);
    return count ?? 0;
  };

  const registered = await countEvent("user_registered");
  const onboarded = await countEvent("onboarding_completed");
  const subscribed = await countEvent("subscription_started");

  return NextResponse.json({
    range: days,
    since,
    funnel: [
      { stage: "Registered", count: registered, conversionRate: 100 },
      {
        stage: "Onboarded",
        count: onboarded,
        conversionRate: registered > 0 ? Math.round((onboarded / registered) * 100) : 0,
      },
      {
        stage: "Subscribed",
        count: subscribed,
        conversionRate: registered > 0 ? Math.round((subscribed / registered) * 100) : 0,
      },
    ],
  });
}
