import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const journeyId = url.searchParams.get("journeyId");
  const supabase = createServiceClient();

  let query = supabase
    .from("user_email_journey_progress")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", params.userId)
    .eq("status", "paused");

  if (journeyId) query = (query as any).eq("journey_id", journeyId);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to resume journey" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
