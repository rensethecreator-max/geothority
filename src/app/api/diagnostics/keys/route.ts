import { NextResponse } from "next/server";
import { getApiKeyStatus } from "@/lib/api-key-check";

function getReputationTransportDiagnostics() {
  const mode = (process.env.GEOTHORITY_REPUTATION_TRANSPORT || "auto").trim().toLowerCase();
  const hasAccountSid = Boolean(process.env.TWILIO_ACCOUNT_SID?.trim());
  const hasAuthToken = Boolean(process.env.TWILIO_AUTH_TOKEN?.trim());
  const hasFromNumber = Boolean(process.env.TWILIO_FROM_NUMBER?.trim());
  const hasMessagingServiceSid = Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID?.trim());
  const hasBaseUrl = Boolean((process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim());
  const usingTwilio = mode === "twilio" || mode === "auto";

  return {
    mode,
    ready: mode === "simulated" || (hasAccountSid && hasAuthToken && (hasFromNumber || hasMessagingServiceSid) && hasBaseUrl),
    usingTwilio,
    checks: {
      hasAccountSid,
      hasAuthToken,
      hasFromNumber,
      hasMessagingServiceSid,
      hasSender: hasFromNumber || hasMessagingServiceSid,
      hasBaseUrl,
    },
  };
}

export const dynamic = "force-dynamic";

/**
 * GET /api/diagnostics/keys
 * Returns the configuration status of all API keys.
 * Only available to authenticated users.
 */
export async function GET() {
  const keys = getApiKeyStatus();

  // Don't expose actual key values — just whether they're configured
  const safe = keys.map((k) => ({
    key: k.key,
    configured: k.configured,
    required: k.required,
    impact: k.impact,
    category: k.category,
  }));

  return NextResponse.json({ keys: safe, reputationTransport: getReputationTransportDiagnostics() });
}
