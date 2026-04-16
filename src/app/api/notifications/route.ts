import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const unreadOnly = url.searchParams.get("unread") === "true";

  const supabase = createServiceClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) query = query.eq("read", false);

  const { data: notifications, error } = await query;

  if (error) {
    console.error("[notifications] list error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  // Count unread
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId, type = "info", title, message, link } = await req.json();

  if (!userId?.trim()) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const validTypes = ["info", "success", "warning", "error"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title: title.trim(),
    message: message.trim(),
    link: link ?? null,
    read: false,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
