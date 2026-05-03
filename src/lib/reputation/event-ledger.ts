type ReputationLedgerActorType = "system" | "user" | "customer" | "webhook" | "job";

export interface AppendReputationLedgerEventInput {
  userId: string;
  requestId?: string | null;
  proofAssetId?: string | null;
  feedbackItemId?: string | null;
  actorType?: ReputationLedgerActorType;
  actorId?: string | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  channel?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}

function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

export async function appendReputationLedgerEvent(supabase: any, input: AppendReputationLedgerEventInput) {
  const payload = {
    user_id: input.userId,
    request_id: input.requestId || null,
    proof_asset_id: input.proofAssetId || null,
    feedback_item_id: input.feedbackItemId || null,
    actor_type: input.actorType || "system",
    actor_id: input.actorId || null,
    event_type: input.eventType,
    from_status: input.fromStatus || null,
    to_status: input.toStatus || null,
    channel: input.channel || null,
    summary: input.summary || null,
    metadata: input.metadata || {},
  };

  const { error } = await supabase.from("reputation_event_ledger").insert(payload);
  if (!error) {
    return { success: true as const };
  }

  if (isMissingTableError(error)) {
    return { success: false as const, skipped: true as const, reason: "missing_table" as const };
  }

  console.error("Failed to append reputation ledger event", {
    eventType: input.eventType,
    requestId: input.requestId || null,
    error,
  });

  return { success: false as const, skipped: true as const, reason: "insert_failed" as const, error };
}
