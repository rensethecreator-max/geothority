/**
 * analytics.ts
 * Lightweight client-side analytics helper.
 * Fires events to /api/analytics/event which persists them in analytics_events table.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   await trackEvent("scan_started", { url: "https://..." });
 */

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window === "undefined") return "server";

  const key = "geo_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  _sessionId = id;
  return id;
}

/**
 * Standard funnel events (non-exhaustive):
 *  - signup_completed
 *  - onboarding_started
 *  - onboarding_completed
 *  - scan_started
 *  - scan_completed
 *  - upgrade_clicked          { plan: string }
 *  - checkout_started         { plan: string }
 *  - content_generated        { type: string, city: string }
 *  - competitor_search        { location: string }
 *  - citations_sync_started
 *  - ai_overview_checked
 *  - gbp_sync_started
 *  - settings_profile_saved
 *  - account_deleted
 */
export async function trackEvent(
  eventName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (typeof window === "undefined") return; // No client-side fetch on server

  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        metadata: metadata ?? null,
        sessionId: getSessionId(),
      }),
      // Fire-and-forget: don't block the UI
      keepalive: true,
    });
  } catch {
    // Analytics should never break the product
  }
}
