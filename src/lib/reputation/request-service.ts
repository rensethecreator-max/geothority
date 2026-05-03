import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { getReputationTransport } from "@/lib/reputation/transport";
import type { ReputationAnalyticsSummary, ReputationProofSummary, ReputationSourcePerformance } from "@/lib/reputation/types";

const MAX_REPUTATION_SEND_ATTEMPTS = 3;
const RETRY_DELAYS_SECONDS = [5 * 60, 30 * 60];

export function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
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

  const response = await fetch(`${qstashUrl}/v2/publish/${appUrl}/api/reputation/jobs/send-request`, {
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
  attemptNumber: number;
  deliveryState: string;
  providerSid?: string | null;
  errorDetail?: string | null;
  simulated?: boolean;
}) {
  const { supabase, requestId, body, attemptNumber, deliveryState, providerSid = null, errorDetail = null, simulated = true } = params;

  try {
    await supabase.from("reputation_message_log").insert({
      request_id: requestId,
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

function buildReputationMessageBody(template: string, customerName: string, businessName: string) {
  return template.replace("{customer_name}", customerName || "there").replace("{business_name}", businessName);
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
  const businessIdentity = getReputationBusinessIdentity(businessId);

  let { data: contact } = await supabase
    .from("reputation_contacts")
    .select("id, name, phone, opt_out")
    .eq("user_id", userId)
    .eq("business_key", businessIdentity.businessKey)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!contact) {
    const { data: createdContact, error: contactError } = await supabase
      .from("reputation_contacts")
      .insert({
        user_id: userId,
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
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
      .update({
        business_id: businessIdentity.displayName,
        business_key: businessIdentity.businessKey,
        name: customerName || contact.name,
        phone: normalizedPhone,
        source,
      })
      .eq("id", contact.id);
    contact = { ...contact, name: customerName || contact.name, phone: normalizedPhone };
  }

  return contact;
}

export async function createAndSendReputationRequest(params: {
  supabase: any;
  userId: string;
  businessName: string;
  customerName: string;
  phone: string;
  triggerSource: string;
  externalEventId?: string | null;
}) {
  const { supabase, userId, businessName, customerName, phone, triggerSource, externalEventId } = params;
  const businessIdentity = getReputationBusinessIdentity(businessName);

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
    phone,
    source: triggerSource,
  });

  if (contact.opt_out) {
    return { success: false as const, error: "This contact has opted out of reputation requests", status: 409 };
  }

  const { data: createdRequest, error: requestError } = await supabase
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
    channel: "sms",
    summary: "Created a reputation request record.",
    metadata: {
      businessName: businessIdentity.displayName,
      customerName,
      triggerSource,
      externalEventId: externalEventId || null,
      normalizedPhone: contact.phone,
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

  const { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select(
      "id, user_id, business_id, contact_id, status, sent_at, review_token, send_attempt_count, last_send_attempt_at, last_send_error, next_retry_at, dead_lettered_at, delivery_state",
    )
    .eq("id", requestId)
    .single();

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

  const attemptCount = Number(requestRow.send_attempt_count || 0) + 1;
  const attemptedAt = new Date().toISOString();

  await supabase
    .from("reputation_requests")
    .update({
      delivery_state: "sending",
      send_attempt_count: attemptCount,
      last_send_attempt_at: attemptedAt,
      last_send_error: null,
      next_retry_at: null,
      dead_lettered_at: null,
    })
    .eq("id", requestRow.id);

  let body = "";
  let transportName: string | null = null;

  try {
    const [{ data: settings }, { data: contact, error: contactError }] = await Promise.all([
      supabase.from("reputation_settings").select("sms_template").eq("user_id", requestRow.user_id).maybeSingle(),
      supabase.from("reputation_contacts").select("name, phone").eq("id", requestRow.contact_id).single(),
    ]);

    if (contactError || !contact) {
      throw new Error(contactError?.message || "Contact not found");
    }

    if (!contact.phone) {
      throw new Error("Contact phone is missing");
    }

    body = buildReputationMessageBody(settings?.sms_template || DEFAULT_REPUTATION_SETTINGS.smsTemplate, contact.name || "there", requestRow.business_id);
    const reviewToken = requestRow.review_token || crypto.randomUUID().replace(/-/g, "");
    const transport = getReputationTransport();
    transportName = transport.name;
    const delivery = await transport.deliver({
      requestId: requestRow.id,
      userId: requestRow.user_id,
      businessName: requestRow.business_id,
      customerName: contact.name || "there",
      phone: contact.phone,
      body,
      attemptNumber: attemptCount,
      reviewToken,
    });

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: "message.outbound_queued",
      fromStatus: requestRow.status,
      toStatus: "sent",
      channel: "sms",
      summary: "Queued the outbound reputation request message.",
      metadata: {
        attemptCount,
        bodyPreview: body.slice(0, 160),
        templateSource: settings?.sms_template ? "custom" : "default",
        transport: delivery.provider,
        providerSid: delivery.providerSid,
        simulated: delivery.simulated,
      },
    });

    await bestEffortLogSendAttempt({
      supabase,
      requestId: requestRow.id,
      body,
      attemptNumber: attemptCount,
      deliveryState: delivery.deliveryState,
      providerSid: delivery.providerSid,
      simulated: delivery.simulated,
    });

    const sentAt = new Date().toISOString();

    await supabase
      .from("reputation_requests")
      .update({
        status: "sent",
        sent_at: sentAt,
        review_token: reviewToken,
        delivery_state: delivery.deliveryState,
        last_send_error: null,
        next_retry_at: null,
        dead_lettered_at: null,
      })
      .eq("id", requestRow.id);

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "job",
      eventType: "request.sent",
      fromStatus: requestRow.status,
      toStatus: "sent",
      channel: "sms",
      summary: "Marked the reputation request as sent.",
      metadata: {
        attemptCount,
        sentAt,
        transport: delivery.provider,
        providerSid: delivery.providerSid,
        simulated: delivery.simulated,
        reviewTokenPresent: Boolean(reviewToken),
      },
    });

    return {
      success: true,
      simulated: delivery.simulated,
      alreadySent: false,
      attemptCount,
      deliveryState: delivery.deliveryState,
      transport: delivery.provider,
      providerSid: delivery.providerSid,
      retryScheduled: false,
    };
  } catch (error: any) {
    const errorMessage = error?.message || "Failed to send reputation request";
    const retryDelaySeconds = RETRY_DELAYS_SECONDS[attemptCount - 1] ?? null;
    let retryScheduled = false;
    let nextRetryAt: string | null = null;

    if (retryDelaySeconds && attemptCount < MAX_REPUTATION_SEND_ATTEMPTS) {
      try {
        await enqueueReputationSendAttempt({ requestId: requestRow.id, delaySeconds: retryDelaySeconds });
        retryScheduled = true;
        nextRetryAt = buildRetryDate(retryDelaySeconds);
      } catch (scheduleError: any) {
        await bestEffortLogSendAttempt({
          supabase,
          requestId: requestRow.id,
        body: body || `Failed to send request ${requestRow.id}`,
        attemptNumber: attemptCount,
        deliveryState: "retry_schedule_failed",
        providerSid: null,
        errorDetail: scheduleError?.message || "Failed to schedule retry",
        simulated: true,
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
      simulated: true,
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
      fromStatus: requestRow.status,
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
      simulated: true,
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
