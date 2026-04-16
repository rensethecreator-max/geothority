import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { sendPushNotification, sendPushToSegment } from "@/lib/push-notification-service";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId, segment, title, body, icon, link, category = "alerts", data } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!userId && !segment) {
    return NextResponse.json({ error: "Either userId or segment is required" }, { status: 400 });
  }

  const payload = { title: title.trim(), body: body.trim(), icon, link, category, data };

  try {
    if (userId) {
      const notified = await sendPushNotification(userId, payload);
      return NextResponse.json({ ok: true, notified });
    } else {
      const result = await sendPushToSegment(segment, payload);
      return NextResponse.json({ ok: true, ...result });
    }
  } catch (err: any) {
    console.error("[push] send error:", err);
    return NextResponse.json({ error: "Failed to send push notification", details: err.message }, { status: 500 });
  }
}
