import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { recordReputationReply } from "@/lib/reputation/intake-service";

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerSupabase();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { data: ownedRequest, error: ownershipError } = await supabase
      .from("reputation_requests")
      .select("id")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownershipError) {
      return NextResponse.json({ error: "Unable to verify request ownership" }, { status: 500 });
    }
    if (!ownedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
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
