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
    const [{ data: syncs }, { data: feedbackItems, error: feedbackError }, { data: recentRequests, error: requestsError }] = await Promise.all([
      supabase
        .from("listing_syncs")
        .select("id, business_name, city, state, sync_status, directories_reached, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reputation_feedback_items")
        .select("id, business_id, severity, topic, feedback_text, follow_up_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("reputation_requests")
        .select("id, business_id, status, created_at, sent_at, replied_at, contact:reputation_contacts(name, phone)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const feedback = feedbackError ? [] : feedbackItems ?? [];
    const requests = requestsError ? [] : recentRequests ?? [];
    const reputation = {
      counts: {
        unresolvedFeedback: feedback.filter((item: any) => item.follow_up_status !== "resolved").length,
        newComplaints: feedback.filter((item: any) => item.follow_up_status === "new").length,
        pendingFollowUps: feedback.filter((item: any) => item.follow_up_status === "reviewing").length,
        awaitingReplies: requests.filter((item: any) => item.status === "sent" && !item.replied_at).length,
      },
      feedback,
      requests,
    };

    return NextResponse.json({
      plans: plans ?? [],
      syncs: syncs ?? [],
      reputation,
    });
  } catch (err) {
    console.error("Action center error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
