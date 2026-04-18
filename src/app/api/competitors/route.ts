import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";

type CompetitorAlert = {
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  detectedAt: string;
  isNew?: boolean;
  delta?: string;
};

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
  alerts: CompetitorAlert[];
};

type SnapshotRow = {
  id: string;
  competitor_id: string;
  rating: number | null;
  review_count: number;
  score: number;
  rank_position: number;
  alerts: CompetitorAlert[];
  snapshot_date: string;
  created_at: string;
};

/**
 * GET /api/competitors?type=insurance+agent&location=Tampa,FL&refresh=1
 * POST /api/competitors { businessType, location, userBusinessName?, refresh }
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

    // ── Fetch historical snapshots for change detection ──────────
    const previousSnapshots = await fetchPreviousSnapshots(supabase, user.id);

    if (!refresh) {
      const { data: stored } = await supabase
        .from("competitors")
        .select("id, place_id, domain, business_name, city, address, rank_position, last_checked, alerts")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("rank_position", { ascending: true })
        .limit(10);

      if (stored && stored.length > 0) {
        const competitors = stored.map((row: any) => {
          const prev = previousSnapshots[row.id];
          const enrichedAlerts = enrichAlertsWithDiffs(
            Array.isArray(row.alerts) ? row.alerts : [],
            prev?.latest,
            prev?.previous
          );

          return {
            id: row.id,
            placeId: row.place_id || row.id,
            name: row.business_name,
            businessName: row.business_name,
            address: row.address || null,
            domain: row.domain,
            city: row.city,
            rankPosition: row.rank_position,
            lastChecked: row.last_checked,
            rating: prev?.latest?.rating ?? null,
            reviewCount: prev?.latest?.review_count ?? 0,
            categories: [],
            openNow: null,
            priceLevel: null,
            score: prev?.latest?.score ?? estimateScoreFromAlerts(row.alerts),
            alerts: enrichedAlerts,
            ratingDelta: computeDelta(prev?.latest?.rating, prev?.previous?.rating),
            reviewCountDelta: computeDelta(prev?.latest?.review_count, prev?.previous?.review_count),
            scoreDelta: computeDelta(prev?.latest?.score, prev?.previous?.score),
            snapshotHistory: prev?.history ?? [],
          };
        });

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

    // ── Live scan ────────────────────────────────────────────────
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

    // ── Persist competitors + snapshots ──────────────────────────
    const competitorIds = await persistCompetitors(supabase, user.id, resolvedLocation, competitors);
    await persistSnapshots(supabase, user.id, competitorIds, competitors);

    // ── Re-fetch snapshots for enriched response ──────────────────
    const freshSnapshots = await fetchPreviousSnapshots(supabase, user.id);

    const enrichedCompetitors = competitors.map((c, index) => {
      const compId = competitorIds[index];
      const prev = freshSnapshots[compId];
      const enrichedAlerts = enrichAlertsWithDiffs(
        c.alerts,
        prev?.latest,
        prev?.previous
      );

      return {
        id: compId,
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
        alerts: enrichedAlerts,
        ratingDelta: computeDelta(
          prev?.latest?.rating ?? c.rating,
          prev?.previous?.rating
        ),
        reviewCountDelta: computeDelta(
          prev?.latest?.review_count ?? c.reviewCount,
          prev?.previous?.review_count
        ),
        scoreDelta: computeDelta(
          prev?.latest?.score ?? c.score,
          prev?.previous?.score
        ),
        snapshotHistory: prev?.history ?? [],
      };
    });

    return NextResponse.json({
      competitors: enrichedCompetitors,
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

// ── Snapshot helpers ────────────────────────────────────────────

async function fetchPreviousSnapshots(
  supabase: any,
  userId: string
): Promise<Record<string, { latest: SnapshotRow | null; previous: SnapshotRow | null; history: SnapshotRow[] }>> {
  const { data } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false });

  if (!data || data.length === 0) return {};

  const grouped: Record<string, SnapshotRow[]> = {};
  for (const row of data) {
    const key = row.competitor_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const result: Record<string, { latest: SnapshotRow | null; previous: SnapshotRow | null; history: SnapshotRow[] }> = {};
  for (const [compId, rows] of Object.entries(grouped)) {
    result[compId] = {
      latest: rows[0] ?? null,
      previous: rows[1] ?? null,
      history: rows.slice(0, 8), // keep last 8 snapshots for sparkline
    };
  }

  return result;
}

async function persistSnapshots(
  supabase: any,
  userId: string,
  competitorIds: string[],
  competitors: CompetitorResult[]
) {
  if (competitorIds.length === 0) return;

  const rows = competitorIds.map((compId, index) => {
    const c = competitors[index];
    return {
      user_id: userId,
      competitor_id: compId,
      place_id: c.placeId,
      rating: c.rating,
      review_count: c.reviewCount,
      score: c.score,
      rank_position: index + 1,
      alerts: c.alerts,
      snapshot_source: "live",
      snapshot_date: new Date().toISOString().slice(0, 10),
    };
  });

  // Upsert — one snapshot per competitor per day
  const { error } = await supabase
    .from("competitor_snapshots")
    .upsert(rows, { onConflict: "competitor_id,snapshot_date" });

  if (error) {
    console.error("Failed to persist competitor snapshots:", error);
  }
}

function enrichAlertsWithDiffs(
  currentAlerts: CompetitorAlert[],
  latestSnapshot: SnapshotRow | null,
  previousSnapshot: SnapshotRow | null
): CompetitorAlert[] {
  const enriched = [...currentAlerts];

  if (!previousSnapshot || !latestSnapshot) return enriched;

  // ── Rating change ─────────────────────────────────────────
  if (latestSnapshot.rating !== null && previousSnapshot.rating !== null) {
    const ratingDiff = Number(latestSnapshot.rating) - Number(previousSnapshot.rating);
    if (Math.abs(ratingDiff) >= 0.1) {
      enriched.push({
        type: "rating_change",
        title: `Rating ${ratingDiff > 0 ? "increased" : "decreased"} to ${Number(latestSnapshot.rating).toFixed(1)}★`,
        description: `Changed from ${Number(previousSnapshot.rating).toFixed(1)}★ (Δ ${ratingDiff > 0 ? "+" : ""}${ratingDiff.toFixed(1)})`,
        severity: ratingDiff <= -0.3 ? "warning" : "info",
        detectedAt: new Date().toISOString(),
        isNew: true,
        delta: `${ratingDiff > 0 ? "+" : ""}${ratingDiff.toFixed(1)}`,
      });
    }
  }

  // ── Review count change ────────────────────────────────────
  const reviewDiff = (latestSnapshot.review_count ?? 0) - (previousSnapshot.review_count ?? 0);
  if (reviewDiff !== 0) {
    enriched.push({
      type: "review_count_change",
      title: `${reviewDiff > 0 ? "Gained" : "Lost"} ${Math.abs(reviewDiff)} review${Math.abs(reviewDiff) !== 1 ? "s" : ""}`,
      description: `Now at ${latestSnapshot.review_count} reviews (was ${previousSnapshot.review_count})`,
      severity: reviewDiff >= 10 ? "warning" : "info",
      detectedAt: new Date().toISOString(),
      isNew: true,
      delta: `${reviewDiff > 0 ? "+" : ""}${reviewDiff}`,
    });
  }

  // ── Score change ───────────────────────────────────────────
  const scoreDiff = (latestSnapshot.score ?? 0) - (previousSnapshot.score ?? 0);
  if (Math.abs(scoreDiff) >= 3) {
    enriched.push({
      type: "score_change",
      title: `Market score ${scoreDiff > 0 ? "increased" : "dropped"} to ${latestSnapshot.score}`,
      description: `Was ${previousSnapshot.score} (Δ ${scoreDiff > 0 ? "+" : ""}${scoreDiff})`,
      severity: scoreDiff <= -5 ? "warning" : "info",
      detectedAt: new Date().toISOString(),
      isNew: true,
      delta: `${scoreDiff > 0 ? "+" : ""}${scoreDiff}`,
    });
  }

  return enriched;
}

function computeDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  const cur = typeof current === "number" ? current : Number(current);
  const prev = typeof previous === "number" ? previous : Number(previous);
  if (isNaN(cur) || isNaN(prev)) return null;
  const diff = cur - prev;
  return Math.abs(diff) < 0.001 ? null : Number(diff.toFixed(2));
}

// ── Existing helpers ────────────────────────────────────────────

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
  const alerts: CompetitorAlert[] = [];

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
): Promise<string[]> {
  if (competitors.length === 0) {
    await supabase.from("competitors").update({ active: false }).eq("user_id", userId);
    return [];
  }

  await supabase.from("competitors").update({ active: false }).eq("user_id", userId);

  const rows = competitors.map((c, index) => ({
    user_id: userId,
    place_id: c.placeId,
    domain: c.domain,
    business_name: c.name,
    city: location,
    address: c.address,
    rank_position: index + 1,
    last_checked: new Date().toISOString(),
    alerts: c.alerts,
    active: true,
  }));

  const { error } = await supabase
    .from("competitors")
    .upsert(rows, { onConflict: "user_id,place_id" });

  if (error) {
    console.error("Failed to persist competitors:", error);
    return [];
  }

  const placeIds = competitors.map((c) => c.placeId).filter(Boolean);
  const { data, error: fetchError } = await supabase
    .from("competitors")
    .select("id, place_id")
    .eq("user_id", userId)
    .eq("active", true)
    .in("place_id", placeIds);

  if (fetchError) {
    console.error("Failed to fetch persisted competitors:", fetchError);
    return [];
  }

  const idByPlace = new Map<string, string>((data || []).map((row: any) => [row.place_id, row.id]));
  return competitors
    .map((c) => idByPlace.get(c.placeId))
    .filter((id): id is string => Boolean(id));
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
