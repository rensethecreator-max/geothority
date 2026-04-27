import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10), 100);

    let query = supabase
      .from("fix_execution_plans")
      .select("id, scan_id, mode, status, progress, total, completed, failed, needs_input, created_at, updated_at, verification")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: plans, error } = await query;
    if (error) {
      console.error("Action center plans query error:", error);
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }

    // Also fetch recent listing_syncs for a unified view
    const { data: syncs } = await supabase
      .from("listing_syncs")
      .select("id, business_name, city, state, sync_status, directories_reached, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      plans: plans ?? [],
      syncs: syncs ?? [],
    });
  } catch (err) {
    console.error("Action center error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
