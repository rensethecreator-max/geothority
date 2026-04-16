import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/cron/gbp-monitor
 * Weekly cron job — scan all active GBP monitors.
 * Secure with CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // Get all active monitors due for a weekly scan
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: monitors, error } = await supabase
      .from("gbp_monitors")
      .select("*")
      .eq("active", true)
      .or(`last_scanned.is.null,last_scanned.lt.${weekAgo}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let processed = 0;
    let failed = 0;

    for (const monitor of monitors || []) {
      try {
        if (!apiKey) {
          // No API key — create a placeholder snapshot
          await supabase.from("gbp_monitor_snapshots").insert({
            monitor_id: monitor.id,
            rating: null,
            review_count: null,
            competitor_data: null,
            scanned_at: new Date().toISOString(),
          });
        } else {
          const query = monitor.place_id
            ? `https://maps.googleapis.com/maps/api/place/details/json?place_id=${monitor.place_id}&fields=name,rating,user_ratings_total&key=${apiKey}`
            : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${monitor.business_name} ${monitor.city} ${monitor.state}`)}&key=${apiKey}`;

          const res = await fetch(query, { signal: AbortSignal.timeout(10000) });
          const data = (await res.json()) as {
            result?: { rating?: number; user_ratings_total?: number };
            results?: { rating?: number; user_ratings_total?: number }[];
          };
          const place = data.result || data.results?.[0];

          await supabase.from("gbp_monitor_snapshots").insert({
            monitor_id: monitor.id,
            rating: place?.rating || null,
            review_count: place?.user_ratings_total || null,
            competitor_data: null,
            scanned_at: new Date().toISOString(),
          });

          // Check for rating drops vs previous snapshot
          const prevRes = await supabase
            .from("gbp_monitor_snapshots")
            .select("rating, review_count")
            .eq("monitor_id", monitor.id)
            .order("scanned_at", { ascending: false })
            .limit(2);

          const snapshots = prevRes.data || [];
          if (snapshots.length >= 2 && place?.rating) {
            const prev = snapshots[1];
            if (prev.rating && place.rating < prev.rating - 0.2) {
              await supabase.from("gbp_alerts").insert({
                monitor_id: monitor.id,
                user_id: monitor.user_id,
                alert_type: "rating_drop",
                message: `Rating dropped from ${prev.rating} to ${place.rating}`,
                data: { previous: prev.rating, current: place.rating },
                read: false,
              });
            }
          }
        }

        await supabase
          .from("gbp_monitors")
          .update({ last_scanned: new Date().toISOString() })
          .eq("id", monitor.id);

        processed++;
      } catch (err) {
        console.error(`Failed to scan monitor ${monitor.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: (monitors || []).length,
    });
  } catch (err) {
    console.error("GBP cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
