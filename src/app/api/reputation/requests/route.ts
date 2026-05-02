import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { getPreferredBusinessName, isMissingTableError, sendReputationRequestNow, upsertReputationContact } from "@/lib/reputation/request-service";

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

    const [requestsResult, feedbackResult, proofResult, businessName] = await Promise.all([
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
      supabase
        .from("reputation_proof_assets")
        .select("id, snippet, approved, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4),
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
    const proofAssets = proofResult.data ?? [];
    const awaitingReply = requests.filter((item: any) => item.status === "sent" && !item.replied_at).length;
    const publicReady = requests.filter((item: any) => item.status === "public_review_ready").length;

    return NextResponse.json({
      recentRequests: requests,
      proofAssets,
      suggestedBusinessName: businessName,
      metrics: {
        total: requests.length,
        awaitingReply,
        publicReady,
        unresolvedFeedback,
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

    const contact = await upsertReputationContact({
      supabase,
      userId: user.id,
      businessId: businessName,
      customerName,
      phone,
      source: triggerSource,
    });

    if (contact.opt_out) {
      return NextResponse.json({ error: "This contact has opted out of reputation requests" }, { status: 409 });
    }

    const { data: createdRequest, error: requestError } = await supabase
      .from("reputation_requests")
      .insert({
        user_id: user.id,
        business_id: businessName,
        contact_id: contact.id,
        trigger_source: triggerSource,
        status: "pending",
        review_token: crypto.randomUUID().replace(/-/g, ""),
      })
      .select("id")
      .single();

    if (requestError || !createdRequest) {
      if (isMissingTableError(requestError)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: requestError?.message || "Failed to create request" }, { status: 500 });
    }

    await sendReputationRequestNow(createdRequest.id);

    return NextResponse.json({ success: true, requestId: createdRequest.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
