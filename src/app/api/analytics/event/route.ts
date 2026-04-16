import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { eventName, metadata, sessionId } = await req.json();

  if (!eventName?.trim()) {
    return NextResponse.json({ error: "eventName is required" }, { status: 400 });
  }

  // Try to get user (optional — analytics events can be anonymous)
  let userId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous event
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("analytics_events").insert({
    user_id: userId,
    event_name: eventName.trim(),
    metadata: metadata ?? null,
    session_id: sessionId ?? null,
  });

  if (error) {
    console.error("[analytics] log event error:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
