import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hashPublicApiKey } from "@/lib/api-keys";

/**
 * Public Business Data API
 * GET /api/public/business/:slug — Get public business profile data
 * GET /api/public/business/:slug/trust — Get trust score
 * GET /api/public/business/:slug/citations — Get citation status
 * 
 * Auth: API key in X-API-Key header or Bearer token
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Validate API key
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required. Pass X-API-Key header." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Public API is not configured" }, { status: 503 });
  }
  const supabase = createServiceClient(supabaseUrl, supabaseKey);

  const { data: apiKeyRecord, error: keyError } = await supabase
    .from("public_api_keys")
    .select("id, user_id, permissions, active, expires_at")
    .eq("key_hash", hashPublicApiKey(apiKey))
    .eq("active", true)
    .maybeSingle();

  if (keyError) {
    return NextResponse.json({ error: "Unable to verify API key" }, { status: 503 });
  }
  if (!apiKeyRecord || (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) <= new Date())) {
    return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  }
  if (!Array.isArray(apiKeyRecord.permissions) || !apiKeyRecord.permissions.includes("read")) {
    return NextResponse.json({ error: "This API key does not have read permission" }, { status: 403 });
  }

  // Update last used
  await supabase
    .from("public_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRecord.id);

  const userId = apiKeyRecord.user_id;
  const permissions: string[] = apiKeyRecord.permissions || ["read"];

  // Determine what data to return based on path
  const path = new URL(req.url).pathname;

  if (path.endsWith("/trust")) {
    return await getTrustData(supabase, userId);
  } else if (path.endsWith("/citations")) {
    return await getCitationData(supabase, userId);
  }

  // Default: return business profile
  return await getBusinessData(supabase, userId, slug);
}

async function getBusinessData(supabase: any, userId: string, slug: string) {
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("business_name, address, city, state, zip, phone, website, nap_hash, identity_confidence, updated_at")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({
    business: {
      name: profile.business_name,
      address: {
        street: profile.address,
        city: profile.city,
        state: profile.state,
        zip: profile.zip,
      },
      phone: profile.phone,
      website: profile.website,
      identityConfidence: profile.identity_confidence,
      lastUpdated: profile.updated_at,
    },
    _links: {
      trust: `/api/public/business/${slug}/trust`,
      citations: `/api/public/business/${slug}/citations`,
    },
  });
}

async function getTrustData(supabase: any, userId: string) {
  const { data: score } = await supabase
    .from("trust_signal_scores")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!score) {
    return NextResponse.json({ error: "Trust score not computed yet" }, { status: 404 });
  }

  return NextResponse.json({
    overallScore: score.overall_trust_score,
    tier: score.trust_tier,
    signals: score.signals_breakdown,
    lastComputed: score.last_computed_at,
  });
}

async function getCitationData(supabase: any, userId: string) {
  const { data: states } = await supabase
    .from("citation_sync_states")
    .select("directory_id, sync_status, consistency_score, last_checked")
    .eq("user_id", userId);

  const { data: directories } = await supabase
    .from("citation_directories")
    .select("id, name, tier, website")
    .eq("active", true);

  const dirMap = new Map((directories ?? []).map((d: { id: string; name: string; tier: string; website: string }) => [d.id, d]));

  const citations = (states ?? []).map((s: { directory_id: string; sync_status: string; consistency_score: number; last_checked: string }) => {
    const dir = dirMap.get(s.directory_id) as { name: string; tier: string; website: string } | undefined;
    return {
      directory: dir?.name ?? "Unknown",
      tier: dir?.tier ?? "unknown",
      status: s.sync_status,
      consistency: s.consistency_score,
      lastChecked: s.last_checked,
    };
  });

  const listed = citations.filter((c: { status: string }) => c.status === "found" || c.status === "synced").length;
  const total = citations.length;

  return NextResponse.json({
    coverage: total > 0 ? Math.round((listed / total) * 100) : 0,
    listed,
    total,
    citations,
  });
}
