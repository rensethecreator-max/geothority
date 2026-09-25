import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { recordJourneyMilestone } from "@/lib/journey-events";
import { isSafeGoogleReviewUrl } from "@/lib/reputation/template-utils";

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
      .select("google_review_link, sms_delay_minutes, positive_threshold, sms_template, enabled_channels, primary_channel, email_subject, email_template, send_both_delay_minutes, active")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error && isMissingColumnError(error)) {
      const legacyResult = await supabase
        .from("reputation_settings")
        .select("google_review_link, sms_delay_minutes, positive_threshold, sms_template, active")
        .eq("user_id", session.user.id)
        .maybeSingle();
      data = legacyResult.data
        ? {
            ...legacyResult.data,
            enabled_channels: null,
            primary_channel: null,
            email_subject: null,
            email_template: null,
            send_both_delay_minutes: null,
          }
        : null;
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
            sendBothDelayMinutes: data.send_both_delay_minutes ?? DEFAULT_REPUTATION_SETTINGS.sendBothDelayMinutes,
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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }
    const googleReviewLink = typeof body.googleReviewLink === "string" ? body.googleReviewLink.trim() : "";
    const positiveThreshold = Number(body.positiveThreshold ?? DEFAULT_REPUTATION_SETTINGS.positiveThreshold);
    const smsDelayMinutes = Number(body.smsDelayMinutes ?? DEFAULT_REPUTATION_SETTINGS.smsDelayMinutes);
    const sendBothDelayMinutes = Number(body.sendBothDelayMinutes ?? DEFAULT_REPUTATION_SETTINGS.sendBothDelayMinutes);
    const smsTemplate = typeof body.smsTemplate === "string" ? body.smsTemplate : DEFAULT_REPUTATION_SETTINGS.smsTemplate;
    const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : DEFAULT_REPUTATION_SETTINGS.emailSubject;
    const emailTemplate = typeof body.emailTemplate === "string" ? body.emailTemplate : DEFAULT_REPUTATION_SETTINGS.emailTemplate;

    if (googleReviewLink.length > 2000 || (googleReviewLink && !isSafeGoogleReviewUrl(googleReviewLink))) {
      return NextResponse.json({ error: "Use a valid HTTPS Google review link." }, { status: 400 });
    }
    if (!Number.isInteger(positiveThreshold) || positiveThreshold < 1 || positiveThreshold > 5
      || !Number.isFinite(smsDelayMinutes) || smsDelayMinutes < 5 || smsDelayMinutes > 10080
      || !Number.isFinite(sendBothDelayMinutes) || sendBothDelayMinutes < 15 || sendBothDelayMinutes > 10080) {
      return NextResponse.json({ error: "Check the review threshold and delivery delays." }, { status: 400 });
    }
    if (smsTemplate.length > 2000 || emailSubject.length > 200 || emailTemplate.length > 10000) {
      return NextResponse.json({ error: "Message templates are too long." }, { status: 400 });
    }

    const payload = {
      user_id: session.user.id,
      google_review_link: googleReviewLink,
      sms_delay_minutes: smsDelayMinutes,
      positive_threshold: positiveThreshold,
      sms_template: smsTemplate,
      enabled_channels: ["sms", "email", "sms_email"].includes(body.enabledChannels) ? body.enabledChannels : DEFAULT_REPUTATION_SETTINGS.enabledChannels,
      primary_channel: body.primaryChannel === "email" || body.primaryChannel === "sms" ? body.primaryChannel : DEFAULT_REPUTATION_SETTINGS.primaryChannel,
      email_subject: emailSubject,
      email_template: emailTemplate,
      send_both_delay_minutes: sendBothDelayMinutes,
      active: body.active === true,
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
