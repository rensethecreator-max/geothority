/**
 * GET  /api/aggregator/config        — Get user's aggregator configuration
 * POST /api/aggregator/config        — Update global sync preferences
 * POST /api/aggregator/config/provider — Add/update a provider
 * DELETE /api/aggregator/config/provider — Remove a provider
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserConfig, updateSyncPreferences, setProviderConfig, removeProvider } from "@/lib/aggregator/config-service";
import { testProviderConnection } from "@/lib/aggregator/config-service";
import type { AggregatorProvider, SyncFrequency } from "@/lib/aggregator/types";

function getUserId(req: NextRequest): string {
  // Stub: extract from auth session
  return req.headers.get("x-user-id") ?? "anonymous";
}

/** GET — Retrieve user config */
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const config = getUserConfig(userId);
  return NextResponse.json(config);
}

/** POST — Update preferences or provider config */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();

  // Provider-level operation
  if (body.action === "set_provider") {
    const { provider, credentials, syncFrequency, enabled } = body as {
      provider: AggregatorProvider;
      credentials: Record<string, string>;
      syncFrequency?: SyncFrequency;
      enabled?: boolean;
    };
    const result = await setProviderConfig(userId, provider, credentials, syncFrequency, enabled);
    return NextResponse.json(result);
  }

  if (body.action === "remove_provider") {
    const { provider } = body as { provider: AggregatorProvider };
    const config = removeProvider(userId, provider);
    return NextResponse.json({ config });
  }

  if (body.action === "test_connection") {
    const { provider } = body as { provider: AggregatorProvider };
    const result = await testProviderConnection(userId, provider);
    return NextResponse.json(result);
  }

  // Global preferences update
  const { globalSyncFrequency, autoSync, notifyOnSync, notifyOnError } = body;
  const config = updateSyncPreferences(userId, {
    globalSyncFrequency,
    autoSync,
    notifyOnSync,
    notifyOnError,
  });
  return NextResponse.json(config);
}
