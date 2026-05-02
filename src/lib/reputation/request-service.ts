import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";

export function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export async function getPreferredBusinessName(supabase: any, userId: string) {
  const [{ data: profile }, { data: userProfile }, { data: latestScan }] = await Promise.all([
    supabase.from("business_profiles").select("business_name").eq("user_id", userId).maybeSingle(),
    supabase.from("user_profiles").select("business_name").eq("id", userId).maybeSingle(),
    supabase.from("scans").select("business_name").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return profile?.business_name || userProfile?.business_name || latestScan?.business_name || "Your Business";
}

export async function upsertReputationContact(params: {
  supabase: any;
  userId: string;
  businessId: string;
  customerName: string;
  phone: string;
  source: string;
}) {
  const { supabase, userId, businessId, customerName, phone, source } = params;
  const normalizedPhone = normalizePhoneNumber(phone);

  let { data: contact } = await supabase
    .from("reputation_contacts")
    .select("id, name, phone, opt_out")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!contact) {
    const { data: createdContact, error: contactError } = await supabase
      .from("reputation_contacts")
      .insert({
        user_id: userId,
        business_id: businessId,
        phone: normalizedPhone,
        name: customerName,
        source,
      })
      .select("id, name, phone, opt_out")
      .single();

    if (contactError || !createdContact) {
      throw new Error(contactError?.message || "Failed to create contact");
    }

    contact = createdContact;
  } else if ((customerName && contact.name !== customerName) || contact.phone !== normalizedPhone) {
    await supabase
      .from("reputation_contacts")
      .update({ name: customerName || contact.name, phone: normalizedPhone, source })
      .eq("id", contact.id);
    contact = { ...contact, name: customerName || contact.name, phone: normalizedPhone };
  }

  return contact;
}

export async function sendReputationRequestNow(requestId: string) {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client unavailable");
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select("id, user_id, business_id, contact_id, status, sent_at, review_token")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) {
    throw new Error(requestError?.message || "Request not found");
  }

  if (requestRow.status === "sent" && requestRow.sent_at) {
    return { success: true, simulated: true, alreadySent: true };
  }

  const [{ data: settings }, { data: contact }] = await Promise.all([
    supabase.from("reputation_settings").select("sms_template").eq("user_id", requestRow.user_id).maybeSingle(),
    supabase.from("reputation_contacts").select("name, phone").eq("id", requestRow.contact_id).single(),
  ]);

  const body = (settings?.sms_template || DEFAULT_REPUTATION_SETTINGS.smsTemplate)
    .replace("{customer_name}", contact?.name || "there")
    .replace("{business_name}", requestRow.business_id);

  await supabase.from("reputation_message_log").insert({
    request_id: requestRow.id,
    direction: "out",
    body,
    provider_sid: null,
  });

  const reviewToken = requestRow.review_token || crypto.randomUUID().replace(/-/g, "");

  await supabase
    .from("reputation_requests")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      review_token: reviewToken,
    })
    .eq("id", requestRow.id);

  return { success: true, simulated: true, alreadySent: false };
}
