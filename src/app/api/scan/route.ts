import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { scanWebsite } from "@/lib/scanner";
import { scanRatelimit, checkRateLimit } from "@/lib/ratelimit";

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

    const { url, businessName, city, state } = await req.json();

    // Input length validation (prevents prompt injection + cost abuse)
    if (url?.length > MAX_URL_LENGTH || businessName?.length > MAX_NAME_LENGTH ||
        city?.length > MAX_CITY_LENGTH || state?.length > MAX_STATE_LENGTH) {
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

    if (!url || !businessName || !city || !state) {
      return NextResponse.json(
        { error: "URL, business name, city, and state are required" },
        { status: 400 }
      );
    }

    const result = await scanWebsite(url, businessName, city, state);

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

    // Insert score_history entry for chart tracking
    await supabase.from("score_history").insert({
      user_id: user.id,
      scan_id: scan.id,
      overall_score: result.localAuthorityScore,
      layer_scores: result.layerScores,
      scanned_at: new Date().toISOString(),
    });

    // Update user profile with business info
    await supabase.from("user_profiles").upsert({
      id: user.id,
      business_name: businessName,
      city,
      state,
      website_url: url,
    });

    return NextResponse.json({ scan });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Failed to perform scan" },
      { status: 500 }
    );
  }
}
