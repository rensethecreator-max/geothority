import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  // Validate API key
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required. Pass X-API-Key header." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, supabaseKey);

  // Hash the API key and look it up
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const { data: apiKeyRecord } = await supabase
    .from("public_api_keys")
    .select("user_id, permissions, active")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .single();

  if (!apiKeyRecord) {
    return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  }

  // Update last used
  await supabase
    .from("public_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

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
