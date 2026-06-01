/**
 * push-notification-service.ts
 * Geothority push notification engine with Supabase.
 * Adapted from the standard SaaS package template.
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  link?: string;
  category?: "product_updates" | "journey" | "alerts" | "digest";
  data?: Record<string, unknown>;
}

// ---- Geothority Push Journey Configs ------------------------------------

const PUSH_JOURNEY_CONFIGS: Record<string, {
  journeyId: string;
  name: string;
  steps: Array<{
    stepOrder: number;
    name: string;
    payload: PushPayload;
    type: "immediate" | "delay" | "trigger";
    delayDays?: number;
    triggerEvent?: string;
  }>;
}> = {
  onboarding: {
    journeyId: "onboarding",
    name: "Onboarding Push Journey",
    steps: [
      {
        stepOrder: 1,
        name: "Welcome",
        payload: {
          title: "🗺️ Your local SEO HQ is ready",
          body: "Run your first audit to see your Trust Stack™ score. It takes 90 seconds.",
          category: "journey",
          link: "/scan",
        },
        type: "immediate",
      },
      {
        stepOrder: 2,
        name: "Day 1 GBP Tips",
        payload: {
          title: "📍 3 quick wins for your Google Business Profile",
          body: "These 3 moves can boost your local rankings this week.",
          category: "journey",
          link: "/dashboard",
        },
        type: "delay",
        delayDays: 1,
      },
      {
        stepOrder: 3,
        name: "First Audit Complete",
        payload: {
          title: "⭐ Your first audit is ready",
          body: "Your weakest trust layer is now visible. Start with the fastest score lift.",
          category: "journey",
          link: "/dashboard",
        },
        type: "trigger",
        triggerEvent: "first_scan_completed",
      },
      {
        stepOrder: 4,
        name: "GBP Connected",
        payload: {
          title: "📍 Google Business is connected",
          body: "You can now use live GBP signals to improve your foundation score.",
          category: "journey",
          link: "/gbp-health",
        },
        type: "trigger",
        triggerEvent: "gbp_connected",
      },
      {
        stepOrder: 5,
        name: "Reputation Activated",
        payload: {
          title: "⭐ Your Reputation Engine is live",
          body: "Send the first request and start building fresh review momentum.",
          category: "journey",
          link: "/reputation",
        },
        type: "trigger",
        triggerEvent: "reputation_activated",
      },
      {
        stepOrder: 6,
        name: "First Reputation Request Sent",
        payload: {
          title: "📨 Your first review request is live",
          body: "Now monitor replies and turn positive responses into public proof.",
          category: "journey",
          link: "/reputation",
        },
        type: "trigger",
        triggerEvent: "first_reputation_request_sent",
      },
      {
        stepOrder: 7,
        name: "Weekly Digest",
        payload: {
          title: "📊 Local SEO health update",
          body: "Your weekly Geothority health report is ready.",
          category: "digest",
          link: "/dashboard",
        },
        type: "delay",
        delayDays: 7,
      },
    ],
  },

  win_back: {
    journeyId: "win_back",
    name: "Win-Back Push Journey",
    steps: [
      {
        stepOrder: 1,
        name: "Win-Back",
        payload: {
          title: "Your competitors just made 3 SEO moves",
          body: "Log back in to see where you stand and what to do.",
          category: "alerts",
          link: "/dashboard",
        },
        type: "immediate",
      },
    ],
  },
};

// ---- VAPID setup ---------------------------------------------------------

function getWebPush() {
  // Dynamic require for server-side only usage
  // eslint-disable-next-line
  const webpush = eval('require')("web-push") as any;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_CONTACT_EMAIL ?? process.env.ADMIN_EMAILS?.split(",")[0] ?? "admin@geothority.io";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
  }

  webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);
  return webpush;
}

// ---- Core send -----------------------------------------------------------

export async function sendPushNotification(userId: string, payload: PushPayload): Promise<number> {
  const supabase = createServiceClient();

  // Check preferences
  const { data: prefs } = await supabase
    .from("user_push_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (prefs) {
    if (!prefs.enabled) return 0;
    if (isQuietHours(prefs)) return 0;
    if (await hasHitDailyCap(supabase, userId, prefs.max_per_day ?? 5)) return 0;
    if (!isCategoryEnabled(prefs, payload.category)) return 0;
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs?.length) return 0;

  let webpush: any;
  try {
    webpush = getWebPush();
  } catch (err: any) {
    console.error("[push] VAPID not configured:", err.message);
    return 0;
  }

  const notifPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/icon-192x192.png",
    data: { link: payload.link ?? "/", ...(payload.data ?? {}) },
  });

  let notified = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
    };

    let status = "sent";
    let errorMsg: string | null = null;

    try {
      await webpush.sendNotification(pushSub, notifPayload);
      notified++;
    } catch (err: any) {
      status = "failed";
      errorMsg = err?.message ?? String(err);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }

    try {
      await supabase.from("push_notification_log").insert({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        link: payload.link ?? null,
        status,
        error: errorMsg,
      });
    } catch (_logErr) {}

  }

  return notified;
}

export async function sendPushToSegment(
  segment: "all" | "active" | "inactive",
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));

  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const notified = await sendPushNotification(userId, payload);
      if (notified > 0) sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ---- Push journey --------------------------------------------------------

export async function initializePushJourney(userId: string, journeyId: string): Promise<void> {
  const config = PUSH_JOURNEY_CONFIGS[journeyId];
  if (!config) return;

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("push_journey_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("journey_id", journeyId)
    .limit(1);

  if (existing?.length) return;

  const firstStep = config.steps.find((s) => s.stepOrder === 1);
  let nextSendAt: string | null = null;
  if (firstStep?.type === "immediate") {
    nextSendAt = new Date().toISOString();
  } else if (firstStep?.type === "delay" && firstStep.delayDays != null) {
    const d = new Date();
    d.setDate(d.getDate() + firstStep.delayDays);
    nextSendAt = d.toISOString();
  }

  await supabase.from("push_journey_progress").insert({
    user_id: userId,
    journey_id: journeyId,
    current_step_order: 1,
    status: "active",
    next_send_at: nextSendAt,
  });
}

export async function processAllPendingPushJourneys(): Promise<void> {
  const supabase = createServiceClient();

  const { data: pendingRows } = await supabase
    .from("push_journey_progress")
    .select("*")
    .eq("status", "active")
    .not("next_send_at", "is", null)
    .lte("next_send_at", new Date().toISOString())
    .order("next_send_at", { ascending: true })
    .limit(500);

  if (!pendingRows?.length) return;

  for (const row of pendingRows) {
    try {
      const config = PUSH_JOURNEY_CONFIGS[row.journey_id];
      if (!config) continue;

      const step = config.steps.find((s) => s.stepOrder === row.current_step_order);
      if (!step) {
        await supabase
          .from("push_journey_progress")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geothority.io";
      const payload: PushPayload = {
        ...step.payload,
        link: step.payload.link ? `${appUrl}${step.payload.link}` : `${appUrl}/dashboard`,
      };

      await sendPushNotification(row.user_id, payload);

      // Advance
      const nextStep = config.steps.find((s) => s.stepOrder === row.current_step_order + 1);
      if (!nextStep) {
        await supabase
          .from("push_journey_progress")
          .update({ status: "completed", last_sent_at: new Date().toISOString(), next_send_at: null, updated_at: new Date().toISOString() })
          .eq("id", row.id);
      } else {
        let nextSendAt: string | null = null;
        if (nextStep.type === "immediate") {
          nextSendAt = new Date().toISOString();
        } else if (nextStep.type === "delay" && nextStep.delayDays != null) {
          const d = new Date();
          d.setDate(d.getDate() + nextStep.delayDays);
          nextSendAt = d.toISOString();
        }
        await supabase
          .from("push_journey_progress")
          .update({ current_step_order: nextStep.stepOrder, last_sent_at: new Date().toISOString(), next_send_at: nextSendAt, updated_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    } catch (err) {
      console.error(`[push] Error processing row id=${row.id}:`, err);
    }
  }
}

export async function triggerPushJourneyEvent(userId: string, eventName: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("push_journey_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  for (const row of rows ?? []) {
    const config = PUSH_JOURNEY_CONFIGS[row.journey_id];
    if (!config) continue;
    const step = config.steps.find((s) => s.stepOrder === row.current_step_order);
    if (step?.type === "trigger" && step.triggerEvent === eventName) {
      await supabase
        .from("push_journey_progress")
        .update({ next_send_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }
}

// ---- Helpers -------------------------------------------------------------

function isQuietHours(prefs: any): boolean {
  const { quiet_hours_start, quiet_hours_end, timezone } = prefs;
  if (!quiet_hours_start || !quiet_hours_end) return false;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone ?? "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
    const current = hour * 60 + minute;
    const [sh, sm] = quiet_hours_start.split(":").map(Number);
    const [eh, em] = quiet_hours_end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start > end) return current >= start || current < end;
    return current >= start && current < end;
  } catch {
    return false;
  }
}

async function hasHitDailyCap(supabase: any, userId: string, maxPerDay: number): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("push_notification_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "failed")
    .gte("sent_at", since);
  return (count ?? 0) >= maxPerDay;
}

function isCategoryEnabled(prefs: any, category?: string): boolean {
  if (!category) return true;
  switch (category) {
    case "product_updates": return prefs.category_product_updates !== false && prefs.category_product_updates !== 0;
    case "journey": return prefs.category_journey !== false && prefs.category_journey !== 0;
    case "alerts": return prefs.category_alerts !== false && prefs.category_alerts !== 0;
    case "digest": return prefs.category_digest !== false && prefs.category_digest !== 0;
    default: return true;
  }
}
