import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, isEligibleForPublicProfile } from "@/lib/data-layer/profile-service";
import { apiPaginated, apiError, withCors } from "@/lib/data-layer/api-helpers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const category = searchParams.get("category");
  const minScore = searchParams.get("min_score");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = createServiceClient();

  // Build the base query for eligible profiles
  let query = supabase
    .from("scans")
    .select("id, user_id, url, business_name, city, state, geothority_score, geo_readiness_score, layer_scores, quick_wins, competitor_gaps, created_at", { count: "exact" })
    .order("geothority_score", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (city) query = query.eq("city", city);
  if (state) query = query.eq("state", state);
  if (minScore) query = query.gte("geothority_score", parseInt(minScore));

  const { data: scans, error, count } = await query;
  if (error) return apiError("Failed to fetch profiles", 500);

  const total = count ?? 0;

  // Filter by eligibility
  const userIds = Array.from(new Set((scans ?? []).map((s: any) => s.user_id)));
  const { data: users } = userIds.length
    ? await supabase.from("profiles").select("id, plan, business_name").in("id", userIds)
    : { data: [] };

  const eligibleUserIds = new Set(
    (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
  );

  const profiles = (scans ?? [])
    .filter((s: any) => eligibleUserIds.has(s.user_id))
    .map((s: any) => ({
      slug: slugify(s.url),
      businessName: s.business_name,
      url: s.url,
      city: s.city,
      state: s.state,
      geothorityScore: s.geothority_score,
      geoReadinessScore: s.geo_readiness_score,
      layerScores: s.layer_scores,
      lastScanned: s.created_at,
      profileUrl: `${BASE_URL}/profile/${slugify(s.url)}`,
    }));

  const response = apiPaginated(profiles, total, offset, limit, `${BASE_URL}/api/public/profiles`, { cacheMaxAge: 300 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}

export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}
