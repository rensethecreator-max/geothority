import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const supabase = createServiceClient();
  const sessionId = randomUUID();

  const { data, error } = await supabase
    .from("support_conversations")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      status: "open",
      priority: "normal",
    })
    .select()
    .single();

  if (error) {
    console.error("[support] create conversation error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
