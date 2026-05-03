import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { ReputationDeliveryResult, ReputationOutboundMessage, ReputationTransport } from "@/lib/reputation/transport";

const TWILIO_STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);

export type TwilioMessageStatus =
  | "accepted"
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "receiving"
  | "received"
  | "read";

export function normalizeSmsPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function isStopKeyword(body: string) {
  return TWILIO_STOP_KEYWORDS.has(body.trim().toLowerCase());
}

export function extractScoreAndFeedback(body: string) {
  const trimmed = body.trim();
  const match = trimmed.match(/\b([1-5])\b/);
  if (!match || match.index == null) return null;

  const score = Number(match[1]);
  const feedbackText = `${trimmed.slice(0, match.index)} ${trimmed.slice(match.index + match[0].length)}`
    .replace(/^[\s:,-]+|[\s:,-]+$/g, "")
    .trim();

  return { score, feedbackText };
}

function getConfiguredBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
}

export function buildTwilioWebhookUrl(req: NextRequest) {
  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;
  }

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  return `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

export function verifyTwilioSignature(params: {
  url: string;
  authToken: string;
  signature: string | null;
  fields: Record<string, string>;
}) {
  const { url, authToken, signature, fields } = params;
  if (!signature) return false;

  const payload = `${url}${Object.keys(fields)
    .sort()
    .map((key) => `${key}${fields[key]}`)
    .join("")}`;

  const expected = createHmac("sha1", authToken).update(payload).digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function mapTwilioMessageStatus(status: string | null | undefined): TwilioMessageStatus {
  const normalized = (status || "sent").trim().toLowerCase();
  switch (normalized) {
    case "accepted":
    case "scheduled":
    case "queued":
    case "sending":
    case "sent":
    case "delivered":
    case "undelivered":
    case "failed":
    case "receiving":
    case "received":
    case "read":
      return normalized;
    default:
      return "sent";
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the Twilio reputation transport`);
  }
  return value;
}

function buildStatusCallbackUrl() {
  const baseUrl = getConfiguredBaseUrl();
  if (!baseUrl) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL is required for Twilio status callbacks");
  }
  return `${baseUrl}/api/reputation/twilio/status`;
}

export class TwilioReputationTransport implements ReputationTransport {
  readonly name = "twilio" as const;
  readonly simulated = false;

  async deliver(message: ReputationOutboundMessage): Promise<ReputationDeliveryResult> {
    const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID");
    const authToken = getRequiredEnv("TWILIO_AUTH_TOKEN");
    const fromNumber = message.fromNumber?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

    if (!fromNumber && !messagingServiceSid) {
      throw new Error("TWILIO_FROM_NUMBER, reputation_settings.twilio_number, or TWILIO_MESSAGING_SERVICE_SID must be configured");
    }

    const form = new URLSearchParams({
      To: message.phone,
      Body: message.body,
      StatusCallback: buildStatusCallbackUrl(),
    });

    if (messagingServiceSid) {
      form.set("MessagingServiceSid", messagingServiceSid);
    } else if (fromNumber) {
      form.set("From", fromNumber);
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.message || `Twilio send failed (${response.status})`);
    }

    return {
      provider: this.name,
      providerSid: json?.sid || null,
      deliveryState: mapTwilioMessageStatus(json?.status),
      simulated: false,
      metadata: {
        status: json?.status || null,
        to: json?.to || message.phone,
        from: json?.from || fromNumber || null,
        messagingServiceSid: json?.messaging_service_sid || messagingServiceSid || null,
      },
    };
  }
}
