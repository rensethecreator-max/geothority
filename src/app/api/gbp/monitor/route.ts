import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAutomationPolicy, isAutoAllowed } from "@/lib/automation-policies";

// GET /api/gbp/monitor — list monitors for current user
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: monitors, error } = await supabase
      .from("gbp_monitors")
      .select("*, gbp_alerts(id, alert_type, message, read, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ monitors: monitors || [] });
  } catch (err) {
    console.error("GBP monitor GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/gbp/monitor — create a new monitor
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { businessName, placeId, city, state, scanFrequency, isAutoAction = false } = await req.json();

    if (isAutoAction) {
      const policy = await getAutomationPolicy(user.id, "gbp_actions");
      if (!isAutoAllowed(policy)) {
        return NextResponse.json(
          { error: "Automation policy blocks automatic GBP actions for this account." },
          { status: 403 }
        );
      }
    }

    if (!businessName || !city || !state) {
      return NextResponse.json(
        { error: "businessName, city, and state are required" },
        { status: 400 }
      );
    }

    const { data: monitor, error } = await supabase
      .from("gbp_monitors")
      .insert({
        user_id: user.id,
        business_name: businessName,
        place_id: placeId || null,
        city,
        state,
        scan_frequency: scanFrequency || "weekly",
        active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Trigger initial scan
    await triggerMonitorScan(monitor.id, user.id, businessName, placeId, city, state, supabase);

    return NextResponse.json({ monitor });
  } catch (err) {
    console.error("GBP monitor POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/gbp/monitor — delete a monitor
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const monitorId = searchParams.get("id");

    if (!monitorId) return NextResponse.json({ error: "Monitor ID required" }, { status: 400 });

    const isAutoAction = searchParams.get("isAutoAction") === "true";
    if (isAutoAction) {
      const policy = await getAutomationPolicy(user.id, "gbp_actions");
      if (!isAutoAllowed(policy)) {
        return NextResponse.json(
          { error: "Automation policy blocks automatic GBP actions for this account." },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from("gbp_monitors")
      .delete()
      .eq("id", monitorId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("GBP monitor DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabase>>;

async function triggerMonitorScan(
  monitorId: string,
  userId: string,
  businessName: string,
  placeId: string | undefined,
  city: string,
  state: string,
  supabase: SupabaseClient
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return;

  try {
    const query = placeId
      ? `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${businessName} ${city} ${state}`)}&key=${apiKey}`;

    const res = await fetch(query, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as {
      result?: { rating?: number; user_ratings_total?: number };
      results?: { rating?: number; user_ratings_total?: number }[];
    };

    const place = data.result || data.results?.[0];
    if (!place) return;

    // Save snapshot
    await supabase.from("gbp_monitor_snapshots").insert({
      monitor_id: monitorId,
      rating: place.rating || null,
      review_count: place.user_ratings_total || null,
      competitor_data: null,
      scanned_at: new Date().toISOString(),
    });

    // Update last_scanned
    await supabase
      .from("gbp_monitors")
      .update({ last_scanned: new Date().toISOString() })
      .eq("id", monitorId);

    // Check for alerts (rating drop, review milestone)
    const prevSnapshot = await supabase
      .from("gbp_monitor_snapshots")
      .select("rating, review_count")
      .eq("monitor_id", monitorId)
      .order("scanned_at", { ascending: false })
      .limit(2);

    const snapshots = prevSnapshot.data || [];
    if (snapshots.length >= 2) {
      const prev = snapshots[1];
      if (place.rating && prev.rating && place.rating < prev.rating - 0.2) {
        await supabase.from("gbp_alerts").insert({
          monitor_id: monitorId,
          user_id: userId,
          alert_type: "rating_drop",
          message: `Rating dropped from ${prev.rating} to ${place.rating}`,
          data: { previous: prev.rating, current: place.rating },
          read: false,
        });
      }
      if (place.user_ratings_total && prev.review_count) {
        const newReviews = place.user_ratings_total - prev.review_count;
        if (newReviews >= 5) {
          await supabase.from("gbp_alerts").insert({
            monitor_id: monitorId,
            user_id: userId,
            alert_type: "new_reviews",
            message: `${newReviews} new reviews received`,
            data: { newReviews, total: place.user_ratings_total },
            read: false,
          });
        }
      }
    }
  } catch (err) {
    console.error("Monitor scan error:", err);
  }
}
