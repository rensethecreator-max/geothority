import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { formatTriggerSource } from "@/lib/reputation/format";
import { ingestReputationEvent, normalizeReputationEventPayload } from "@/lib/reputation/event-ingest";
import { isMissingTableError } from "@/lib/reputation/request-service";

async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId")?.trim() || null;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 100);

    let query = supabase
      .from("reputation_event_ledger")
      .select("id, request_id, proof_asset_id, feedback_item_id, actor_type, actor_id, event_type, from_status, to_status, channel, summary, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (requestId) {
      query = query.eq("request_id", requestId);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ events: [], setupRequired: true });
      }
      return NextResponse.json({ error: error.message || "Failed to load reputation event history" }, { status: 500 });
    }

    return NextResponse.json({ events: data ?? [], setupRequired: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const normalized = normalizeReputationEventPayload({
      ...body,
      idempotencyKey: body.idempotencyKey || req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key"),
    });

    if (!normalized.success) {
      return NextResponse.json({ error: normalized.error }, { status: normalized.status });
    }

    const result = await ingestReputationEvent({
      supabase,
      userId: user.id,
      payload: normalized.payload,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      deduplicated: Boolean(result.deduplicated),
      sendOutcome: result.sendOutcome ?? null,
      triggerSource: normalized.payload.eventType,
      triggerSourceLabel: formatTriggerSource(normalized.payload.eventType),
      externalEventId: normalized.payload.externalEventId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
