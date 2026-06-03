import { createAndSendReputationRequest } from "@/lib/reputation/request-service";

export const ALLOWED_REPUTATION_EVENT_TYPES = new Set(["appointment_completed", "job_completed", "delivery_completed", "api"]);

export interface ReputationEventPayload {
  businessName: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  preferredChannel: "sms" | "email" | null;
  eventType: string;
  externalEventId: string | null;
}

export function normalizeReputationEventPayload(body: any):
  | { success: true; payload: ReputationEventPayload }
  | { success: false; error: string; status: number } {
  const businessName = String(body.businessName || "").trim();
  const customerName = String(body.customerName || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const preferredChannel = body.preferredChannel === "email" || body.preferredChannel === "sms" ? body.preferredChannel : null;
  const eventType = String(body.eventType || body.triggerSource || "api").trim() || "api";
  const externalEventId = String(body.externalEventId || body.eventId || body.idempotencyKey || "").trim() || null;

  if (!businessName || !customerName || (!phone && !email)) {
    return { success: false, error: "businessName, customerName, and phone or email are required", status: 400 };
  }

  if (!ALLOWED_REPUTATION_EVENT_TYPES.has(eventType)) {
    return { success: false, error: "Unsupported eventType", status: 400 };
  }

  return {
    success: true,
    payload: {
      businessName,
      customerName,
      phone: phone || null,
      email: email || null,
      preferredChannel,
      eventType,
      externalEventId,
    },
  };
}

export async function ingestReputationEvent(params: {
  supabase: any;
  userId: string;
  payload: ReputationEventPayload;
}) {
  const { supabase, userId, payload } = params;

  return createAndSendReputationRequest({
    supabase,
    userId,
    businessName: payload.businessName,
    customerName: payload.customerName,
    phone: payload.phone,
    email: payload.email,
    preferredChannel: payload.preferredChannel,
    triggerSource: payload.eventType,
    externalEventId: payload.externalEventId,
  });
}
