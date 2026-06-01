import { NextRequest, NextResponse } from "next/server";
import { getLaunchStepsLive } from "@/lib/activation-diagnosis";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    const [
      { data: latestScan, error: latestScanError },
      { data: gbpProfile, error: gbpError },
      { data: reputationSettings, error: reputationSettingsError },
      { data: operatorRuns, error: operatorRunsError },
      { data: operatorRunEvents, error: operatorRunEventsError },
      { data: syncs },
      { data: feedbackItems, error: feedbackError },
      { data: recentRequests, error: requestsError },
      { data: proofAssets, error: proofError },
    ] = await Promise.all([
      supabase
        .from("scans")
        .select("id, business_name, city, state, created_at, geothority_score, layer_scores, quick_wins")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("gbp_profiles")
        .select("id, business_name, last_synced_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("reputation_settings")
        .select("google_review_link, active")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("operator_runs")
        .select("id, scan_id, status, operator_action, message, redirect_to, metadata, current_stage, stage_status, plan_id, completed_at, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("operator_run_events")
        .select("id, run_id, stage, status, title, detail, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(72),
      supabase
        .from("listing_syncs")
        .select("id, business_name, city, state, sync_status, directories_reached, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reputation_feedback_items")
        .select("id, business_id, severity, topic, feedback_text, follow_up_status, assigned_owner_name, follow_up_due_date, recovery_outcome, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("reputation_requests")
        .select("id, business_id, status, created_at, sent_at, replied_at, contact:reputation_contacts(name, phone)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("reputation_proof_assets")
        .select("id, business_id, snippet, topic, approved, published_to, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (latestScanError) {
      console.error("Action center latest scan query error:", latestScanError);
    }

    if (gbpError) {
      console.error("Action center GBP profile query error:", gbpError);
    }

    if (reputationSettingsError) {
      console.error("Action center reputation settings query error:", reputationSettingsError);
    }

    if (operatorRunsError) {
      console.error("Action center operator runs query error:", operatorRunsError);
    }
    if (operatorRunEventsError) {
      console.error("Action center operator run events query error:", operatorRunEventsError);
    }

    const feedback = feedbackError ? [] : feedbackItems ?? [];
    const activeFollowUpStatuses = new Set(["reviewing", "outreach_queued", "waiting_on_customer"]);
    const requests = requestsError ? [] : recentRequests ?? [];
    const proof = proofError ? [] : proofAssets ?? [];
    const gbpConnected = Boolean(session?.provider_token || gbpProfile);
    const reputationActivated = Boolean(
      reputationSettings &&
      ((reputationSettings as { active?: boolean | null }).active ||
        (reputationSettings as { google_review_link?: string | null }).google_review_link),
    );
    const reputation = {
      counts: {
        unresolvedFeedback: feedback.filter((item: any) => item.follow_up_status !== "resolved").length,
        newComplaints: feedback.filter((item: any) => item.follow_up_status === "new").length,
        pendingFollowUps: feedback.filter((item: any) => activeFollowUpStatuses.has(item.follow_up_status)).length,
        awaitingReplies: requests.filter((item: any) => item.status === "sent" && !item.replied_at).length,
        pendingProofApprovals: proof.filter((item: any) => !item.approved).length,
        approvedProof: proof.filter((item: any) => item.approved).length,
      },
      feedback,
      requests,
      proof,
    };

    const eventsByRunId = new Map<string, any[]>();
    for (const event of operatorRunEvents ?? []) {
      const existing = eventsByRunId.get(event.run_id) ?? [];
      existing.push(event);
      eventsByRunId.set(event.run_id, existing);
    }

    const operatorRunsWithEvents = (operatorRuns ?? []).map((run: any) => ({
      ...run,
      events: (eventsByRunId.get(run.id) ?? []).sort(
        (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
      ),
    }));

    return NextResponse.json({
      plans: plans ?? [],
      operatorRuns: operatorRunsWithEvents,
      syncs: syncs ?? [],
      latestScan: latestScan ?? null,
      launchState: {
        gbpConnected,
        reputationActivated,
        launchStepsLive: getLaunchStepsLive(gbpConnected, reputationActivated),
        gbpBusinessName: gbpProfile?.business_name ?? null,
        gbpLastSyncedAt: gbpProfile?.last_synced_at ?? null,
      },
      reputation,
    });
  } catch (err) {
    console.error("Action center error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
