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

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const statusFilter = url.searchParams.get("status");
  const journeyFilter = url.searchParams.get("journeyId");

  const supabase = createServiceClient();
  let query = supabase
    .from("user_email_journey_progress")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (journeyFilter) query = query.eq("journey_id", journeyFilter);

  const { data, error } = await query;
  const { count } = await supabase
    .from("user_email_journey_progress")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }

  return NextResponse.json({ progress: data ?? [], total: count ?? 0, limit, offset });
}
