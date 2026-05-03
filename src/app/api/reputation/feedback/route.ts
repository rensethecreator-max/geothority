import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { appendReputationLedgerEvent } from "@/lib/reputation/event-ledger";

const FOLLOW_UP_STATUSES = new Set(["new", "reviewing", "outreach_queued", "waiting_on_customer", "resolved"]);
const RECOVERY_OUTCOMES = new Set(["pending", "saved_customer", "refund", "redo_job", "coaching", "no_response", "not_recoverable"]);
const FEEDBACK_TRANSITIONS: Record<string, Set<string>> = {
  new: new Set(["reviewing", "outreach_queued", "waiting_on_customer", "resolved"]),
  reviewing: new Set(["new", "outreach_queued", "waiting_on_customer", "resolved"]),
  outreach_queued: new Set(["reviewing", "waiting_on_customer", "resolved"]),
  waiting_on_customer: new Set(["reviewing", "outreach_queued", "resolved"]),
  resolved: new Set(),
};

function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

function canTransitionFeedbackStatus(fromStatus: string, toStatus: string) {
  if (fromStatus === toStatus) return true;
  return FEEDBACK_TRANSITIONS[fromStatus]?.has(toStatus) ?? false;
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reputation_feedback_items")
      .select("id, severity, topic, feedback_text, follow_up_status, assigned_owner_name, follow_up_due_date, resolution_notes, recovery_outcome, resolved_at, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ items: [], setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [], setupRequired: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceClient();
    if (!serviceSupabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const { id, followUpStatus, assignedOwnerName, followUpDueDate, resolutionNotes, recoveryOutcome } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: existingItem, error: existingItemError } = await serviceSupabase
      .from("reputation_feedback_items")
      .select("id, request_id, follow_up_status, resolution_notes, recovery_outcome")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existingItemError) {
      if (isMissingTableError(existingItemError)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: existingItemError.message }, { status: 500 });
    }

    if (!existingItem) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    const updates: Record<string, string | null> = {};
    let normalizedStatus: string | null = null;
    let normalizedResolutionNotes: string | null | undefined;
    let normalizedRecoveryOutcome: string | null | undefined;

    if (typeof followUpStatus === "string") {
      normalizedStatus = followUpStatus.trim();
      if (!FOLLOW_UP_STATUSES.has(normalizedStatus)) {
        return NextResponse.json({ error: "Invalid followUpStatus" }, { status: 400 });
      }
      if (!canTransitionFeedbackStatus(existingItem.follow_up_status, normalizedStatus)) {
        return NextResponse.json(
          { error: `Invalid feedback transition: ${existingItem.follow_up_status} → ${normalizedStatus}` },
          { status: 409 },
        );
      }
      updates.follow_up_status = normalizedStatus;
      updates.resolved_at = normalizedStatus === "resolved" ? new Date().toISOString() : null;
    }

    if (assignedOwnerName !== undefined) {
      updates.assigned_owner_name = typeof assignedOwnerName === "string" ? assignedOwnerName.trim() || null : null;
    }

    if (followUpDueDate !== undefined) {
      if (followUpDueDate !== null && (typeof followUpDueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(followUpDueDate.trim()))) {
        return NextResponse.json({ error: "followUpDueDate must be YYYY-MM-DD" }, { status: 400 });
      }
      updates.follow_up_due_date = typeof followUpDueDate === "string" ? followUpDueDate.trim() || null : null;
    }

    if (resolutionNotes !== undefined) {
      normalizedResolutionNotes = typeof resolutionNotes === "string" ? resolutionNotes.trim() || null : null;
      updates.resolution_notes = normalizedResolutionNotes;
    }

    if (recoveryOutcome !== undefined) {
      if (recoveryOutcome !== null && (typeof recoveryOutcome !== "string" || !RECOVERY_OUTCOMES.has(recoveryOutcome.trim()))) {
        return NextResponse.json({ error: "Invalid recoveryOutcome" }, { status: 400 });
      }
      normalizedRecoveryOutcome = typeof recoveryOutcome === "string" ? recoveryOutcome.trim() || null : null;
      updates.recovery_outcome = normalizedRecoveryOutcome;
    }

    const targetStatus = normalizedStatus ?? existingItem.follow_up_status;
    const targetResolutionNotes = normalizedResolutionNotes !== undefined ? normalizedResolutionNotes : existingItem.resolution_notes;
    const targetRecoveryOutcome = normalizedRecoveryOutcome !== undefined ? normalizedRecoveryOutcome : existingItem.recovery_outcome;

    if (targetStatus === "resolved") {
      if (!targetResolutionNotes) {
        return NextResponse.json({ error: "resolutionNotes are required before resolving feedback" }, { status: 400 });
      }
      if (!targetRecoveryOutcome || targetRecoveryOutcome === "pending") {
        return NextResponse.json({ error: "A non-pending recoveryOutcome is required before resolving feedback" }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const { data, error } = await serviceSupabase
      .from("reputation_feedback_items")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, request_id, severity, topic, feedback_text, follow_up_status, assigned_owner_name, follow_up_due_date, resolution_notes, recovery_outcome, resolved_at, created_at")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existingItem.follow_up_status !== data.follow_up_status) {
      await appendReputationLedgerEvent(serviceSupabase, {
        userId: session.user.id,
        requestId: data.request_id || null,
        feedbackItemId: data.id,
        actorType: "user",
        actorId: session.user.id,
        eventType: "feedback.status_changed",
        fromStatus: existingItem.follow_up_status,
        toStatus: data.follow_up_status,
        channel: "dashboard",
        summary: `Moved private feedback from ${existingItem.follow_up_status} to ${data.follow_up_status}.`,
        metadata: {
          recoveryOutcome: data.recovery_outcome,
          hasResolutionNotes: Boolean(data.resolution_notes),
        },
      });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
