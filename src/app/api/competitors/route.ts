import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";

/**
 * GET /api/competitors?type=insurance+agent&location=Tampa,FL
 * POST /api/competitors { businessType, location, userBusinessName? }
 *
 * Find competing businesses via Google Places API.
 * Returns: list of competitors with name, rating, review count, address.
 */

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const location = req.nextUrl.searchParams.get("location");
  const userBiz = req.nextUrl.searchParams.get("userBusinessName") || undefined;
  return handleCompetitorSearch(type, location, userBiz, req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return handleCompetitorSearch(
      body.businessType,
      body.location,
      body.userBusinessName,
      req
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleCompetitorSearch(
  businessType: string | null,
  location: string | null,
  userBusinessName?: string,
  req?: NextRequest
) {
  try {
    // Competitor tracking requires growth plan or above
    const gate = await requirePlan(req as NextRequest, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;

    if (!businessType || !location) {
      return NextResponse.json(
        { error: "Both 'businessType' (or 'type') and 'location' are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 503 }
      );
    }

    const query = `${businessType} ${location}`;
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({
        competitors: [],
        message: `No businesses found for "${businessType}" in ${location}`,
      });
    }

    // Filter out the user's own business if provided
    const normalizedUserBiz = userBusinessName?.toLowerCase().trim();
    const competitors = searchData.results
      .filter(
        (p: any) =>
          !normalizedUserBiz ||
          !p.name?.toLowerCase().includes(normalizedUserBiz)
      )
      .slice(0, 10)
      .map((p: any) => ({
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address,
        rating: p.rating || null,
        reviewCount: p.user_ratings_total || 0,
        categories: p.types || [],
        openNow: p.opening_hours?.open_now ?? null,
        priceLevel: p.price_level ?? null,
      }));

    // Calculate comparison metrics if user's business is in results
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
      : null;

    // Averages for competitors
    const avgRating =
      competitors.length > 0
        ? Number(
            (
              competitors.reduce(
                (sum: number, c: any) => sum + (c.rating || 0),
                0
              ) / competitors.filter((c: any) => c.rating).length
            ).toFixed(1)
          )
        : null;
    const avgReviews =
      competitors.length > 0
        ? Math.round(
            competitors.reduce(
              (sum: number, c: any) => sum + c.reviewCount,
              0
            ) / competitors.length
          )
        : null;

    return NextResponse.json({
      competitors,
      total: competitors.length,
      userMetrics,
      marketAverages: { avgRating, avgReviews },
      insights: generateInsights(competitors, userMetrics),
    });
  } catch (error: any) {
    console.error("Competitor search error:", error);
    return NextResponse.json(
      { error: "Failed to search competitors", message: error.message },
      { status: 500 }
    );
  }
}

function generateInsights(
  competitors: any[],
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
