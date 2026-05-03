import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { buildTwilioWebhookUrl, mapTwilioMessageStatus, verifyTwilioSignature } from "@/lib/reputation/twilio";

async function parseFields(req: NextRequest) {
  const formData = await req.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields[key] = value;
  }
  return fields;
}

function hasValidSignature(req: NextRequest, fields: Record<string, string>) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) {
    return { ok: false as const, error: "TWILIO_AUTH_TOKEN is not configured", status: 503 };
  }

  const signature = req.headers.get("x-twilio-signature");
  const url = buildTwilioWebhookUrl(req);
  if (!verifyTwilioSignature({ url, authToken, signature, fields })) {
    return { ok: false as const, error: "Invalid Twilio signature", status: 401 };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  try {
    const fields = await parseFields(req);
    const signatureState = hasValidSignature(req, fields);
    if (!signatureState.ok) {
      return NextResponse.json({ error: signatureState.error }, { status: signatureState.status });
    }

    const messageSid = (fields.MessageSid || "").trim();
    if (!messageSid) {
      return NextResponse.json({ error: "MessageSid is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const deliveryState = mapTwilioMessageStatus(fields.MessageStatus);
    const errorCode = (fields.ErrorCode || "").trim() || null;
    const errorMessage = (fields.ErrorMessage || "").trim() || null;

    const { data: messageLog } = await supabase
      .from("reputation_message_log")
      .select("id, request_id, delivery_state, error_detail")
      .eq("provider_sid", messageSid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!messageLog?.request_id) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const nextErrorDetail = errorMessage || errorCode;
    const messageLogPatch: Record<string, string | null> = {};

    if (messageLog.delivery_state !== deliveryState) {
      messageLogPatch.delivery_state = deliveryState;
    }

    if ((messageLog.error_detail || null) !== nextErrorDetail) {
      messageLogPatch.error_detail = nextErrorDetail;
    }

    if (Object.keys(messageLogPatch).length > 0) {
      await supabase.from("reputation_message_log").update(messageLogPatch).eq("id", messageLog.id);
    }

    const { data: requestRow } = await supabase
      .from("reputation_requests")
      .select("id, user_id, status, delivery_state, last_send_error")
      .eq("id", messageLog.request_id)
      .maybeSingle();

    if (!requestRow?.id) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const nextRequestError =
      deliveryState === "failed" || deliveryState === "undelivered"
        ? errorMessage || errorCode || deliveryState
        : requestRow.last_send_error;

    const requestPatch: Record<string, string | null> = {};

    if (requestRow.delivery_state !== deliveryState) {
      requestPatch.delivery_state = deliveryState;
    }

    if ((requestRow.last_send_error || null) !== (nextRequestError || null)) {
      requestPatch.last_send_error = nextRequestError || null;
    }

    const requestChanged = Object.keys(requestPatch).length > 0;
    const messageLogChanged = Object.keys(messageLogPatch).length > 0;

    if (!requestChanged && !messageLogChanged) {
      return NextResponse.json({ success: true, requestId: requestRow.id, deliveryState, deduped: true });
    }

    if (requestChanged) {
      await supabase.from("reputation_requests").update(requestPatch).eq("id", requestRow.id);
    }

    await appendReputationLedgerEvent(supabase, {
      userId: requestRow.user_id,
      requestId: requestRow.id,
      actorType: "webhook",
      eventType: "message.delivery_updated",
      fromStatus: requestRow.status,
      toStatus: requestRow.status,
      channel: "sms",
      summary: `Updated the outbound message delivery state to ${deliveryState}.`,
      metadata: {
        provider: "twilio",
        providerSid: messageSid,
        deliveryState,
        errorCode,
        errorMessage,
        requestChanged,
        messageLogChanged,
      },
    });

    return NextResponse.json({ success: true, requestId: requestRow.id, deliveryState });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err?.status || 500 });
  }
}
