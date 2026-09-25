import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { scanWebsite, WebsiteScanError } from "@/lib/scanner";
import { scanRatelimit, checkRateLimit } from "@/lib/ratelimit";
import { recordJourneyMilestone } from "@/lib/journey-events";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";

// Input validation constants
const MAX_URL_LENGTH = 500;
const MAX_NAME_LENGTH = 100;
const MAX_CITY_LENGTH = 100;
const MAX_STATE_LENGTH = 50;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return user's scan history
    const { data: scans, error } = await supabase
      .from("scans")
      .select("id, url, business_name, city, state, geothority_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
    }

    return NextResponse.json({ scans: scans || [] });
  } catch (error) {
    console.error("Scan GET error:", error);
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid scan request is required" }, { status: 400 });
    }
    const { url, businessName, city, state, sourceScanId } = body as Record<string, unknown>;
    if ([url, businessName, city, state, sourceScanId].some(value => value != null && typeof value !== "string")) {
      return NextResponse.json({ error: "Scan fields must be text" }, { status: 400 });
    }
    const inputUrl = typeof url === "string" ? url.trim() : "";
    const inputBusinessName = typeof businessName === "string" ? businessName.trim() : "";
    const inputCity = typeof city === "string" ? city.trim() : "";
    const inputState = typeof state === "string" ? state.trim() : "";

    // Input length validation (prevents prompt injection + cost abuse)
    if (inputUrl.length > MAX_URL_LENGTH || inputBusinessName.length > MAX_NAME_LENGTH ||
        inputCity.length > MAX_CITY_LENGTH || inputState.length > MAX_STATE_LENGTH) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    // Rate limiting — 3 scans/day per user on free plan
    const rl = await checkRateLimit(scanRatelimit, `scan:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've reached your daily scan limit. Upgrade to Pro for unlimited scans.", reset: rl.reset },
        { status: 429 }
      );
    }

    let resolvedUrl = inputUrl;
    let resolvedBusinessName = inputBusinessName;
    let resolvedCity = inputCity;
    let resolvedState = inputState;

    if (sourceScanId && (!resolvedUrl || !resolvedBusinessName || !resolvedCity || !resolvedState)) {
      const { data: sourceScan } = await supabase
        .from("scans")
        .select("url, business_name, city, state")
        .eq("id", sourceScanId)
        .eq("user_id", user.id)
        .single();

      if (!sourceScan) {
        return NextResponse.json({ error: "Source scan not found" }, { status: 404 });
      }

      resolvedUrl = resolvedUrl || sourceScan.url;
      resolvedBusinessName = resolvedBusinessName || sourceScan.business_name;
      resolvedCity = resolvedCity || sourceScan.city;
      resolvedState = resolvedState || sourceScan.state;
    }

    if (!resolvedUrl || !resolvedBusinessName || !resolvedCity || !resolvedState) {
      return NextResponse.json(
        { error: "URL, business name, city, and state are required" },
        { status: 400 }
      );
    }

    const result = await scanWebsite(resolvedUrl, resolvedBusinessName, resolvedCity, resolvedState);

    const { data: scan, error } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        url: result.url,
        business_name: result.businessName,
        city: result.city,
        state: result.state,
        geothority_score: result.localAuthorityScore,
        layer_scores: result.layerScores,
        quick_wins: result.quickWins,
        competitor_gaps: result.competitorGaps,
        raw_scan_data: result.rawScanData,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save scan results" },
        { status: 500 }
      );
    }

    const warnings: string[] = [];

    // These secondary records improve the dashboard but must not hide a
    // successfully saved scan when one optional write fails.
    const { error: historyError } = await supabase.from("score_history").insert({
      user_id: user.id,
      scan_id: scan.id,
      overall_score: result.localAuthorityScore,
      layer_scores: result.layerScores,
      scanned_at: new Date().toISOString(),
    });
    if (historyError) {
      console.error("Scan history could not be saved", historyError);
      warnings.push("The scan was saved, but its history chart could not be updated.");
    }

    // Update user profile with business info
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: user.id,
      business_name: resolvedBusinessName,
      city: resolvedCity,
      state: resolvedState,
      website_url: result.url,
    });
    if (profileError) {
      console.error("Business profile could not be updated after scan", profileError);
      warnings.push("The scan was saved, but your business profile could not be updated.");
    }

    const brandCapture = result.rawScanData.brandCapture;
    if (brandCapture) {
      const businessIdentity = getReputationBusinessIdentity(resolvedBusinessName);
      const { error: brandError } = await supabase
        .from("business_brand_profiles")
        .upsert(
          {
            user_id: user.id,
            business_key: businessIdentity.businessKey,
            business_name: resolvedBusinessName,
            website_url: brandCapture.websiteUrl,
            logo_url: brandCapture.logoUrl,
            logo_source: brandCapture.logoSource,
            primary_color: brandCapture.primaryColor,
            secondary_color: brandCapture.secondaryColor,
            accent_color: brandCapture.accentColor,
            font_family_hint: brandCapture.fontFamilyHint,
            hero_image_url: brandCapture.heroImageUrl,
            service_image_urls: brandCapture.serviceImageUrls,
            business_category: brandCapture.businessCategory,
            motif: brandCapture.motif,
            tone: brandCapture.tone,
            confidence_score: brandCapture.confidenceScore,
            extraction_notes: brandCapture.extractionNotes,
            source_scan_id: scan.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,business_key" },
        );
      if (brandError) {
        console.error("Brand profile could not be updated after scan", brandError);
        warnings.push("The scan was saved, but automatic brand styling could not be updated.");
      }
    }

    try {
      await recordJourneyMilestone(user.id, "first_scan_completed");
    } catch (milestoneError) {
      console.error("First scan milestone could not be recorded", milestoneError);
      warnings.push("The scan was saved, but onboarding progress could not be updated.");
    }

    return NextResponse.json({ scan, warnings });
  } catch (error) {
    console.error("Scan API error:", error);
    if (error instanceof WebsiteScanError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to perform scan" },
      { status: 500 }
    );
  }
}
