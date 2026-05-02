import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import type { ReputationAnalyticsSummary, ReputationProofSummary, ReputationSourcePerformance } from "@/lib/reputation/types";

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
      return { success: true as const, requestId: existingRequest.id, deduplicated: true };
    }
  }

  const contact = await upsertReputationContact({
    supabase,
    userId,
    businessId: businessName,
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
      business_id: businessName,
      contact_id: contact.id,
      trigger_source: triggerSource,
      external_event_id: externalEventId || null,
      status: "pending",
      review_token: crypto.randomUUID().replace(/-/g, ""),
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
        return { success: true as const, requestId: existingRequest.id, deduplicated: true };
      }
    }

    return { success: false as const, error: requestError?.message || "Failed to create request", status: 500 };
  }

  await sendReputationRequestNow(createdRequest.id);

  return { success: true as const, requestId: createdRequest.id, deduplicated: false };
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
