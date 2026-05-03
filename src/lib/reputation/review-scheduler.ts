import { enqueueReputationSendAttempt, normalizePhoneNumber } from "@/lib/reputation/request-service";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
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
  const normalizedPhone = normalizePhoneNumber(phone);
  const businessIdentity = getReputationBusinessIdentity(businessId);

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
    .eq("user_id", userId)
    .eq("business_key", businessIdentity.businessKey)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!existingContact) {
    const { data: createdContact, error: contactError } = await supabase
      .from("reputation_contacts")
      .insert({
        user_id: userId,
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
        phone: normalizedPhone,
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
      user_id: userId,
      business_id: businessIdentity.displayName,
      business_key: businessIdentity.businessKey,
      contact_id: existingContact.id,
      trigger_source: paymentSource,
      external_event_id: paymentId,
      status: "pending",
      review_token: reviewToken,
      delivery_state: "pending",
      send_attempt_count: 0,
      last_send_error: null,
      next_retry_at: null,
      dead_lettered_at: null,
    })
    .select("id")
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || "Failed to create review request");
  }

  const delaySeconds = (settings.sms_delay_minutes || 60) * 60;
  const queueResult = await enqueueReputationSendAttempt({ requestId: request.id, delaySeconds });

  if (!queueResult.scheduled) {
    throw new Error(`Failed to schedule review request send (${queueResult.reason})`);
  }

  return { scheduled: true, requestId: request.id } as const;
}
