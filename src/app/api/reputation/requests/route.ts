import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
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

    const [requestsResult, feedbackResult, proofSummary, businessName] = await Promise.all([
      supabase
        .from("reputation_requests")
        .select(
          "id, business_id, trigger_source, status, score, feedback_text, review_token, google_link_sent, template_used, sent_at, replied_at, created_at, contact:reputation_contacts(name, phone)",
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
    ]);

    if (requestsResult.error) {
      if (isMissingTableError(requestsResult.error)) {
        return NextResponse.json({ recentRequests: [], proofAssets: [], metrics: null, suggestedBusinessName: businessName, setupRequired: true });
      }
      return NextResponse.json({ error: requestsResult.error.message }, { status: 500 });
    }

    const requests = requestsResult.data ?? [];
    const unresolvedFeedback = feedbackResult.count ?? 0;

    return NextResponse.json({
      recentRequests: requests,
      proofAssets: proofSummary.proofAssets,
      suggestedBusinessName: businessName,
      metrics: {
        total: requests.length,
        awaitingReply: proofSummary.awaitingReply,
        publicReady: proofSummary.publicReady,
        unresolvedFeedback,
        approvedProofCount: proofSummary.approvedProofCount,
        pendingProofCount: proofSummary.pendingProofCount,
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

    return NextResponse.json({ success: true, requestId: result.requestId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
