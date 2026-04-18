import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";

type CompetitorResult = {
  placeId: string;
  name: string;
  address: string | null;
  domain: string;
  rating: number | null;
  reviewCount: number;
  categories: string[];
  openNow: boolean | null;
  priceLevel: number | null;
  score: number;
  alerts: {
    type: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "critical";
    detectedAt: string;
  }[];
};

/**
 * GET /api/competitors?type=insurance+agent&location=Tampa,FL&refresh=1
 * POST /api/competitors { businessType, location, userBusinessName? }
 */

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const location = req.nextUrl.searchParams.get("location");
  const userBiz = req.nextUrl.searchParams.get("userBusinessName") || undefined;
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  return handleCompetitorSearch(type, location, userBiz, req, refresh);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return handleCompetitorSearch(
      body.businessType,
      body.location,
      body.userBusinessName,
      req,
      body.refresh === true
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleCompetitorSearch(
  businessType: string | null,
  location: string | null,
  userBusinessName: string | undefined,
  req: NextRequest,
  refresh = false
) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const context = await getCompetitorContext(supabase, user.id);
    const resolvedBusinessType = businessType || context.businessType;
    const resolvedLocation = location || context.location;
    const resolvedUserBusinessName = userBusinessName || context.businessName;

    if (!resolvedBusinessType || !resolvedLocation) {
      return NextResponse.json(
        {
          error: "Need business context before competitor tracking can run",
          message: "Run a scan first so Geothority knows your business type and market.",
        },
        { status: 400 }
      );
    }

    if (!refresh) {
      const { data: stored } = await supabase
        .from("competitors")
        .select("id, domain, business_name, city, rank_position, last_checked, alerts")
        .eq("user_id", user.id)
        .order("rank_position", { ascending: true })
        .limit(10);

      if (stored && stored.length > 0) {
        const competitors = stored.map((row: any) => ({
          id: row.id,
          placeId: row.id,
          name: row.business_name,
          businessName: row.business_name,
          address: null,
          domain: row.domain,
          city: row.city,
          rankPosition: row.rank_position,
          lastChecked: row.last_checked,
          rating: null,
          reviewCount: 0,
          categories: [],
          openNow: null,
          priceLevel: null,
          score: estimateScoreFromAlerts(row.alerts),
          alerts: Array.isArray(row.alerts) ? row.alerts : [],
        }));

        const allAlerts = competitors.flatMap((c: any) =>
          (c.alerts || []).map((a: any) => ({ ...a, competitor: c.name }))
        );

        return NextResponse.json({
          competitors,
          total: competitors.length,
          businessType: resolvedBusinessType,
          location: resolvedLocation,
          userBusinessName: resolvedUserBusinessName,
          userScore: context.userScore,
          marketAverages: null,
          insights: allAlerts.slice(0, 3).map((a: any) => a.title),
          source: "stored",
        });
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 503 }
      );
    }

    const query = `${resolvedBusinessType} ${resolvedLocation}`;
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000), cache: "no-store" }
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({
        competitors: [],
        businessType: resolvedBusinessType,
        location: resolvedLocation,
        userBusinessName: resolvedUserBusinessName,
        message: `No businesses found for "${resolvedBusinessType}" in ${resolvedLocation}`,
      });
    }

    const normalizedUserBiz = resolvedUserBusinessName?.toLowerCase().trim();
    const userResult = normalizedUserBiz
      ? searchData.results.find((p: any) =>
          p.name?.toLowerCase().includes(normalizedUserBiz)
        )
      : null;

    const userMetrics = userResult
      ? {
          name: userResult.name,
          rating: userResult.rating || null,
          reviewCount: userResult.user_ratings_total || 0,
        }
      : {
          name: resolvedUserBusinessName || "Your business",
          rating: null,
          reviewCount: 0,
        };

    const competitors: CompetitorResult[] = searchData.results
      .filter(
        (p: any) =>
          !normalizedUserBiz ||
          !p.name?.toLowerCase().includes(normalizedUserBiz)
      )
      .slice(0, 10)
      .map((p: any, index: number) => {
        const rating = p.rating || null;
        const reviewCount = p.user_ratings_total || 0;
        const score = calculateCompetitorScore(rating, reviewCount, index);
        const alerts = buildLiveAlerts(
          p.name,
          rating,
          reviewCount,
          userMetrics,
          index
        );

        return {
          placeId: p.place_id,
          name: p.name,
          address: p.formatted_address || null,
          domain: toCompetitorDomain(p),
          rating,
          reviewCount,
          categories: p.types || [],
          openNow: p.opening_hours?.open_now ?? null,
          priceLevel: p.price_level ?? null,
          score,
          alerts,
        };
      });

    const avgRating =
      competitors.filter((c) => c.rating !== null).length > 0
        ? Number(
            (
              competitors.reduce((sum, c) => sum + (c.rating || 0), 0) /
              competitors.filter((c) => c.rating !== null).length
            ).toFixed(1)
          )
        : null;
    const avgReviews =
      competitors.length > 0
        ? Math.round(
            competitors.reduce((sum, c) => sum + c.reviewCount, 0) /
              competitors.length
          )
        : null;

    await persistCompetitors(supabase, user.id, resolvedLocation, competitors);

    return NextResponse.json({
      competitors: competitors.map((c, index) => ({
        id: c.placeId,
        placeId: c.placeId,
        name: c.name,
        businessName: c.name,
        address: c.address,
        domain: c.domain,
        city: resolvedLocation,
        rankPosition: index + 1,
        lastChecked: new Date().toISOString(),
        rating: c.rating,
        reviewCount: c.reviewCount,
        categories: c.categories,
        openNow: c.openNow,
        priceLevel: c.priceLevel,
        score: c.score,
        alerts: c.alerts,
      })),
      total: competitors.length,
      businessType: resolvedBusinessType,
      location: resolvedLocation,
      userBusinessName: resolvedUserBusinessName,
      userMetrics,
      userScore: context.userScore,
      marketAverages: { avgRating, avgReviews },
      insights: generateInsights(competitors, userMetrics),
      source: "live",
    });
  } catch (error: any) {
    console.error("Competitor search error:", error);
    return NextResponse.json(
      { error: "Failed to search competitors", message: error.message },
      { status: 500 }
    );
  }
}

async function getCompetitorContext(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("business_name, city, state, website_url")
    .eq("id", userId)
    .single();

  const { data: latestScan } = await supabase
    .from("scans")
    .select("business_name, city, state, geothority_score, raw_scan_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const businessName =
    latestScan?.business_name || profile?.business_name || undefined;
  const city = latestScan?.city || profile?.city || undefined;
  const state = latestScan?.state || profile?.state || undefined;
  const location = city ? `${city}${state ? `, ${state}` : ""}` : null;
  const businessType = inferBusinessType({
    businessName,
    websiteUrl: profile?.website_url,
    title: latestScan?.raw_scan_data?.title,
    description: latestScan?.raw_scan_data?.description,
  });

  return {
    businessName,
    city,
    state,
    location,
    businessType,
    userScore: latestScan?.geothority_score || null,
  };
}

function inferBusinessType(input: {
  businessName?: string;
  websiteUrl?: string;
  title?: string;
  description?: string;
}) {
  const haystack = [
    input.businessName,
    input.websiteUrl,
    input.title,
    input.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywords: Array<[RegExp, string]> = [
    [/insurance|agency|broker|coverage/, "insurance agent"],
    [/law|attorney|legal/, "law firm"],
    [/dentist|dental|orthodont/, "dentist"],
    [/roofer|roofing/, "roofing contractor"],
    [/plumb|plumbing/, "plumber"],
    [/hvac|heating|cooling|air conditioning/, "hvac contractor"],
    [/real estate|realtor|brokerage/, "real estate agency"],
    [/medspa|spa|aesthetics/, "med spa"],
  ];

  for (const [pattern, label] of keywords) {
    if (pattern.test(haystack)) return label;
  }

  return haystack ? "local business" : null;
}

function toCompetitorDomain(place: any) {
  const name = (place.name || "competitor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "competitor"}.com`;
}

function calculateCompetitorScore(
  rating: number | null,
  reviewCount: number,
  rankIndex: number
) {
  const ratingScore = rating ? Math.round((rating / 5) * 45) : 18;
  const reviewScore = Math.min(40, Math.round(reviewCount / 6));
  const rankBonus = Math.max(5, 15 - rankIndex * 2);
  return Math.min(95, ratingScore + reviewScore + rankBonus);
}

function buildLiveAlerts(
  competitorName: string,
  rating: number | null,
  reviewCount: number,
  userMetrics: { rating: number | null; reviewCount: number },
  rankIndex: number
) {
  const detectedAt = new Date().toISOString();
  const alerts: CompetitorResult["alerts"] = [];

  if (rankIndex < 3) {
    alerts.push({
      type: "rank_presence",
      title: `${competitorName} is showing up near the top of the market`,
      description: "This business is ranking high in your city/category search set and should be watched closely.",
      severity: rankIndex === 0 ? "critical" : "warning",
      detectedAt,
    });
  }

  if (reviewCount >= Math.max(25, userMetrics.reviewCount + 10)) {
    alerts.push({
      type: "review_lead",
      title: `${competitorName} has a strong review advantage`,
      description: `${competitorName} currently has ${reviewCount} Google reviews, which is ahead of your visible review footprint in this result set.`,
      severity: reviewCount >= 100 ? "critical" : "warning",
      detectedAt,
    });
  }

  if (rating !== null && userMetrics.rating !== null && rating > userMetrics.rating + 0.2) {
    alerts.push({
      type: "rating_gap",
      title: `${competitorName} is winning on rating quality`,
      description: `${competitorName} is showing ${rating.toFixed(1)}★ versus your visible ${userMetrics.rating.toFixed(1)}★ in Google results.`,
      severity: "info",
      detectedAt,
    });
  }

  return alerts;
}

async function persistCompetitors(
  supabase: any,
  userId: string,
  location: string,
  competitors: CompetitorResult[]
) {
  await supabase.from("competitors").delete().eq("user_id", userId);

  if (competitors.length === 0) return;

  await supabase.from("competitors").insert(
    competitors.map((c, index) => ({
      user_id: userId,
      domain: c.domain,
      business_name: c.name,
      city: location,
      rank_position: index + 1,
      last_checked: new Date().toISOString(),
      alerts: c.alerts,
    }))
  );
}

function estimateScoreFromAlerts(alerts: any) {
  if (!Array.isArray(alerts)) return 60;
  const critical = alerts.filter((a) => a?.severity === "critical").length;
  const warning = alerts.filter((a) => a?.severity === "warning").length;
  return Math.max(45, Math.min(88, 58 + critical * 12 + warning * 6));
}

function generateInsights(
  competitors: Array<{ name: string; rating: number | null; reviewCount: number }>,
  userMetrics: { rating: number | null; reviewCount: number } | null
): string[] {
  const insights: string[] = [];

  if (competitors.length === 0) {
    insights.push("No competitors found in this area — great opportunity!");
    return insights;
  }

  const topRated = competitors.reduce((best, c) =>
    (c.rating || 0) > (best.rating || 0) ? c : best
  );
  insights.push(
    `Top-rated competitor: ${topRated.name} (${topRated.rating}★, ${topRated.reviewCount} reviews)`
  );

  const mostReviewed = competitors.reduce((best, c) =>
    c.reviewCount > best.reviewCount ? c : best
  );
  if (mostReviewed.name !== topRated.name) {
    insights.push(
      `Most reviewed: ${mostReviewed.name} (${mostReviewed.reviewCount} reviews)`
    );
  }

  if (userMetrics) {
    const avgRating =
      competitors.reduce((s, c) => s + (c.rating || 0), 0) /
      competitors.filter((c) => c.rating).length;
    if (userMetrics.rating && userMetrics.rating > avgRating) {
      insights.push(
        `Your rating (${userMetrics.rating}★) is above the market average (${avgRating.toFixed(1)}★) — nice!`
      );
    } else if (userMetrics.rating) {
      insights.push(
        `Your rating (${userMetrics.rating}★) is below market average (${avgRating.toFixed(1)}★) — focus on review generation`
      );
    }
  }

  return insights;
}
