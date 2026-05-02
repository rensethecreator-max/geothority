import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";

function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reputation_settings")
      .select("google_review_link, sms_delay_minutes, positive_threshold, sms_template, active")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ settings: DEFAULT_REPUTATION_SETTINGS, setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      settings: data
        ? {
            googleReviewLink: data.google_review_link ?? "",
            smsDelayMinutes: data.sms_delay_minutes ?? DEFAULT_REPUTATION_SETTINGS.smsDelayMinutes,
            positiveThreshold: data.positive_threshold ?? DEFAULT_REPUTATION_SETTINGS.positiveThreshold,
            smsTemplate: data.sms_template ?? DEFAULT_REPUTATION_SETTINGS.smsTemplate,
            active: data.active ?? false,
          }
        : DEFAULT_REPUTATION_SETTINGS,
      setupRequired: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = {
      user_id: session.user.id,
      google_review_link: body.googleReviewLink ?? "",
      sms_delay_minutes: Number(body.smsDelayMinutes ?? DEFAULT_REPUTATION_SETTINGS.smsDelayMinutes),
      positive_threshold: Number(body.positiveThreshold ?? DEFAULT_REPUTATION_SETTINGS.positiveThreshold),
      sms_template: body.smsTemplate ?? DEFAULT_REPUTATION_SETTINGS.smsTemplate,
      active: Boolean(body.active),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("reputation_settings").upsert(payload, { onConflict: "user_id" });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
