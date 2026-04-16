import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/gbp?name=BusinessName&location=City,State
 * Search Google Places API for a business listing.
 * Returns: business name, address, phone, rating, review count, categories, hours, photos count.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const name = req.nextUrl.searchParams.get("name");
    const location = req.nextUrl.searchParams.get("location");

    if (!name || !location) {
      return NextResponse.json(
        { error: "Both 'name' and 'location' query params are required" },
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

    // Step 1: Text search to find the business
    const query = `${name} ${location}`;
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No Google Business listing found for "${name}" in ${location}`,
      });
    }

    const place = searchData.results[0];
    const placeId = place.place_id;

    // Step 2: Place Details for richer data
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,types,opening_hours,photos,website,url,reviews&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const detailsData = await detailsRes.json();
    const d = detailsData.result || {};

    return NextResponse.json({
      found: true,
      placeId,
      businessName: d.name || place.name,
      address: d.formatted_address || place.formatted_address,
      phone: d.formatted_phone_number || null,
      rating: d.rating || place.rating || null,
      reviewCount: d.user_ratings_total || place.user_ratings_total || 0,
      categories: d.types || place.types || [],
      website: d.website || null,
      googleMapsUrl: d.url || null,
      hours: d.opening_hours
        ? {
            openNow: d.opening_hours.open_now ?? null,
            weekdayText: d.opening_hours.weekday_text || [],
          }
        : null,
      photosCount: d.photos?.length || 0,
      recentReviews: (d.reviews || []).slice(0, 5).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relative_time_description,
      })),
    });
  } catch (error: any) {
    console.error("GBP search error:", error);
    return NextResponse.json(
      { error: "Failed to search Google Business Profile", message: error.message },
      { status: 500 }
    );
  }
}
