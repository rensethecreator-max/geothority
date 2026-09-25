import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";
import { recordReputationReply } from "@/lib/reputation/intake-service";

const OPENABLE_STATUSES = ["pending", "sent", "public_review_ready", "feedback_received"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: rawToken } = await params;
    const token = String(rawToken || "").trim();
    if (!token || token.length > 256) {
      return NextResponse.json({ error: "Review link is invalid" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Review service is temporarily unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    if (action !== "open_google" && action !== "submit_feedback") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    if (action === "submit_feedback") {
      const score = Number(body.score);
      const feedbackText = typeof body.feedbackText === "string" ? body.feedbackText.trim().slice(0, 2000) : "";
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return NextResponse.json({ error: "A 1-5 score is required" }, { status: 400 });
      }

      const { data: requestRow, error: requestError } = await supabase
        .from("reputation_requests")
        .select("id, status")
        .eq("review_token", token)
        .maybeSingle();
      if (requestError) {
        if (isMissingTableError(requestError)) return NextResponse.json({ error: "Review link is unavailable" }, { status: 404 });
        return NextResponse.json({ error: "Unable to save feedback right now" }, { status: 500 });
      }
      if (!requestRow?.id || !OPENABLE_STATUSES.includes(requestRow.status)) {
        return NextResponse.json({ error: "Review link is unavailable" }, { status: 404 });
      }

      const result = await recordReputationReply({
        supabase,
        requestId: requestRow.id,
        score,
        feedbackText,
        providerSid: null,
        channel: "review_link",
        customerPermission: body.allowQuote === true && Boolean(feedbackText),
      });
      return NextResponse.json({ success: true, status: result.status });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("reputation_requests")
      .select("id, google_link_sent")
      .eq("review_token", token)
      .in("status", OPENABLE_STATUSES)
      .maybeSingle();
    if (requestError) {
      if (isMissingTableError(requestError)) return NextResponse.json({ error: "Review link is unavailable" }, { status: 404 });
      return NextResponse.json({ error: "Unable to record review link activity" }, { status: 500 });
    }
    if (!requestRow?.id) return NextResponse.json({ error: "Review link is unavailable" }, { status: 404 });

    if (!requestRow.google_link_sent) {
      const { error: updateError } = await supabase
        .from("reputation_requests")
        .update({ google_link_sent: true })
        .eq("id", requestRow.id)
        .in("status", OPENABLE_STATUSES);
      if (updateError) return NextResponse.json({ error: "Unable to record review link activity" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: err?.status || 500 });
  }
}
