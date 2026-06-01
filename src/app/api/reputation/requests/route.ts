import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { recordJourneyMilestone } from "@/lib/journey-events";
import { createAndSendReputationRequest, getPreferredBusinessName, getReputationProofSummary, isMissingTableError } from "@/lib/reputation/request-service";

async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const sendingStaleBeforeIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const [requestsResult, feedbackResult, proofSummary, businessName, queuedCountResult, retryScheduledCountResult, stuckSendingCountResult, deadLetterCountResult, overdueRetryCountResult, latestFailureResult] = await Promise.all([
      supabase
        .from("reputation_requests")
        .select(
          "id, business_id, trigger_source, status, delivery_state, send_attempt_count, last_send_attempt_at, last_send_error, next_retry_at, dead_lettered_at, score, feedback_text, review_token, google_link_sent, template_used, sent_at, replied_at, created_at, contact:reputation_contacts(name, phone)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("reputation_feedback_items")
        .select("id, follow_up_status", { count: "exact", head: false })
        .eq("user_id", user.id)
        .neq("follow_up_status", "resolved"),
      getReputationProofSummary(supabase, user.id),
      getPreferredBusinessName(supabase, user.id),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending")
        .in("delivery_state", ["pending", "retry_scheduled"]),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("delivery_state", "retry_scheduled"),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("delivery_state", "sending")
        .lt("last_send_attempt_at", sendingStaleBeforeIso),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("dead_lettered_at", "is", null),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("delivery_state", "retry_scheduled")
        .lt("next_retry_at", nowIso),
      supabase
        .from("reputation_requests")
        .select("id, business_id, delivery_state, send_attempt_count, last_send_error, next_retry_at, dead_lettered_at, created_at, contact:reputation_contacts(name, phone)")
        .eq("user_id", user.id)
        .or("delivery_state.in.(retry_scheduled,failed),dead_lettered_at.not.is.null")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (requestsResult.error) {
      if (isMissingTableError(requestsResult.error)) {
        return NextResponse.json({ recentRequests: [], proofAssets: [], metrics: null, analytics: null, suggestedBusinessName: businessName, setupRequired: true });
      }
      return NextResponse.json({ error: requestsResult.error.message }, { status: 500 });
    }

    const opsResults = [queuedCountResult, retryScheduledCountResult, stuckSendingCountResult, deadLetterCountResult, overdueRetryCountResult, latestFailureResult];
    const opsError = opsResults.find((result: any) => result?.error && !isMissingTableError(result.error))?.error;
    if (opsError) {
      return NextResponse.json({ error: opsError.message || "Failed to load delivery diagnostics" }, { status: 500 });
    }

    const requests = requestsResult.data ?? [];
    const unresolvedFeedback = feedbackResult.count ?? 0;
    const latestFailure = (latestFailureResult.data ?? [])[0] ?? null;

    return NextResponse.json({
      recentRequests: requests,
      proofAssets: proofSummary.proofAssets,
      suggestedBusinessName: businessName,
      metrics: {
        total: proofSummary.totalRequests,
        awaitingReply: proofSummary.awaitingReply,
        publicReady: proofSummary.publicReady,
        unresolvedFeedback,
        approvedProofCount: proofSummary.approvedProofCount,
        pendingProofCount: proofSummary.pendingProofCount,
      },
      analytics: proofSummary.analytics,
      ops: {
        queued: queuedCountResult.count ?? 0,
        retryScheduled: retryScheduledCountResult.count ?? 0,
        stuckSending: stuckSendingCountResult.count ?? 0,
        deadLettered: deadLetterCountResult.count ?? 0,
        overdueRetry: overdueRetryCountResult.count ?? 0,
        latestFailure,
      },
      setupRequired: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const businessName = String(body.businessName || "").trim();
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const triggerSource = String(body.triggerSource || "manual").trim() || "manual";

    if (!businessName || !customerName || !phone) {
      return NextResponse.json({ error: "businessName, customerName, and phone are required" }, { status: 400 });
    }

    const result = await createAndSendReputationRequest({
      supabase,
      userId: user.id,
      businessName,
      customerName,
      phone,
      triggerSource,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (!result.deduplicated && (result.sendOutcome?.success || result.sendOutcome?.alreadySent)) {
      await recordJourneyMilestone(user.id, "first_reputation_request_sent");
    }

    return NextResponse.json({ success: true, requestId: result.requestId, deduplicated: result.deduplicated, sendOutcome: result.sendOutcome ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
