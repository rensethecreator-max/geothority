import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { isMissingTableError } from "@/lib/reputation/request-service";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const requestId = String(body.requestId || "").trim();
    const score = Number(body.score);
    const feedbackText = typeof body.feedbackText === "string" ? body.feedbackText.trim() : "";

    if (!requestId || !Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "requestId and score (1-5) are required" }, { status: 400 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("reputation_requests")
      .select("id, user_id, business_id, status")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      if (isMissingTableError(requestError)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: requestError?.message || "Request not found" }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("reputation_settings")
      .select("positive_threshold")
      .eq("user_id", requestRow.user_id)
      .maybeSingle();

    const positiveThreshold = settings?.positive_threshold ?? DEFAULT_REPUTATION_SETTINGS.positiveThreshold;
    const repliedAt = new Date().toISOString();
    const belowThreshold = score < positiveThreshold;
    const nextStatus = belowThreshold ? "feedback_received" : "public_review_ready";

    const { error: updateError } = await supabase
      .from("reputation_requests")
      .update({
        score,
        feedback_text: feedbackText || null,
        replied_at: repliedAt,
        status: nextStatus,
      })
      .eq("id", requestRow.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("reputation_message_log").insert({
      request_id: requestRow.id,
      direction: "in",
      body: feedbackText ? `${score}: ${feedbackText}` : String(score),
      provider_sid: null,
    });

    if (belowThreshold) {
      await supabase.from("reputation_feedback_items").insert({
        user_id: requestRow.user_id,
        request_id: requestRow.id,
        business_id: requestRow.business_id,
        severity: score <= 2 ? "high" : "medium",
        topic: `Low rating (${score}/5)`,
        feedback_text: feedbackText || `Customer replied with a ${score}/5 score and no written feedback.`,
        follow_up_status: "new",
      });
    } else if (feedbackText) {
      await supabase.from("reputation_proof_assets").insert({
        user_id: requestRow.user_id,
        business_id: requestRow.business_id,
        request_id: requestRow.id,
        snippet: feedbackText,
        topic: `Review snippet (${score}/5)`,
        sentiment: "positive",
        approved: false,
      });
    }

    return NextResponse.json({ success: true, status: nextStatus, positiveThreshold });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
