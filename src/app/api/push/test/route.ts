import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { sendPushNotification } from "@/lib/push-notification-service";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { title = "Test notification", body = "This is a test push from Geothority admin.", link = "/" } =
    await req.json().catch(() => ({}));

  try {
    const notified = await sendPushNotification(user.id, { title, body, link, category: "alerts" });

    if (notified === 0) {
      return NextResponse.json({
        error: "No active push subscriptions found. Subscribe to push notifications first.",
      }, { status: 400 });
    }

    return NextResponse.json({ ok: true, notified });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to send test push", details: err.message }, { status: 500 });
  }
}
