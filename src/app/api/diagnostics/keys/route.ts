import { NextRequest, NextResponse } from "next/server";
import { getApiKeyStatus } from "@/lib/api-key-check";
import { getAuthUser } from "@/lib/auth-helpers";
import { getReputationTransportDiagnostics } from "@/lib/reputation/diagnostics";

export const dynamic = "force-dynamic";

/**
 * GET /api/diagnostics/keys
 * Returns the configuration status of all API keys.
 * Only available to authenticated users.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;

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
