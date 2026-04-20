import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyAndSync } from "@/lib/foursquare";
import { requirePlan } from "@/lib/plan-gate";
import { getAutomationPolicy, isAutoAllowed } from "@/lib/automation-policies";

/**
 * POST /api/citations/sync
 * Sync business listing to the Foursquare network (~50 directories).
 * Body: { businessName, address, city, state, zip?, phone?, website? }
 * Rate limited: 1 sync per user per day (free tier).
 * Requires: growth plan or above.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { businessName, address, city, state, zip, phone, website, isAutoAction = false } =
      await req.json();

    if (isAutoAction) {
      const policy = await getAutomationPolicy(user.id, "listing_sync");
      if (!isAutoAllowed(policy)) {
        return NextResponse.json(
          { error: "Automation policy blocks automatic listing sync for this account." },
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

    // Rate limit: 1 sync per user per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSync } = await supabase
      .from("listing_syncs")
      .select("id, synced_at")
      .eq("user_id", user.id)
      .gte("synced_at", oneDayAgo)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync) {
      const nextAllowed = new Date(
        new Date(recentSync.synced_at).getTime() + 24 * 60 * 60 * 1000
      );
      return NextResponse.json(
        {
          success: false,
          error: "Rate limited",
          details: `You can sync again after ${nextAllowed.toLocaleString()}.`,
          nextAllowedAt: nextAllowed.toISOString(),
        },
        { status: 429 }
      );
    }

    // Verify & sync via Foursquare
    const result = await verifyAndSync({
      name: businessName,
      address: address || undefined,
      city,
      state,
      phone,
      website,
    });

    // Persist sync record
    const directoriesReached = result.action === "verified" ? 50 : result.action === "found" ? 50 : 0;
    await supabase.from("listing_syncs").insert({
      user_id: user.id,
      business_name: businessName,
      city,
      state,
      fsq_id: result.venue?.id ?? null,
      sync_status: result.action,
      directories_reached: directoriesReached,
    });

    return NextResponse.json({
      ...result,
      directoriesReached,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Listing sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: msg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/citations/sync
 * Returns the user's most recent sync record.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: syncs } = await supabase
      .from("listing_syncs")
      .select("*")
      .eq("user_id", user.id)
      .order("synced_at", { ascending: false })
      .limit(5);

    return NextResponse.json({ syncs: syncs || [] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch sync history", details: msg },
      { status: 500 }
    );
  }
}
