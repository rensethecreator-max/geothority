import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { isMissingTableError } from "@/lib/reputation/request-service";

export interface RecordReputationReplyParams {
  supabase: any;
  requestId: string;
  score: number;
  feedbackText?: string;
  customerPermission?: boolean;
  providerSid?: string | null;
  channel?: string;
}

export interface RecordReputationReplyResult {
  success: true;
  status: string;
  positiveThreshold: number;
  duplicateIgnored: boolean;
}

export async function recordReputationReply(
  params: RecordReputationReplyParams,
): Promise<RecordReputationReplyResult> {
  const {
    supabase,
    requestId,
    score,
    feedbackText: rawFeedbackText = "",
    customerPermission = false,
    providerSid = null,
    channel = "sms",
  } = params;

  const feedbackText = rawFeedbackText.trim();

  const { data: requestRow, error: requestError } = await supabase
    .from("reputation_requests")
    .select("id, user_id, business_id, business_key, status, score, feedback_text, replied_at")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) {
    if (isMissingTableError(requestError)) {
      throw Object.assign(new Error("Reputation tables are not installed yet. Run the migration first."), { status: 412 });
    }
    throw Object.assign(new Error(requestError?.message || "Request not found"), { status: 404 });
  }

  const { data: settings } = await supabase
    .from("reputation_settings")
    .select("positive_threshold")
    .eq("user_id", requestRow.user_id)
    .maybeSingle();

  const positiveThreshold = settings?.positive_threshold ?? DEFAULT_REPUTATION_SETTINGS.positiveThreshold;
  const repliedAt = new Date().toISOString();
  const belowThreshold = score < positiveThreshold;
  const nextStatus = belowThreshold ? "feedback_received" : "public_review_ready";

  const duplicateIgnored = Boolean(requestRow.replied_at);
  if (duplicateIgnored) {
    const sameScore = requestRow.score === score;
    const sameFeedback = (requestRow.feedback_text || "") === (feedbackText || "");

    if (!sameScore || !sameFeedback) {
      throw Object.assign(new Error("This request already has a recorded response."), { status: 409 });
    }

  }

  if (!duplicateIgnored) {
    const { error: updateError } = await supabase
      .from("reputation_requests")
      .update({
        score,
        feedback_text: feedbackText || null,
        replied_at: repliedAt,
        status: nextStatus,
      })
      .eq("id", requestRow.id);

    if (updateError) {
      throw Object.assign(new Error(updateError.message), { status: 500 });
    }

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "customer",
      eventType: "request.reply_recorded",
      fromStatus: requestRow.status,
      toStatus: nextStatus,
      channel,
      summary: "Recorded a customer reply and advanced the request state.",
      metadata: {
        score,
        repliedAt,
        feedbackProvided: Boolean(feedbackText),
        positiveThreshold,
        providerSid,
      },
    });
  }

  const inboundBody = feedbackText ? `${score}: ${feedbackText}` : String(score);

  const { data: existingMessageLog } = await supabase
    .from("reputation_message_log")
    .select("id")
    .eq("request_id", requestRow.id)
    .eq("direction", "in")
    .eq("body", inboundBody)
    .limit(1)
    .maybeSingle();

  if (!existingMessageLog) {
    const { error: logError } = await supabase.from("reputation_message_log").insert({
      request_id: requestRow.id,
      direction: "in",
      body: inboundBody,
      provider_sid: providerSid,
      delivery_state: "received",
      simulated: false,
    });

    if (logError) {
      throw Object.assign(new Error(logError.message), { status: 500 });
    }

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "customer",
      eventType: "message.inbound_logged",
      channel,
      summary: "Logged an inbound customer reply.",
      metadata: {
        score,
        bodyPreview: inboundBody.slice(0, 160),
        providerSid,
      },
    });
  }

  const businessIdentity = getReputationBusinessIdentity(requestRow.business_id || "");

  // Private notes remain private regardless of score. Never turn customer
  // feedback into public proof without explicit, separate permission.
  if (belowThreshold || feedbackText) {
    const feedbackPayload = {
      severity: score <= 2 ? "high" : score < positiveThreshold ? "medium" : "low",
      topic: `Private feedback (${score}/5)`,
      feedback_text: feedbackText || `Customer replied with a ${score}/5 score and no written feedback.`,
    };

    const { data: existingFeedback } = await supabase
      .from("reputation_feedback_items")
      .select("id, follow_up_status, assigned_owner_name, follow_up_due_date, resolution_notes, recovery_outcome, resolved_at")
      .eq("request_id", requestRow.id)
      .maybeSingle();

    if (existingFeedback?.id) {
      if (duplicateIgnored) {
        // A retry after a partial failure may find the feedback row already saved.
      } else {
      const { error: feedbackUpdateError } = await supabase
        .from("reputation_feedback_items")
        .update({
          ...feedbackPayload,
          follow_up_status: existingFeedback.follow_up_status === "resolved" ? existingFeedback.follow_up_status : "new",
          recovery_outcome: existingFeedback.recovery_outcome || "pending",
        })
        .eq("id", existingFeedback.id);

      if (feedbackUpdateError) {
        throw Object.assign(new Error(feedbackUpdateError.message), { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        feedbackItemId: existingFeedback.id,
        actorType: "system",
        eventType: "feedback.updated",
        toStatus: existingFeedback.follow_up_status === "resolved" ? "resolved" : "new",
        channel,
        summary: "Updated the private feedback follow-up record.",
        metadata: {
          severity: feedbackPayload.severity,
          topic: feedbackPayload.topic,
        },
      });
      }
    } else {
      const feedbackInsertPayload = {
        user_id: requestRow.user_id,
        request_id: requestRow.id,
        business_id: requestRow.business_id,
        business_key: requestRow.business_key || businessIdentity.businessKey,
        ...feedbackPayload,
        follow_up_status: "new",
        recovery_outcome: "pending",
      };

      const { data: createdFeedback, error: feedbackInsertError } = await supabase
        .from("reputation_feedback_items")
        .insert(feedbackInsertPayload)
        .select("id, follow_up_status")
        .single();

      if (feedbackInsertError) {
        throw Object.assign(new Error(feedbackInsertError.message), { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        feedbackItemId: createdFeedback?.id,
        actorType: "system",
        eventType: "feedback.created",
        toStatus: createdFeedback?.follow_up_status || "new",
        channel,
        summary: "Created a private feedback follow-up record.",
        metadata: {
          severity: feedbackPayload.severity,
          topic: feedbackPayload.topic,
        },
      });
    }
  }

  if (customerPermission && feedbackText) {
    const { data: existingProof, error: proofLookupError } = await supabase
      .from("reputation_proof_assets")
      .select("id, customer_permission_at")
      .eq("request_id", requestRow.id)
      .limit(1)
      .maybeSingle();
    if (proofLookupError) throw Object.assign(new Error(proofLookupError.message), { status: 500 });

    const permissionAt = new Date().toISOString();
    if (existingProof?.id && !existingProof.customer_permission_at) {
      const { error: permissionError } = await supabase
        .from("reputation_proof_assets")
        .update({ customer_permission_at: permissionAt, approved: false, published_to: [] })
        .eq("id", existingProof.id);
      if (permissionError) throw Object.assign(new Error(permissionError.message), { status: 500 });

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        proofAssetId: existingProof.id,
        actorType: "customer",
        eventType: "proof.customer_permission_recorded",
        channel,
        summary: "Customer explicitly permitted their note to be reviewed as a possible quote.",
        metadata: { permissionAt, businessApprovalRequired: true },
      });
    } else if (!existingProof?.id) {
      const { data: createdProof, error: proofInsertError } = await supabase
        .from("reputation_proof_assets")
        .insert({
          user_id: requestRow.user_id,
          business_id: requestRow.business_id,
          business_key: requestRow.business_key || businessIdentity.businessKey,
          request_id: requestRow.id,
          snippet: feedbackText,
          topic: "Customer-authorized quote",
          sentiment: "unspecified",
          customer_permission_at: permissionAt,
          approved: false,
          published_to: [],
        })
        .select("id")
        .single();
      if (proofInsertError) throw Object.assign(new Error(proofInsertError.message), { status: 500 });

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        proofAssetId: createdProof?.id,
        actorType: "customer",
        eventType: "proof.customer_permission_recorded",
        channel,
        summary: "Customer explicitly permitted their note to be reviewed as a possible quote.",
        metadata: { permissionAt, businessApprovalRequired: true },
      });
    }
  }

  return {
    success: true,
    status: duplicateIgnored ? requestRow.status : nextStatus,
    positiveThreshold,
    duplicateIgnored,
  };
}
