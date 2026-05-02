import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const FOLLOW_UP_STATUSES = new Set(["new", "reviewing", "outreach_queued", "waiting_on_customer", "resolved"]);
const RECOVERY_OUTCOMES = new Set(["pending", "saved_customer", "refund", "redo_job", "coaching", "no_response", "not_recoverable"]);

function isMissingTableError(error: any) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
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

    const { id, followUpStatus, assignedOwnerName, followUpDueDate, resolutionNotes, recoveryOutcome } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};

    if (typeof followUpStatus === "string") {
      const normalizedStatus = followUpStatus.trim();
      if (!FOLLOW_UP_STATUSES.has(normalizedStatus)) {
        return NextResponse.json({ error: "Invalid followUpStatus" }, { status: 400 });
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
      updates.resolution_notes = typeof resolutionNotes === "string" ? resolutionNotes.trim() || null : null;
    }

    if (recoveryOutcome !== undefined) {
      if (recoveryOutcome !== null && (typeof recoveryOutcome !== "string" || !RECOVERY_OUTCOMES.has(recoveryOutcome.trim()))) {
        return NextResponse.json({ error: "Invalid recoveryOutcome" }, { status: 400 });
      }
      updates.recovery_outcome = typeof recoveryOutcome === "string" ? recoveryOutcome.trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reputation_feedback_items")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, severity, topic, feedback_text, follow_up_status, assigned_owner_name, follow_up_due_date, resolution_notes, recovery_outcome, resolved_at, created_at")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
