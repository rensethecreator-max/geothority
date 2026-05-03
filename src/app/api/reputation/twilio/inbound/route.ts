import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";
import { recordReputationReply } from "@/lib/reputation/intake-service";
import {
  buildTwilioWebhookUrl,
  extractScoreAndFeedback,
  extractRequestReference,
  isStopKeyword,
  normalizeSmsPhone,
  verifyTwilioSignature,
} from "@/lib/reputation/twilio";

function twiml(message?: string) {
  const body = message ? `<Response><Message>${escapeXml(message)}</Message></Response>` : "<Response></Response>";
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const fromPhone = normalizeSmsPhone(fields.From || "");
    const body = (fields.Body || "").trim();
    const providerSid = fields.MessageSid || null;
    const requestReference = extractRequestReference(body);

    if (!fromPhone || !body) {
      return twiml();
    }

    if (providerSid) {
      const { data: existingInbound } = await supabase
        .from("reputation_message_log")
        .select("id")
        .eq("provider_sid", providerSid)
        .eq("direction", "in")
        .limit(1)
        .maybeSingle();

      if (existingInbound?.id) {
        return twiml("Thanks for your feedback.");
      }
    }

    const { data: contacts } = await supabase
      .from("reputation_contacts")
      .select("id")
      .eq("phone", fromPhone)
      .order("created_at", { ascending: false })
      .limit(10);

    const contactIds = (contacts || []).map((item: { id: string }) => item.id).filter(Boolean);
    if (!contactIds.length) {
      return twiml("Thanks — we couldn't match that request, but your reply was received.");
    }

    let requestQuery = supabase
      .from("reputation_requests")
      .select("id, user_id, status, replied_at, contact_id, sent_at, created_at, review_token")
      .in("contact_id", contactIds)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(10);

    if (requestReference) {
      requestQuery = requestQuery.ilike("review_token", `${requestReference.toLowerCase()}%`);
    }

    const { data: requestRows } = await requestQuery;

    const openSentRequest = (requestRows || []).find(
      (item: { sent_at?: string | null; replied_at?: string | null; status?: string | null }) =>
        Boolean(item.sent_at) && !item.replied_at && item.status === "sent",
    );
    const requestRow =
      openSentRequest ||
      (requestRows || []).find((item: { sent_at?: string | null; replied_at?: string | null }) => Boolean(item.sent_at) && !item.replied_at) ||
      (requestRows || []).find((item: { sent_at?: string | null }) => Boolean(item.sent_at)) ||
      requestRows?.[0];
    if (!requestRow?.id) {
      return twiml("Thanks — we couldn't match that request, but your reply was received.");
    }

    if (isStopKeyword(body)) {
      await supabase.from("reputation_contacts").update({ opt_out: true }).eq("id", requestRow.contact_id);

      await supabase.from("reputation_message_log").insert({
        request_id: requestRow.id,
        direction: "in",
        body,
        provider_sid: providerSid,
        delivery_state: "received",
        simulated: false,
      });

      await appendReputationLedgerEvent(supabase, {
        userId: requestRow.user_id,
        requestId: requestRow.id,
        actorType: "customer",
        eventType: "contact.opted_out",
        channel: "sms",
        summary: "Customer replied STOP and was opted out of future reputation texts.",
        metadata: {
          providerSid,
          keyword: body.toLowerCase(),
          phone: fromPhone,
          matchedContactCount: 1,
          optedOutContactId: requestRow.contact_id,
          requestReference,
        },
      });

      return twiml("You’ve been opted out. No more review texts will be sent.");
    }

    const parsedReply = extractScoreAndFeedback(body);
    if (!parsedReply) {
      return twiml("Please reply with a number from 1 to 5, optionally followed by feedback.");
    }

    await recordReputationReply({
      supabase,
      requestId: requestRow.id,
      score: parsedReply.score,
      feedbackText: parsedReply.feedbackText,
      providerSid,
      channel: "sms",
    });

    return twiml("Thanks for your feedback.");
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err?.status || 500 });
  }
}
