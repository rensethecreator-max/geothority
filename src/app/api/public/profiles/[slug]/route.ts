/**
 * GET /api/public/profiles/[slug]
 * Public API endpoint: get a single published business profile with full schema markup.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, isEligibleForPublicProfile } from "@/lib/data-layer/profile-service";
import { generateSchemaMarkup } from "@/lib/data-layer/schema-generator";
import { apiSuccess, apiNotFound, apiError, withCors } from "@/lib/data-layer/api-helpers";
import type { PublicBusinessProfile, PublicQuickWin, PublicCompetitorGap, SchemaMarkupOutput } from "@/lib/data-layer/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();

  // Find scan by matching slug against URL
  const domainPattern = slug.replace(/-/g, ".");

  const { data: scans, error } = await supabase
    .from("scans")
    .select("id, user_id, url, business_name, city, state, latitude, longitude, geothority_score, geo_readiness_score, layer_scores, quick_wins, competitor_gaps, created_at")
    .or(`url.ilike.%${domainPattern}%,url.ilike.%${slug}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return apiError("Failed to fetch profile", 500);
  if (!scans?.length) return apiNotFound("Profile");

  // Find the scan whose slugified URL matches
  const scan = scans.find((s: any) => slugify(s.url) === slug) ?? scans[0];

  // Check eligibility
  const { data: user } = await supabase
    .from("user_profiles")
    .select("id, plan, business_name, city, state")
    .eq("id", scan.user_id)
    .single();

  if (!user || !isEligibleForPublicProfile(user.plan)) return apiNotFound("Profile");

  const businessName = scan.business_name || user.business_name || "Unknown Business";

  const profile: PublicBusinessProfile = {
    slug,
    businessName,
    description: `Local SEO analysis for ${businessName}${scan.city ? ` in ${scan.city}, ${scan.state}` : ""}.`,
    url: scan.url,
    city: scan.city || user.city,
    state: scan.state || user.state,
    address: null,
    phone: null,
    category: null,
    geothorityScore: scan.geothority_score,
    geoReadinessScore: scan.geo_readiness_score,
    layerScores: scan.layer_scores,
    quickWins: (scan.quick_wins ?? []).map((w: any) => ({
      title: w.title,
      impact: w.impact,
      layer: w.layer,
    } as PublicQuickWin)),
    competitorGaps: (scan.competitor_gaps ?? []).map((g: any) => ({
      domain: g.domain,
      businessName: g.businessName,
      advantage: g.advantage,
    } as PublicCompetitorGap)),
    schemaMarkup: {} as SchemaMarkupOutput,
    lastScanned: scan.created_at,
    publishedAt: scan.created_at,
  };

  profile.schemaMarkup = generateSchemaMarkup(profile);

  const response = apiSuccess(profile, 200, { cacheMaxAge: 600 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}

export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}
