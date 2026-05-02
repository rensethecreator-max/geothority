import { createServiceClient } from "@/lib/supabase/server";

interface ScheduleReviewRequestParams {
  userId: string;
  businessId: string;
  phone: string;
  customerName: string;
  paymentId: string;
  paymentSource: "square" | "stripe" | "manual" | "api";
}

export async function scheduleReviewRequest(params: ScheduleReviewRequestParams) {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("Supabase service client unavailable");

  const { userId, businessId, phone, customerName, paymentId, paymentSource } = params;

  const { data: settings, error: settingsError } = await supabase
    .from("reputation_settings")
    .select("id, sms_delay_minutes, active")
    .eq("user_id", userId)
    .single();

  if (settingsError || !settings) {
    throw new Error("Reputation settings not found for user");
  }

  if (!settings.active) {
    return { skipped: "inactive" } as const;
  }

  let { data: existingContact } = await supabase
    .from("reputation_contacts")
    .select("id, opt_out")
    .eq("business_id", businessId)
    .eq("phone", phone)
    .maybeSingle();

  if (!existingContact) {
    const { data: createdContact, error: contactError } = await supabase
      .from("reputation_contacts")
      .insert({
        business_id: businessId,
        phone,
        name: customerName,
        source: paymentSource,
      })
      .select("id, opt_out")
      .single();

    if (contactError || !createdContact) {
      throw new Error(contactError?.message || "Failed to create contact");
    }

    existingContact = createdContact;
  }

  if (existingContact.opt_out) {
    return { skipped: "opted_out" } as const;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRequest } = await supabase
    .from("reputation_requests")
    .select("id")
    .eq("contact_id", existingContact.id)
    .gte("created_at", sevenDaysAgo)
    .limit(1)
    .maybeSingle();

  if (recentRequest) {
    return { skipped: "recent_request" } as const;
  }

  const reviewToken = crypto.randomUUID().replace(/-/g, "");
  const { data: request, error: requestError } = await supabase
    .from("reputation_requests")
    .insert({
      business_id: businessId,
      contact_id: existingContact.id,
      trigger_source: paymentSource,
      external_event_id: paymentId,
      status: "pending",
      review_token: reviewToken,
    })
    .select("id")
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Failed to create review request");
  }

  const delaySeconds = (settings.sms_delay_minutes || 60) * 60;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";
  const qstashUrl = process.env.UPSTASH_QSTASH_URL;
  const qstashToken = process.env.UPSTASH_QSTASH_TOKEN;

  if (qstashUrl && qstashToken) {
    await fetch(`${qstashUrl}/v2/publish/${appUrl}/api/reputation/jobs/send-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${qstashToken}`,
        "Content-Type": "application/json",
        "Upstash-Delay": `${delaySeconds}s`,
      },
      body: JSON.stringify({ requestId: request.id }),
    });
  }

  return { scheduled: true, requestId: request.id } as const;
}
