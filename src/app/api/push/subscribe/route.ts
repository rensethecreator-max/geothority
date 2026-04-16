import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { endpoint, keys, userAgent } = await req.json();

  if (!endpoint?.trim()) return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  if (!keys?.p256dh?.trim() || !keys?.auth?.trim()) {
    return NextResponse.json({ error: "keys.p256dh and keys.auth are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Upsert subscription
  const { error: subError } = await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: user.id,
      endpoint: endpoint.trim(),
      p256dh_key: keys.p256dh.trim(),
      auth_key: keys.auth.trim(),
      user_agent: userAgent ?? null,
    }, { onConflict: "endpoint" });

  if (subError) {
    console.error("[push] subscribe error:", subError);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  // Ensure preferences row exists
  await supabase
    .from("user_push_preferences")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { endpoint } = await req.json();
  if (!endpoint?.trim()) return NextResponse.json({ error: "endpoint is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint.trim());

  if (error) {
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
