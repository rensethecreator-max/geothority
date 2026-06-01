import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordJourneyMilestone } from "@/lib/journey-events";

const ALLOWED_EVENTS = new Set([
  "onboarding_completed",
  "first_scan_completed",
  "gbp_connected",
  "reputation_activated",
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventName } = await req.json();
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
    }

    if (eventName === "onboarding_completed") {
      await supabase
        .from("user_profiles")
        .update({ onboarding_completed: true })
        .eq("id", session.user.id);
    }

    await recordJourneyMilestone(session.user.id, eventName);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record milestone" }, { status: 500 });
  }
}
