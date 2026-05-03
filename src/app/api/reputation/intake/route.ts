import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_REPUTATION_SETTINGS } from "@/lib/reputation/defaults";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { isMissingTableError } from "@/lib/reputation/request-service";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const requestId = String(body.requestId || "").trim();
    const score = Number(body.score);
    const feedbackText = typeof body.feedbackText === "string" ? body.feedbackText.trim() : "";

    if (!requestId || !Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "requestId and score (1-5) are required" }, { status: 400 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("reputation_requests")
      .select("id, user_id, business_id, status, score, feedback_text, replied_at")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      if (isMissingTableError(requestError)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: requestError?.message || "Request not found" }, { status: 404 });
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
        return NextResponse.json(
          { error: "This request already has a recorded response." },
          { status: 409 },
        );
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
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        actorType: "customer",
        eventType: "request.reply_recorded",
        fromStatus: requestRow.status,
        toStatus: nextStatus,
        channel: "sms",
        summary: "Recorded a customer reply and advanced the request state.",
        metadata: {
          score,
          repliedAt,
          feedbackProvided: Boolean(feedbackText),
          positiveThreshold,
        },
      });
    }

    const { data: existingMessageLog } = await supabase
      .from("reputation_message_log")
      .select("id")
      .eq("request_id", requestRow.id)
      .eq("direction", "in")
      .eq("body", feedbackText ? `${score}: ${feedbackText}` : String(score))
      .limit(1)
      .maybeSingle();

    if (!existingMessageLog) {
      const inboundBody = feedbackText ? `${score}: ${feedbackText}` : String(score);
      const { error: logError } = await supabase.from("reputation_message_log").insert({
        request_id: requestRow.id,
        direction: "in",
        body: inboundBody,
        provider_sid: null,
      });

      if (logError) {
        return NextResponse.json({ error: logError.message }, { status: 500 });
      }

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        actorType: "customer",
        eventType: "message.inbound_logged",
        channel: "sms",
        summary: "Logged an inbound customer reply.",
        metadata: {
          score,
          bodyPreview: inboundBody.slice(0, 160),
        },
      });
    }

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
          return NextResponse.json({ error: feedbackUpdateError.message }, { status: 500 });
        }

        await appendReputationLedgerEvent(supabase, {
          userId: requestRow.user_id,
          requestId: requestRow.id,
          feedbackItemId: existingFeedback.id,
          actorType: "system",
          eventType: "feedback.updated",
          toStatus: existingFeedback.follow_up_status === "resolved" ? "resolved" : "new",
          channel: "sms",
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
          return NextResponse.json({ error: feedbackInsertError.message }, { status: 500 });
        }

        await appendReputationLedgerEvent(supabase, {
          userId: requestRow.user_id,
          requestId: requestRow.id,
          feedbackItemId: createdFeedback?.id,
          actorType: "system",
          eventType: "feedback.created",
          toStatus: createdFeedback?.follow_up_status || "new",
          channel: "sms",
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
          return NextResponse.json({ error: proofUpdateError.message }, { status: 500 });
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
            request_id: requestRow.id,
            ...proofPayload,
            approved: false,
          })
          .select("id")
          .single();

        if (proofInsertError) {
          return NextResponse.json({ error: proofInsertError.message }, { status: 500 });
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

    return NextResponse.json({ success: true, status: nextStatus, positiveThreshold, duplicateIgnored: Boolean(requestRow.replied_at) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
