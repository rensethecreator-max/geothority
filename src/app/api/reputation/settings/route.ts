import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { recordJourneyMilestone } from "@/lib/journey-events";

function isMissingTableError(error: any) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /relation .* does not exist/i.test(error?.message || "")
    || /Could not find the table .* in the schema cache/i.test(error?.message || "");
}

function isMissingColumnError(error: any) {
  return error?.code === "PGRST204" || /column .* does not exist/i.test(error?.message || "") || /Could not find .* column/i.test(error?.message || "");
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

    let { data, error } = await supabase
      .from("reputation_settings")
      .select("google_review_link, sms_delay_minutes, positive_threshold, sms_template, enabled_channels, primary_channel, email_subject, email_template, active")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error && isMissingColumnError(error)) {
      const legacyResult = await supabase
        .from("reputation_settings")
        .select("google_review_link, sms_delay_minutes, positive_threshold, sms_template, active")
        .eq("user_id", session.user.id)
        .maybeSingle();
      data = legacyResult.data;
      error = legacyResult.error;
    }

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
            enabledChannels: data.enabled_channels ?? DEFAULT_REPUTATION_SETTINGS.enabledChannels,
            primaryChannel: data.primary_channel ?? DEFAULT_REPUTATION_SETTINGS.primaryChannel,
            emailSubject: data.email_subject ?? DEFAULT_REPUTATION_SETTINGS.emailSubject,
            emailTemplate: data.email_template ?? DEFAULT_REPUTATION_SETTINGS.emailTemplate,
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
      enabled_channels: ["sms", "email", "sms_email"].includes(body.enabledChannels) ? body.enabledChannels : DEFAULT_REPUTATION_SETTINGS.enabledChannels,
      primary_channel: body.primaryChannel === "email" || body.primaryChannel === "sms" ? body.primaryChannel : DEFAULT_REPUTATION_SETTINGS.primaryChannel,
      email_subject: body.emailSubject ?? DEFAULT_REPUTATION_SETTINGS.emailSubject,
      email_template: body.emailTemplate ?? DEFAULT_REPUTATION_SETTINGS.emailTemplate,
      active: Boolean(body.active),
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("reputation_settings").upsert(payload, { onConflict: "user_id" });

    if (error && isMissingColumnError(error)) {
      const legacyPayload = {
        user_id: payload.user_id,
        google_review_link: payload.google_review_link,
        sms_delay_minutes: payload.sms_delay_minutes,
        positive_threshold: payload.positive_threshold,
        sms_template: payload.sms_template,
        active: payload.active,
        updated_at: payload.updated_at,
      };
      const legacyResult = await supabase.from("reputation_settings").upsert(legacyPayload, { onConflict: "user_id" });
      error = legacyResult.error;
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (payload.active || payload.google_review_link) {
      await recordJourneyMilestone(session.user.id, "reputation_activated");
    }

    return NextResponse.json({ success: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
