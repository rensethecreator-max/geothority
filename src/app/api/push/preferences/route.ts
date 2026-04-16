import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_push_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json({
      userId: user.id,
      enabled: true,
      categoryProductUpdates: true,
      categoryJourney: true,
      categoryAlerts: true,
      categoryDigest: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      maxPerDay: 5,
      timezone: "America/New_York",
    });
  }

  return NextResponse.json({
    userId: data.user_id,
    enabled: data.enabled !== false && data.enabled !== 0,
    categoryProductUpdates: data.category_product_updates !== false && data.category_product_updates !== 0,
    categoryJourney: data.category_journey !== false && data.category_journey !== 0,
    categoryAlerts: data.category_alerts !== false && data.category_alerts !== 0,
    categoryDigest: data.category_digest !== false && data.category_digest !== 0,
    quietHoursStart: data.quiet_hours_start ?? null,
    quietHoursEnd: data.quiet_hours_end ?? null,
    maxPerDay: data.max_per_day ?? 5,
    timezone: data.timezone ?? "America/New_York",
  });
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const {
    enabled, categoryProductUpdates, categoryJourney, categoryAlerts,
    categoryDigest, quietHoursStart, quietHoursEnd, maxPerDay, timezone,
  } = body;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_push_preferences")
    .upsert({
      user_id: user.id,
      enabled: enabled !== false && enabled !== 0 ? true : false,
      category_product_updates: categoryProductUpdates !== false ? true : false,
      category_journey: categoryJourney !== false ? true : false,
      category_alerts: categoryAlerts !== false ? true : false,
      category_digest: categoryDigest !== false ? true : false,
      quiet_hours_start: quietHoursStart ?? null,
      quiet_hours_end: quietHoursEnd ?? null,
      max_per_day: maxPerDay ?? 5,
      timezone: timezone ?? "America/New_York",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
