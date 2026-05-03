import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { isMissingTableError } from "@/lib/reputation/request-service";

export interface RecordReputationReplyParams {
  supabase: any;
  requestId: string;
  score: number;
  feedbackText?: string;
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

  if (requestRow.replied_at) {
    const sameScore = requestRow.score === score;
    const sameFeedback = (requestRow.feedback_text || "") === (feedbackText || "");

    if (!sameScore || !sameFeedback) {
      throw Object.assign(new Error("This request already has a recorded response."), { status: 409 });
    }
  }

  if (!requestRow.replied_at) {
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

  if (belowThreshold) {
    const feedbackPayload = {
      severity: score <= 2 ? "high" : "medium",
      topic: `Low rating (${score}/5)`,
      feedback_text: feedbackText || `Customer replied with a ${score}/5 score and no written feedback.`,
    };

    const { data: existingFeedback } = await supabase
      .from("reputation_feedback_items")
      .select("id, follow_up_status, assigned_owner_name, follow_up_due_date, resolution_notes, recovery_outcome, resolved_at")
      .eq("request_id", requestRow.id)
      .maybeSingle();

    if (existingFeedback?.id) {
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
        summary: "Updated the private feedback recovery record.",
        metadata: {
          severity: feedbackPayload.severity,
          topic: feedbackPayload.topic,
        },
      });
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
        summary: "Created a private feedback recovery record.",
        metadata: {
          severity: feedbackPayload.severity,
          topic: feedbackPayload.topic,
        },
      });
    }
  } else if (feedbackText) {
    const proofPayload = {
      snippet: feedbackText,
      topic: `Review snippet (${score}/5)`,
      sentiment: "positive",
    };

    const { data: existingProof } = await supabase
      .from("reputation_proof_assets")
      .select("id, approved, published_to")
      .eq("request_id", requestRow.id)
      .maybeSingle();

    if (existingProof?.id) {
      const resetPublishedTargets = existingProof.approved ? [] : existingProof.published_to;
      const { error: proofUpdateError } = await supabase
        .from("reputation_proof_assets")
        .update({
          ...proofPayload,
          approved: false,
          published_to: resetPublishedTargets,
        })
        .eq("id", existingProof.id);

      if (proofUpdateError) {
        throw Object.assign(new Error(proofUpdateError.message), { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        proofAssetId: existingProof.id,
        actorType: "system",
        eventType: "proof.updated",
        fromStatus: existingProof.approved ? "approved" : "pending_review",
        toStatus: "pending_review",
        channel: "review_link",
        summary: "Updated a proof asset from a positive reply.",
        metadata: {
          topic: proofPayload.topic,
          approvalReset: existingProof.approved,
          publishedTo: resetPublishedTargets,
        },
      });
    } else {
      const { data: createdProof, error: proofInsertError } = await supabase
        .from("reputation_proof_assets")
        .insert({
          user_id: requestRow.user_id,
          business_id: requestRow.business_id,
          business_key: requestRow.business_key || businessIdentity.businessKey,
          request_id: requestRow.id,
          ...proofPayload,
          approved: false,
        })
        .select("id")
        .single();

      if (proofInsertError) {
        throw Object.assign(new Error(proofInsertError.message), { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        proofAssetId: createdProof?.id,
        actorType: "system",
        eventType: "proof.created",
        toStatus: "pending_review",
        channel: "review_link",
        summary: "Created a proof asset from a positive reply.",
        metadata: {
          topic: proofPayload.topic,
        },
      });
    }
  }

  return {
    success: true,
    status: nextStatus,
    positiveThreshold,
    duplicateIgnored: Boolean(requestRow.replied_at),
  };
}
