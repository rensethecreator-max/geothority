import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("repair_actions")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch repairs" }, { status: 500 });
  }

  const repairs = (data ?? []).map((row: any) => ({
    id: row.id,
    issueId: row.issue_id,
    actionType: row.action_type,
    status: row.status,
    result: row.result,
    errorMessage: row.error_message,
    executedAt: row.executed_at,
  }));

  return NextResponse.json(repairs);
}
