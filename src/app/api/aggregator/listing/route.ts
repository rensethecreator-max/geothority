/**
 * GET  /api/aggregator/listing   — Pull current listing state from a provider
 * POST /api/aggregator/listing   — Delete/suppress a listing
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserConfig } from "@/lib/aggregator/config-service";
import { createAdapter } from "@/lib/aggregator/adapter-registry";
import type { AggregatorProvider } from "@/lib/aggregator/types";

import { getAuthUser } from "@/lib/auth-helpers";

/** GET ?provider=semrush&businessId=abc123 */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") as AggregatorProvider | null;
  const businessId = searchParams.get("businessId");

  if (!provider || !businessId) {
    return NextResponse.json(
      { error: "Missing provider and/or businessId query params" },
      { status: 400 }
    );
  }

  const config = getUserConfig(userId);
  const provConfig = config.providers.find((p) => p.provider === provider);
  if (!provConfig) {
    return NextResponse.json({ error: `Provider ${provider} not configured` }, { status: 404 });
  }

  try {
    const adapter = createAdapter(provConfig);
    const listing = await adapter.pullListing(businessId);
    return NextResponse.json(listing);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST { action: "delete", provider, businessId } */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  const body = await req.json();
  const { action, provider, businessId } = body as {
    action: string;
    provider: AggregatorProvider;
    businessId: string;
  };

  if (action !== "delete") {
    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  if (!provider || !businessId) {
    return NextResponse.json({ error: "Missing provider and/or businessId" }, { status: 400 });
  }

  const config = getUserConfig(userId);
  const provConfig = config.providers.find((p) => p.provider === provider);
  if (!provConfig) {
    return NextResponse.json({ error: `Provider ${provider} not configured` }, { status: 404 });
  }

  try {
    const adapter = createAdapter(provConfig);
    const result = await adapter.deleteListing(businessId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
