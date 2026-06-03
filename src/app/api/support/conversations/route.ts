import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

function emailSupportFallback(status = 201) {
  return NextResponse.json(
    {
      id: "email-support",
      status: "email_fallback",
      setupRequired: true,
      message: "Support chat is being configured for beta. Please email hello@geothority.io for help.",
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("support_conversations")
    .insert({
      user_id: user.id,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("[support] create conversation error:", error);
    if (error.code === "PGRST204" || error.code === "22P02") {
      return emailSupportFallback();
    }
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
