import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordJourneyMilestone } from "@/lib/journey-events";
import { ensureUserProfileExists } from "@/lib/supabase/ensure-user-profile";

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
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => null);
    const eventName = body && typeof body === "object" && "eventName" in body ? body.eventName : undefined;
    if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
    }

    if (eventName === "onboarding_completed") {
      const profileSeed = await ensureUserProfileExists(supabase, user);
      if (profileSeed.error) {
        console.error("Failed to prepare onboarding profile:", profileSeed.error);
        return NextResponse.json({ error: "Your account profile could not be prepared. Please try again." }, { status: 500 });
      }

      const { data: profile, error: readError } = await supabase
        .from("user_profiles").select("business_name, city, state").eq("id", user.id).maybeSingle();
      if (readError) {
        return NextResponse.json({ error: "Your saved business details could not be verified." }, { status: 500 });
      }
      if (!profile || !profile.business_name?.trim() || !profile.city?.trim() || !profile.state?.trim()) {
        return NextResponse.json({ error: "Save your business name, city, and state before completing setup." }, { status: 409 });
      }

      const { data: updated, error: updateError } = await supabase
        .from("user_profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id)
        .select("id, onboarding_completed")
        .maybeSingle();
      if (updateError || !updated || updated.onboarding_completed !== true) {
        console.error("Failed to persist onboarding completion:", updateError);
        return NextResponse.json({ error: "Setup completion could not be saved. Please try again." }, { status: 500 });
      }
    }

    await recordJourneyMilestone(user.id, eventName);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record milestone:", error);
    return NextResponse.json({ error: "Failed to record milestone" }, { status: 500 });
  }
}
