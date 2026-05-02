import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatTriggerSource } from "@/lib/reputation/format";
import { ingestReputationEvent, normalizeReputationEventPayload } from "@/lib/reputation/event-ingest";

function hasValidWebhookSecret(req: NextRequest) {
  const configuredSecret = process.env.GEOTHORITY_REPUTATION_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return { ok: false as const, error: "GEOTHORITY_REPUTATION_WEBHOOK_SECRET is not configured", status: 503 };
  }

  const providedSecret = req.headers.get("x-geothority-webhook-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!providedSecret || providedSecret !== configuredSecret) {
    return { ok: false as const, error: "Invalid webhook secret", status: 401 };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  try {
    const secretState = hasValidWebhookSecret(req);
    if (!secretState.ok) {
      return NextResponse.json({ error: secretState.error }, { status: secretState.status });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const userId = String(body.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required for webhook ingestion" }, { status: 400 });
    }

    const normalized = normalizeReputationEventPayload({
      ...body,
      idempotencyKey: body.idempotencyKey || req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key"),
    });

    if (!normalized.success) {
      return NextResponse.json({ error: normalized.error }, { status: normalized.status });
    }

    const result = await ingestReputationEvent({
      supabase,
      userId,
      payload: normalized.payload,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      deduplicated: Boolean(result.deduplicated),
      triggerSource: normalized.payload.eventType,
      triggerSourceLabel: formatTriggerSource(normalized.payload.eventType),
      externalEventId: normalized.payload.externalEventId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
