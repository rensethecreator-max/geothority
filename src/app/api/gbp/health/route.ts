import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/gbp/health — GBP connection health center
 * POST /api/gbp/health — Update connection state (refresh attempt, reconnect, etc.)
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ authenticated: false, connected: false }, { status: 200 });
    }

    const userId = session.user.id;
    const googleConnected = !!session.provider_token;
    const tokenExpiresAt = session.provider_token ? null : null; // Supabase doesn't expose token expiry directly

    // Get connection record
    const { data: connection } = await supabase
      .from("gbp_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get recent events (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events } = await supabase
      .from("gbp_connection_events")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    // Determine health
    let connectionStatus = "disconnected";
    let healthScore = 0;
    let needsReconnect = false;
    let issues: string[] = [];

    if (googleConnected) {
      connectionStatus = "connected";
      healthScore = 80;

      // Check for stale token
      if (connection?.consecutive_failures > 0) {
        connectionStatus = "refresh_failed";
        healthScore = Math.max(20, 80 - connection.consecutive_failures * 15);
        issues.push(`Token refresh has failed ${connection.consecutive_failures} time(s)`);
        needsReconnect = connection.consecutive_failures >= 3;
      }

      if (connection?.last_successful_refresh) {
        const daysSinceRefresh = (Date.now() - new Date(connection.last_successful_refresh).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceRefresh > 7) {
          healthScore = Math.min(healthScore, 60);
          issues.push(`Last successful refresh was ${Math.round(daysSinceRefresh)} days ago`);
        }
        if (daysSinceRefresh > 30) {
          healthScore = Math.min(healthScore, 30);
          needsReconnect = true;
          issues.push("Token may be expired — reconnect recommended");
        }
      } else {
        // First connection, no refresh history yet
        healthScore = 70;
        issues.push("No token refresh history yet — first sync will establish durability");
      }
    } else {
      if (connection?.connected_at) {
        // Was connected before, now disconnected
        connectionStatus = "expired";
        needsReconnect = true;
        issues.push("Google connection has been lost — please reconnect");
      }
      healthScore = 0;
    }

    // Update connection record
    if (googleConnected && connection) {
      await supabase
        .from("gbp_connections")
        .update({
          connection_status: connectionStatus,
          health_score: healthScore,
          needs_reconnect: needsReconnect,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else if (googleConnected && !connection) {
      // Create connection record
      await supabase
        .from("gbp_connections")
        .upsert({
          user_id: userId,
          connected_at: new Date().toISOString(),
          connection_status: "connected",
          health_score: 70,
          refresh_token_present: true,
          last_health_check: new Date().toISOString(),
        }, { onConflict: "user_id" });

      await supabase
        .from("gbp_connection_events")
        .insert({
          user_id: userId,
          event_type: "connect",
          event_detail: "Google account connected",
        });
    } else if (!googleConnected && connection?.connection_status === "connected") {
      // Token gone but record still says connected
      await supabase
        .from("gbp_connections")
        .update({
          connection_status: "expired",
          health_score: 0,
          needs_reconnect: true,
          last_error: "Provider token no longer available in session",
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    // Build response
    return NextResponse.json({
      connected: googleConnected,
      connectionStatus,
      healthScore,
      needsReconnect,
      issues,
      connection: connection ?? null,
      recentEvents: events ?? [],
      recommendations: buildHealthRecommendations(connectionStatus, healthScore, needsReconnect),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { eventType, eventDetail, errorMessage } = await req.json();

    if (!eventType) return NextResponse.json({ error: "eventType required" }, { status: 400 });

    // Log event
    await supabase.from("gbp_connection_events").insert({
      user_id: userId,
      event_type: eventType,
      event_detail: eventDetail || null,
      error_message: errorMessage || null,
    });

    // Update connection based on event
    const now = new Date().toISOString();
    if (eventType === "refresh_success") {
      await supabase.from("gbp_connections").upsert({
        user_id: userId,
        last_refresh_attempt: now,
        last_successful_refresh: now,
        consecutive_failures: 0,
        connection_status: "connected",
        health_score: 90,
        needs_reconnect: false,
        last_error: null,
        last_error_at: null,
        last_health_check: now,
        updated_at: now,
      }, { onConflict: "user_id" });
    } else if (eventType === "refresh_failure") {
      const { data: existing } = await supabase
        .from("gbp_connections")
        .select("consecutive_failures")
        .eq("user_id", userId)
        .single();

      const failures = (existing?.consecutive_failures ?? 0) + 1;
      const needsReconnect = failures >= 3;

      await supabase.from("gbp_connections").upsert({
        user_id: userId,
        last_refresh_attempt: now,
        consecutive_failures: failures,
        connection_status: needsReconnect ? "refresh_failed" : "connected",
        health_score: Math.max(20, 90 - failures * 20),
        needs_reconnect: needsReconnect,
        last_error: errorMessage || "Token refresh failed",
        last_error_at: now,
        last_health_check: now,
        updated_at: now,
      }, { onConflict: "user_id" });
    } else if (eventType === "disconnect") {
      await supabase.from("gbp_connections").update({
        connection_status: "disconnected",
        health_score: 0,
        needs_reconnect: false,
        updated_at: now,
      }).eq("user_id", userId);
    } else if (eventType === "reconnect_prompt") {
      await supabase.from("gbp_connections").update({
        reconnect_prompted_at: now,
        needs_reconnect: true,
        updated_at: now,
      }).eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildHealthRecommendations(status: string, score: number, needsReconnect: boolean): string[] {
  const recs: string[] = [];

  if (status === "disconnected") {
    recs.push("Connect your Google Business Profile to enable monitoring and automation");
    recs.push("GBP connection is required for post publishing, review monitoring, and profile health checks");
  }
  if (status === "expired" || needsReconnect) {
    recs.push("Reconnect your Google account — your access token is no longer valid");
    recs.push("After reconnecting, run a sync to update your profile data");
  }
  if (status === "refresh_failed") {
    recs.push("Token refresh is failing — this usually means the Google OAuth grant was revoked");
    recs.push("Disconnect and reconnect your Google account to get a fresh token");
  }
  if (status === "connected" && score < 60) {
    recs.push("Your connection health is degraded — consider reconnecting to ensure reliable access");
  }
  if (status === "connected" && score >= 80) {
    recs.push("Your Google connection is healthy — no action needed");
  }

  return recs;
}
