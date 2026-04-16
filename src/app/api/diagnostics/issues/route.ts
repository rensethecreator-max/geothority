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
    .from("diagnostic_issues")
    .select("*")
    .order("detected_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }

  // Normalize snake_case to camelCase for the client
  const issues = (data ?? []).map((row: any) => ({
    id: row.id,
    issueType: row.issue_type,
    severity: row.severity,
    status: row.status,
    description: row.description,
    autoRepairAttempted: row.auto_repair_attempted === true || row.auto_repair_attempted === 1,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
  }));

  return NextResponse.json(issues);
}
