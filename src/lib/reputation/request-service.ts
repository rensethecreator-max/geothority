import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { getReputationChannelTransport } from "@/lib/reputation/transport";
import { buildRequestReference } from "@/lib/reputation/twilio";
import type { ReputationMessageChannel } from "@/lib/reputation/transport";
import type { ReputationAnalyticsSummary, ReputationProofSummary, ReputationSourcePerformance } from "@/lib/reputation/types";

const MAX_REPUTATION_SEND_ATTEMPTS = 3;
const RETRY_DELAYS_SECONDS = [5 * 60, 30 * 60];

export function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "") || /could not find the table/i.test(error?.message || "");
}

function isMissingColumnError(error: any) {
  return error?.code === "PGRST204" || /column .* does not exist/i.test(error?.message || "") || /Could not find .* column/i.test(error?.message || "");
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function buildRetryDate(delaySeconds: number) {
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

export async function enqueueReputationSendAttempt(params: { requestId: string; delaySeconds?: number }) {
  const { requestId, delaySeconds = 0 } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";
  const qstashUrl = process.env.UPSTASH_QSTASH_URL;
  const qstashToken = process.env.UPSTASH_QSTASH_TOKEN;
  const jobSecret = process.env.GEOTHORITY_REPUTATION_JOB_SECRET;

  if (!qstashUrl || !qstashToken) {
    return { scheduled: false as const, reason: "qstash_not_configured" };
  }

  if (!jobSecret) {
    return { scheduled: false as const, reason: "job_secret_missing" };
  }

  const destinationUrl = `${appUrl}/api/reputation/jobs/send-request`;
  const response = await fetch(`${qstashUrl}/v2/publish/${encodeURIComponent(destinationUrl)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
      ...(delaySeconds > 0 ? { "Upstash-Delay": `${delaySeconds}s` } : {}),
      "Upstash-Forward-x-geothority-job-secret": jobSecret,
    },
    body: JSON.stringify({ requestId }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || `Failed to enqueue send attempt (${response.status})`);
  }

  return { scheduled: true as const, reason: null };
}

async function bestEffortLogSendAttempt(params: {
  supabase: any;
  requestId: string;
  body: string;
  channel?: ReputationMessageChannel;
  recipient?: string | null;
  provider?: string | null;
  attemptNumber: number;
  deliveryState: string;
  providerSid?: string | null;
  errorDetail?: string | null;
  simulated?: boolean;
}) {
  const { supabase, requestId, body, channel = "sms", recipient = null, provider = null, attemptNumber, deliveryState, providerSid = null, errorDetail = null, simulated = true } = params;

  try {
    await supabase.from("reputation_message_log").insert({
      request_id: requestId,
      channel,
      recipient,
      provider,
      direction: "out",
      body,
      provider_sid: providerSid,
      attempt_number: attemptNumber,
      delivery_state: deliveryState,
      error_detail: errorDetail,
      simulated,
    });
  } catch {
    // Best effort only — request state is the source of truth.
  }
}

function buildReviewLink(reviewToken: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://geothority.io").replace(/\/$/, "");
  return `${appUrl}/review/${reviewToken}`;
}

function fillReputationMessageTemplate(template: string, customerName: string, businessName: string, reviewToken: string) {
  const reviewLink = buildReviewLink(reviewToken);
  return template
    .replace(/\{customer_name\}/g, customerName || "there")
    .replace(/\{business_name\}/g, businessName)
    .replace(/\{review_link\}/g, reviewLink)
    .trim();
}

function buildReputationMessageBody(template: string, customerName: string, businessName: string, reviewToken: string) {
  const baseMessage = fillReputationMessageTemplate(template, customerName, businessName, reviewToken);
  const reference = buildRequestReference(reviewToken);
  return reference ? `${baseMessage} Ref ${reference}` : baseMessage;
}

function buildReputationEmailHtml(params: {
  body: string;
  businessName: string;
  customerName: string;
  reviewToken: string;
}) {
  const reviewLink = buildReviewLink(params.reviewToken);
  const escapedBusinessName = params.businessName.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
  const escapedBody = params.body.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)).replace(/\n/g, "<br />");

  return `
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#fff;color:#172033;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
      <div style="padding:28px 32px;border-bottom:1px solid #edf0f4">
        <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#16a34a">Private feedback request</div>
        <h1 style="font-size:24px;line-height:1.2;margin:10px 0 0;color:#111827">How was your experience with ${escapedBusinessName}?</h1>
      </div>
      <div style="padding:28px 32px">
        <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 22px">${escapedBody}</p>
        <a href="${reviewLink}" style="display:inline-block;background:#16c784;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:800;font-size:14px">Leave quick feedback</a>
        <p style="font-size:12px;line-height:1.6;color:#64748b;margin:24px 0 0">This private page helps ${escapedBusinessName} understand your experience. You can still choose whether to post publicly after sharing feedback.</p>
      </div>
    </div>
  `;
}

function normalizeRequestedChannels(params: {
  requestedChannels?: ReputationMessageChannel[];
  preferredChannel?: string | null;
  phone?: string | null;
  email?: string | null;
  settingsChannels?: string | null;
}) {
  const available = new Set<ReputationMessageChannel>();
  if (params.phone) available.add("sms");
  if (params.email) available.add("email");

  let requested = params.requestedChannels?.filter((channel): channel is ReputationMessageChannel => channel === "sms" || channel === "email") ?? [];
  if (!requested.length) {
    const preferred = params.preferredChannel === "email" || params.preferredChannel === "sms" ? params.preferredChannel : null;
    const settingsChannels = params.settingsChannels || DEFAULT_REPUTATION_SETTINGS.enabledChannels;
    if (preferred) requested = [preferred];
    else if (settingsChannels === "sms_email") requested = ["sms", "email"];
    else if (settingsChannels === "email") requested = ["email"];
    else requested = ["sms"];
  }

  const filtered = Array.from(new Set(requested)).filter((channel) => available.has(channel));
  if (filtered.length) return filtered;
  return Array.from(available);
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
  phone?: string | null;
  email?: string | null;
  preferredChannel?: ReputationMessageChannel | null;
  source: string;
}) {
  const { supabase, userId, businessId, customerName, phone, email, preferredChannel, source } = params;
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const normalizedEmail = email ? normalizeEmailAddress(email) : "";
  const businessIdentity = getReputationBusinessIdentity(businessId);

  if (!normalizedPhone && !normalizedEmail) {
    throw new Error("A phone number or email address is required");
  }

  const contactQuery = supabase
    .from("reputation_contacts")
    .select("id, name, phone, email, opt_out, sms_opt_out, email_opt_out, preferred_channel")
    .eq("user_id", userId)
    .eq("business_key", businessIdentity.businessKey);

  let { data: contactByPhone, error: contactByPhoneError } = normalizedPhone
    ? await contactQuery.eq("phone", normalizedPhone).maybeSingle()
    : { data: null, error: null };

  if (contactByPhoneError && isMissingColumnError(contactByPhoneError)) {
    const legacyResult = normalizedPhone
      ? await supabase
          .from("reputation_contacts")
          .select("id, name, phone, email, opt_out")
          .eq("user_id", userId)
          .eq("business_key", businessIdentity.businessKey)
          .eq("phone", normalizedPhone)
          .maybeSingle()
      : { data: null };
    contactByPhone = legacyResult.data;
  }

  let { data: contactByEmail, error: contactByEmailError } = !contactByPhone && normalizedEmail
    ? await supabase
        .from("reputation_contacts")
        .select("id, name, phone, email, opt_out, sms_opt_out, email_opt_out, preferred_channel")
        .eq("user_id", userId)
        .eq("business_key", businessIdentity.businessKey)
        .eq("email", normalizedEmail)
        .maybeSingle()
    : { data: null, error: null };

  if (contactByEmailError && isMissingColumnError(contactByEmailError)) {
    const legacyResult = !contactByPhone && normalizedEmail
      ? await supabase
          .from("reputation_contacts")
          .select("id, name, phone, email, opt_out")
          .eq("user_id", userId)
          .eq("business_key", businessIdentity.businessKey)
          .eq("email", normalizedEmail)
          .maybeSingle()
      : { data: null };
    contactByEmail = legacyResult.data;
  }

  let contact = contactByPhone || contactByEmail;

  if (!contact) {
    const { data: createdContact, error: contactError } = await supabase
      .from("reputation_contacts")
      .insert({
        user_id: userId,
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
        phone: normalizedPhone || null,
        email: normalizedEmail || null,
        name: customerName,
        source,
        preferred_channel: preferredChannel || null,
      })
      .select("id, name, phone, email, opt_out, sms_opt_out, email_opt_out, preferred_channel")
      .single();

    if (contactError && isMissingColumnError(contactError)) {
      const legacyResult = await supabase
        .from("reputation_contacts")
        .insert({
          user_id: userId,
          business_id: businessIdentity.displayName,
          business_key: businessIdentity.businessKey,
          phone: normalizedPhone || null,
          email: normalizedEmail || null,
          name: customerName,
          source,
        })
        .select("id, name, phone, email, opt_out")
        .single();
      if (legacyResult.error || !legacyResult.data) {
        throw new Error(legacyResult.error?.message || "Failed to create contact");
      }
      return legacyResult.data;
    }

    if (contactError || !createdContact) {
      throw new Error(contactError?.message || "Failed to create contact");
    }

    contact = createdContact;
  } else if ((customerName && contact.name !== customerName) || (normalizedPhone && contact.phone !== normalizedPhone) || (normalizedEmail && contact.email !== normalizedEmail) || (preferredChannel && contact.preferred_channel !== preferredChannel)) {
    await supabase
      .from("reputation_contacts")
      .update({
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
        name: customerName || contact.name,
        phone: normalizedPhone || contact.phone || null,
        email: normalizedEmail || contact.email || null,
        preferred_channel: preferredChannel || contact.preferred_channel || null,
        source,
      })
      .eq("id", contact.id);
    contact = {
      ...contact,
      name: customerName || contact.name,
      phone: normalizedPhone || contact.phone || null,
      email: normalizedEmail || contact.email || null,
      preferred_channel: preferredChannel || contact.preferred_channel || null,
    };
  }

  return contact;
}

export async function createAndSendReputationRequest(params: {
  supabase: any;
  userId: string;
  businessName: string;
  customerName: string;
  phone?: string | null;
  email?: string | null;
  preferredChannel?: ReputationMessageChannel | null;
  requestedChannels?: ReputationMessageChannel[];
  triggerSource: string;
  externalEventId?: string | null;
}) {
  const { supabase, userId, businessName, customerName, phone, email, preferredChannel, requestedChannels, triggerSource, externalEventId } = params;
  const businessIdentity = getReputationBusinessIdentity(businessName);
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const normalizedEmail = email ? normalizeEmailAddress(email) : "";

  if (!normalizedPhone && !normalizedEmail) {
    return { success: false as const, error: "A phone number or email address is required", status: 400 };
  }

  if (externalEventId) {
    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("reputation_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("external_event_id", externalEventId)
      .maybeSingle();

    if (existingRequestError && !isMissingTableError(existingRequestError)) {
      return { success: false as const, error: existingRequestError.message || "Failed to check existing request", status: 500 };
    }

    if (existingRequest?.id) {
      await appendReputationLedgerEvent(supabase, {
        userId,
        requestId: existingRequest.id,
        actorType: "system",
        eventType: "request.deduplicated",
        summary: "Ignored duplicate reputation event for an existing request.",
        metadata: {
          externalEventId,
          triggerSource,
        },
      });

      return { success: true as const, requestId: existingRequest.id, deduplicated: true };
    }
  }

  const contact = await upsertReputationContact({
    supabase,
    userId,
    businessId: businessIdentity.displayName,
    customerName,
    phone: normalizedPhone,
    email: normalizedEmail,
    preferredChannel,
    source: triggerSource,
  });

  if (contact.opt_out) {
    return { success: false as const, error: "This contact has opted out of reputation requests", status: 409 };
  }

  const { data: settings } = await supabase
    .from("reputation_settings")
    .select("enabled_channels, primary_channel")
    .eq("user_id", userId)
    .maybeSingle();

  const channels = normalizeRequestedChannels({
    requestedChannels,
    preferredChannel: preferredChannel || contact.preferred_channel,
    phone: contact.sms_opt_out ? "" : contact.phone,
    email: contact.email_opt_out ? "" : contact.email,
    settingsChannels: settings?.enabled_channels,
  });

  if (!channels.length) {
    return { success: false as const, error: "This contact has no usable reputation request channel", status: 409 };
  }

  let { data: createdRequest, error: requestError } = await supabase
    .from("reputation_requests")
    .insert({
      user_id: userId,
      business_id: businessIdentity.displayName,
      business_key: businessIdentity.businessKey,
      contact_id: contact.id,
      trigger_source: triggerSource,
      external_event_id: externalEventId || null,
      status: "pending",
      review_token: crypto.randomUUID().replace(/-/g, ""),
      channel: channels[0],
      requested_channels: channels,
      delivery_state: "pending",
      send_attempt_count: 0,
      last_send_error: null,
      next_retry_at: null,
      dead_lettered_at: null,
    })
    .select("id")
    .single();

  if (requestError && isMissingColumnError(requestError)) {
    const legacyResult = await supabase
      .from("reputation_requests")
      .insert({
        user_id: userId,
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
        contact_id: contact.id,
        trigger_source: triggerSource,
        external_event_id: externalEventId || null,
        status: "pending",
        review_token: crypto.randomUUID().replace(/-/g, ""),
        delivery_state: "pending",
        send_attempt_count: 0,
        last_send_error: null,
        next_retry_at: null,
        dead_lettered_at: null,
      })
      .select("id")
      .single();
    createdRequest = legacyResult.data;
    requestError = legacyResult.error;
  }

  if (requestError || !createdRequest) {
    if (isMissingTableError(requestError)) {
      return { success: false as const, error: "Reputation tables are not installed yet. Run the migration first.", status: 412 };
    }

    if (externalEventId && requestError?.code === "23505") {
      const { data: existingRequest } = await supabase
        .from("reputation_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("external_event_id", externalEventId)
        .maybeSingle();

      if (existingRequest?.id) {
        await appendReputationLedgerEvent(supabase, {
          userId,
          requestId: existingRequest.id,
          actorType: "system",
          eventType: "request.deduplicated",
          summary: "Ignored duplicate reputation event after a uniqueness conflict.",
          metadata: {
            externalEventId,
            triggerSource,
            conflictCode: requestError.code,
          },
        });

        return { success: true as const, requestId: existingRequest.id, deduplicated: true };
      }
    }

    return { success: false as const, error: requestError?.message || "Failed to create request", status: 500 };
  }

  await appendReputationLedgerEvent(supabase, {
    userId,
    requestId: createdRequest.id,
    actorType: externalEventId ? "webhook" : "user",
    eventType: "request.created",
    toStatus: "pending",
    channel: channels[0],
    summary: "Created a reputation request record.",
    metadata: {
      businessName: businessIdentity.displayName,
      customerName,
      triggerSource,
      externalEventId: externalEventId || null,
      normalizedPhone: contact.phone,
      normalizedEmail: contact.email,
      requestedChannels: channels,
    },
  });

  const sendOutcome = await sendReputationRequestNow(createdRequest.id);

  return { success: true as const, requestId: createdRequest.id, deduplicated: false, sendOutcome };
}

export async function sendReputationRequestNow(requestId: string) {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client unavailable");
  }

  let { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select(
      "id, user_id, business_id, contact_id, status, sent_at, review_token, channel, requested_channels, send_attempt_count, last_send_attempt_at, last_send_error, next_retry_at, dead_lettered_at, delivery_state",
    )
    .eq("id", requestId)
    .single();

  if (requestError && isMissingColumnError(requestError)) {
    const legacyResult = await supabase
      .from("reputation_requests")
      .select(
        "id, user_id, business_id, contact_id, status, sent_at, review_token, send_attempt_count, last_send_attempt_at, last_send_error, next_retry_at, dead_lettered_at, delivery_state",
      )
      .eq("id", requestId)
      .single();
    requestRow = legacyResult.data ? { ...legacyResult.data, channel: "sms", requested_channels: ["sms"] } : null;
    requestError = legacyResult.error;
  }

  if (requestError || !requestRow) {
    throw new Error(requestError?.message || "Request not found");
  }

  if (requestRow.status === "sent" && requestRow.sent_at) {
    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: "request.send_skipped",
      fromStatus: requestRow.status,
      toStatus: requestRow.status,
      channel: "sms",
      summary: "Skipped send because the request was already marked as sent.",
      metadata: {
        sentAt: requestRow.sent_at,
      },
    });

    return {
      success: true,
      simulated: true,
      alreadySent: true,
      attemptCount: requestRow.send_attempt_count ?? 0,
      deliveryState: "sent",
      retryScheduled: false,
    };
  }

  let body = "";
  let transportName: string | null = null;
  let transportSimulated = true;
  let attemptCount = Number(requestRow.send_attempt_count || 0);
  let currentRequestStatus = requestRow.status;

  try {
    let [{ data: settings, error: settingsError }, { data: contact, error: contactError }] = await Promise.all([
      supabase
        .from("reputation_settings")
        .select("sms_template, email_subject, email_template, enabled_channels, primary_channel")
        .eq("user_id", requestRow.user_id)
        .maybeSingle(),
      supabase.from("reputation_contacts").select("name, phone, email, opt_out, sms_opt_out, email_opt_out, preferred_channel").eq("id", requestRow.contact_id).single(),
    ]);

    if (settingsError && isMissingColumnError(settingsError)) {
      const legacySettings = await supabase.from("reputation_settings").select("sms_template").eq("user_id", requestRow.user_id).maybeSingle();
      settings = legacySettings.data;
    }

    if (contactError && isMissingColumnError(contactError)) {
      const legacyContact = await supabase.from("reputation_contacts").select("name, phone, email, opt_out").eq("id", requestRow.contact_id).single();
      contact = legacyContact.data;
      contactError = legacyContact.error;
    }

    if (contactError || !contact) {
      throw new Error(contactError?.message || "Contact not found");
    }

    if (contact.opt_out) {
      await supabase
        .from("reputation_requests")
        .update({
          status: "failed",
          delivery_state: "failed",
          last_send_error: "Contact opted out before send",
          next_retry_at: null,
          dead_lettered_at: new Date().toISOString(),
        })
        .eq("id", requestRow.id);

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        actorType: "job",
        eventType: "request.send_skipped",
        fromStatus: requestRow.status,
        toStatus: "failed",
        channel: "sms",
        summary: "Skipped send because the contact had already opted out.",
        metadata: {
          attemptCount,
          contactId: requestRow.contact_id,
        },
      });

      return {
        success: false,
        simulated: true,
        alreadySent: false,
        attemptCount,
        deliveryState: "failed",
        retryScheduled: false,
        error: "Contact opted out before send",
      };
    }

    const nextAttemptCount = Number(requestRow.send_attempt_count || 0) + 1;
    const attemptedAt = new Date().toISOString();
    const { data: claimedRequest, error: claimError } = await supabase
      .from("reputation_requests")
      .update({
        delivery_state: "sending",
        send_attempt_count: nextAttemptCount,
        last_send_attempt_at: attemptedAt,
        last_send_error: null,
        next_retry_at: null,
        dead_lettered_at: null,
      })
      .eq("id", requestRow.id)
      .eq("send_attempt_count", Number(requestRow.send_attempt_count || 0))
      .is("sent_at", null)
      .neq("status", "sent")
      .select("id, status, send_attempt_count")
      .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message || "Failed to claim reputation send attempt");
    }

    if (!claimedRequest?.id) {
      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        actorType: "job",
        eventType: "request.send_skipped",
        fromStatus: requestRow.status,
        toStatus: requestRow.status,
        channel: "sms",
        summary: "Skipped send because another worker already claimed or completed this request.",
        metadata: {
          requestId: requestRow.id,
        },
      });

      return {
        success: false,
        simulated: true,
        alreadySent: false,
        attemptCount,
        deliveryState: requestRow.delivery_state || "sending",
        retryScheduled: false,
        skipped: true,
        error: "Request already claimed by another worker",
      };
    }

    attemptCount = Number(claimedRequest.send_attempt_count || nextAttemptCount);
    currentRequestStatus = claimedRequest.status || requestRow.status;

    const reviewToken = requestRow.review_token || crypto.randomUUID().replace(/-/g, "");
    const requestedChannels = Array.isArray(requestRow.requested_channels)
      ? requestRow.requested_channels
      : requestRow.channel
        ? [requestRow.channel]
        : [];
    const channels = normalizeRequestedChannels({
      requestedChannels,
      preferredChannel: contact.preferred_channel || settings?.primary_channel,
      phone: contact.sms_opt_out ? "" : contact.phone,
      email: contact.email_opt_out ? "" : contact.email,
      settingsChannels: settings?.enabled_channels,
    });

    if (!channels.length) {
      throw new Error("Contact has no usable reputation request channel");
    }

    const configuredMode = (process.env.GEOTHORITY_REPUTATION_TRANSPORT || "auto").trim().toLowerCase();
    const deliveries = [];
    for (const channel of channels) {
      const reviewLink = buildReviewLink(reviewToken);
      const channelBody =
        channel === "email"
          ? fillReputationMessageTemplate(settings?.email_template || DEFAULT_REPUTATION_SETTINGS.emailTemplate, contact.name || "there", requestRow.business_id, reviewToken)
          : buildReputationMessageBody(settings?.sms_template || DEFAULT_REPUTATION_SETTINGS.smsTemplate, contact.name || "there", requestRow.business_id, reviewToken);
      const subject =
        channel === "email"
          ? fillReputationMessageTemplate(settings?.email_subject || DEFAULT_REPUTATION_SETTINGS.emailSubject, contact.name || "there", requestRow.business_id, reviewToken)
          : null;
      const transport = getReputationChannelTransport(channel);
      transportName = transport.name;
      transportSimulated = transport.simulated;

      if (process.env.NODE_ENV === "production" && channel === "sms" && configuredMode !== "simulated" && transport.simulated) {
        throw new Error("Live SMS reputation transport is not configured for production sends");
      }

      const delivery = await transport.deliver({
        requestId: requestRow.id,
        userId: requestRow.user_id,
        businessName: requestRow.business_id,
        customerName: contact.name || "there",
        channel,
        phone: contact.phone,
        email: contact.email,
        subject,
        body: channelBody,
        html:
          channel === "email"
            ? buildReputationEmailHtml({
                body: channelBody,
                businessName: requestRow.business_id,
                customerName: contact.name || "there",
                reviewToken,
              })
            : null,
        attemptNumber: attemptCount,
        reviewToken,
        reviewLink,
      });
      body = channelBody;
      deliveries.push({ channel, body: channelBody, delivery });

      await bestEffortLogSendAttempt({
        supabase,
        requestId: requestRow.id,
        body: channelBody,
        channel,
        recipient: channel === "email" ? contact.email : contact.phone,
        provider: delivery.provider,
        attemptNumber: attemptCount,
        deliveryState: delivery.deliveryState,
        providerSid: delivery.providerSid,
        simulated: delivery.simulated,
      });
    }

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: "message.outbound_queued",
      fromStatus: currentRequestStatus,
      toStatus: "sent",
      channel: channels[0],
      summary: "Queued the outbound reputation request message.",
      metadata: {
        attemptCount,
        channels,
        bodyPreview: body.slice(0, 160),
        smsTemplateSource: settings?.sms_template ? "custom" : "default",
        emailTemplateSource: settings?.email_template ? "custom" : "default",
        deliveries: deliveries.map((item) => ({
          channel: item.channel,
          transport: item.delivery.provider,
          providerSid: item.delivery.providerSid,
          simulated: item.delivery.simulated,
          transportMetadata: item.delivery.metadata || null,
        })),
      },
    });

    const sentAt = new Date().toISOString();

    const { error: sentUpdateError } = await supabase
      .from("reputation_requests")
      .update({
        status: "sent",
        sent_at: sentAt,
        review_token: reviewToken,
        channel: channels[0],
        requested_channels: channels,
        delivery_state: deliveries.some((item) => item.delivery.deliveryState === "failed") ? "failed" : "sent",
        last_send_error: null,
        next_retry_at: null,
        dead_lettered_at: null,
      })
      .eq("id", requestRow.id);

    if (sentUpdateError && isMissingColumnError(sentUpdateError)) {
      await supabase
        .from("reputation_requests")
        .update({
          status: "sent",
          sent_at: sentAt,
          review_token: reviewToken,
          delivery_state: deliveries.some((item) => item.delivery.deliveryState === "failed") ? "failed" : "sent",
          last_send_error: null,
          next_retry_at: null,
          dead_lettered_at: null,
        })
        .eq("id", requestRow.id);
    }

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: "request.sent",
      fromStatus: currentRequestStatus,
      toStatus: "sent",
      channel: channels[0],
      summary: "Marked the reputation request as sent.",
      metadata: {
        attemptCount,
        sentAt,
        channels,
        deliveries: deliveries.map((item) => ({
          channel: item.channel,
          transport: item.delivery.provider,
          providerSid: item.delivery.providerSid,
          simulated: item.delivery.simulated,
          transportMetadata: item.delivery.metadata || null,
        })),
        reviewTokenPresent: Boolean(reviewToken),
      },
    });

    return {
      success: true,
      simulated: deliveries.every((item) => item.delivery.simulated),
      alreadySent: false,
      attemptCount,
      deliveryState: "sent",
      transport: deliveries.map((item) => item.delivery.provider).join("+"),
      channels,
      retryScheduled: false,
    };
  } catch (error: any) {
    const errorMessage = error?.message || "Failed to send reputation request";
    const retryDelaySeconds = RETRY_DELAYS_SECONDS[attemptCount - 1] ?? null;
    let retryScheduled = false;
    let nextRetryAt: string | null = null;

    if (retryDelaySeconds && attemptCount < MAX_REPUTATION_SEND_ATTEMPTS) {
      try {
        const queueResult = await enqueueReputationSendAttempt({ requestId: requestRow.id, delaySeconds: retryDelaySeconds });
        if (queueResult.scheduled) {
          retryScheduled = true;
          nextRetryAt = buildRetryDate(retryDelaySeconds);
        } else {
          await bestEffortLogSendAttempt({
            supabase,
            requestId: requestRow.id,
            body: body || `Failed to send request ${requestRow.id}`,
            attemptNumber: attemptCount,
            deliveryState: "retry_schedule_failed",
            providerSid: null,
            errorDetail: `Retry not enqueued: ${queueResult.reason}`,
            simulated: transportSimulated,
          });
        }
      } catch (scheduleError: any) {
        await bestEffortLogSendAttempt({
          supabase,
          requestId: requestRow.id,
          body: body || `Failed to send request ${requestRow.id}`,
          attemptNumber: attemptCount,
          deliveryState: "retry_schedule_failed",
          providerSid: null,
          errorDetail: scheduleError?.message || "Failed to schedule retry",
          simulated: transportSimulated,
        });
      }
    }

    const deliveryState = retryScheduled ? "retry_scheduled" : "failed";

    await bestEffortLogSendAttempt({
      supabase,
      requestId: requestRow.id,
      body: body || `Failed to send request ${requestRow.id}`,
      attemptNumber: attemptCount,
      deliveryState,
      providerSid: null,
      errorDetail: errorMessage,
      simulated: transportSimulated,
    });

    const failedStatus = retryScheduled ? "pending" : "failed";
    const deadLetteredAt = retryScheduled ? null : new Date().toISOString();

    await supabase
      .from("reputation_requests")
      .update({
        status: failedStatus,
        delivery_state: deliveryState,
        last_send_error: errorMessage,
        next_retry_at: nextRetryAt,
        dead_lettered_at: deadLetteredAt,
      })
      .eq("id", requestRow.id);

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: retryScheduled ? "request.retry_scheduled" : "request.failed",
      fromStatus: currentRequestStatus,
      toStatus: failedStatus,
      channel: "sms",
      summary: retryScheduled ? "Scheduled a retry after a failed send attempt." : "Marked the reputation request as failed after send attempts were exhausted.",
      metadata: {
        attemptCount,
        deliveryState,
        transport: transportName,
        errorMessage,
        nextRetryAt,
        deadLetteredAt,
      },
    });

    return {
      success: false,
      simulated: transportSimulated,
      alreadySent: false,
      attemptCount,
      deliveryState,
      retryScheduled,
      nextRetryAt,
      error: errorMessage,
    };
  }
}

function buildRate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function emptyAnalytics(): ReputationAnalyticsSummary {
  return {
    requestsSent: 0,
    repliedCount: 0,
    positiveCount: 0,
    proofGeneratedCount: 0,
    replyRate: 0,
    positiveRate: 0,
    proofGenerationRate: 0,
    recovery: {
      totalFeedback: 0,
      unresolved: 0,
      reviewing: 0,
      resolved: 0,
      highSeverity: 0,
    },
    sourcePerformance: [],
  };
}

function buildAnalyticsSummary(requests: any[], proofAssetRows: any[], feedbackItems: any[]): ReputationAnalyticsSummary {
  const requestsSent = requests.filter((item) => Boolean(item.sent_at)).length;
  const repliedCount = requests.filter((item) => Boolean(item.replied_at)).length;
  const positiveCount = requests.filter((item) => item.status === "public_review_ready").length;
  const proofRequestIds = new Set(proofAssetRows.map((item) => item.request_id).filter(Boolean));
  const proofGeneratedCount = proofRequestIds.size;

  const sourcePerformanceMap = new Map<string, ReputationSourcePerformance>();
  for (const request of requests) {
    const key = request.trigger_source || "manual";
    const current = sourcePerformanceMap.get(key) ?? {
      triggerSource: key,
      requestsSent: 0,
      repliedCount: 0,
      positiveCount: 0,
      proofCount: 0,
      feedbackCount: 0,
      replyRate: 0,
      positiveRate: 0,
    };

    if (request.sent_at) current.requestsSent += 1;
    if (request.replied_at) current.repliedCount += 1;
    if (request.status === "public_review_ready") current.positiveCount += 1;
    if (request.status === "feedback_received") current.feedbackCount += 1;
    if (proofRequestIds.has(request.id)) current.proofCount += 1;

    sourcePerformanceMap.set(key, current);
  }

  const sourcePerformance = Array.from(sourcePerformanceMap.values())
    .map((item) => ({
      ...item,
      replyRate: buildRate(item.repliedCount, item.requestsSent),
      positiveRate: buildRate(item.positiveCount, item.repliedCount),
    }))
    .sort((a, b) => b.requestsSent - a.requestsSent || b.repliedCount - a.repliedCount);

  const resolved = feedbackItems.filter((item) => item.follow_up_status === "resolved").length;
  const reviewing = feedbackItems.filter((item) => item.follow_up_status === "reviewing").length;
  const unresolved = feedbackItems.filter((item) => item.follow_up_status !== "resolved").length;
  const highSeverity = feedbackItems.filter((item) => item.severity === "high").length;

  return {
    requestsSent,
    repliedCount,
    positiveCount,
    proofGeneratedCount,
    replyRate: buildRate(repliedCount, requestsSent),
    positiveRate: buildRate(positiveCount, repliedCount),
    proofGenerationRate: buildRate(proofGeneratedCount, positiveCount),
    recovery: {
      totalFeedback: feedbackItems.length,
      unresolved,
      reviewing,
      resolved,
      highSeverity,
    },
    sourcePerformance,
  };
}

export async function getReputationProofSummary(
  supabase: any,
  userId: string,
  options?: { approvedOnly?: boolean; limit?: number },
): Promise<ReputationProofSummary> {
  const approvedOnly = Boolean(options?.approvedOnly);
  const limit = options?.limit ?? 6;

  const proofAssetsQuery = supabase
    .from("reputation_proof_assets")
    .select("id, snippet, approved, created_at, topic, published_to")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (approvedOnly) {
    proofAssetsQuery.eq("approved", true);
  }

  const [requestsResult, proofResult, approvedCountResult, pendingCountResult, proofAssetRowsResult, feedbackItemsResult] = await Promise.all([
    supabase
      .from("reputation_requests")
      .select("id, trigger_source, status, score, sent_at, replied_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    proofAssetsQuery,
    supabase
      .from("reputation_proof_assets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("approved", true),
    approvedOnly
      ? Promise.resolve({ count: 0, error: null })
      : supabase
          .from("reputation_proof_assets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("approved", false),
    supabase
      .from("reputation_proof_assets")
      .select("request_id")
      .eq("user_id", userId),
    supabase
      .from("reputation_feedback_items")
      .select("follow_up_status, severity")
      .eq("user_id", userId),
  ]);

  if (requestsResult.error) {
    if (isMissingTableError(requestsResult.error)) {
      return {
        totalRequests: 0,
        publicReady: 0,
        awaitingReply: 0,
        averageScore: null,
        approvedProofCount: 0,
        pendingProofCount: 0,
        proofAssets: [],
        analytics: emptyAnalytics(),
      };
    }
    throw new Error(requestsResult.error.message || "Failed to load reputation proof summary");
  }

  if (proofResult.error && !isMissingTableError(proofResult.error)) {
    throw new Error(proofResult.error.message || "Failed to load reputation proof assets");
  }

  if (approvedCountResult.error && !isMissingTableError(approvedCountResult.error)) {
    throw new Error(approvedCountResult.error.message || "Failed to load approved proof count");
  }

  if (pendingCountResult?.error && !isMissingTableError(pendingCountResult.error)) {
    throw new Error(pendingCountResult.error.message || "Failed to load pending proof count");
  }

  if (proofAssetRowsResult.error && !isMissingTableError(proofAssetRowsResult.error)) {
    throw new Error(proofAssetRowsResult.error.message || "Failed to load proof asset analytics");
  }

  if (feedbackItemsResult.error && !isMissingTableError(feedbackItemsResult.error)) {
    throw new Error(feedbackItemsResult.error.message || "Failed to load feedback analytics");
  }

  const requests = requestsResult.data ?? [];
  const scoredRequests = requests.filter((item: any) => typeof item.score === "number");
  const totalScore = scoredRequests.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0);

  return {
    totalRequests: requests.length,
    publicReady: requests.filter((item: any) => item.status === "public_review_ready").length,
    awaitingReply: requests.filter((item: any) => item.status === "sent" && !item.replied_at).length,
    averageScore: scoredRequests.length ? Number((totalScore / scoredRequests.length).toFixed(1)) : null,
    approvedProofCount: approvedCountResult.count ?? 0,
    pendingProofCount: approvedOnly ? 0 : pendingCountResult?.count ?? 0,
    proofAssets: proofResult.data ?? [],
    analytics: buildAnalyticsSummary(requests, proofAssetRowsResult.data ?? [], feedbackItemsResult.data ?? []),
  };
}
