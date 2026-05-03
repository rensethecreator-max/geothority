import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { recordReputationReply } from "@/lib/reputation/intake-service";

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

    const result = await recordReputationReply({
      supabase,
      requestId,
      score,
      feedbackText,
      providerSid: null,
      channel: "sms",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err?.status || 500 });
  }
}
