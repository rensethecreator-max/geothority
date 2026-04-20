import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";

/**
 * GET /api/trust-score — Get trust signal scorecard
 * POST /api/trust-score — Recompute trust signal scores
 */

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { data: score } = await supabase
      .from("trust_signal_scores")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ score: score ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();
    const userId = user.id;

    // ── Compute each signal score (0-100) ───────────────────────

    // 1. NAP Consistency — how consistent is the canonical NAP across directories
    let napConsistency = 0;
    const { data: syncStates } = await supabase
      .from("citation_sync_states")
      .select("consistency_score")
      .eq("user_id", userId);
    if (syncStates && syncStates.length > 0) {
      const avg = syncStates.reduce((sum: number, s: any) => sum + (s.consistency_score ?? 0), 0) / syncStates.length;
      napConsistency = Math.round(avg);
    }

    // 2. Citation Coverage — what % of relevant directories have listings
    let citationCoverage = 0;
    const { data: directories } = await supabase
      .from("citation_directories")
      .select("id")
      .eq("active", true);
    const { data: listings } = await supabase
      .from("citation_sync_states")
      .select("listing_status")
      .eq("user_id", userId)
      .eq("listing_status", "listed");
    if (directories && directories.length > 0) {
      citationCoverage = Math.round(((listings?.length ?? 0) / directories.length) * 100);
    }

    // 3. Review Velocity — based on review count and recency
    let reviewVelocity = 0;
    const { data: latestScan } = await supabase
      .from("scans")
      .select("raw_scan_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latestScan?.raw_scan_data?.reviews) {
      const reviewCount = latestScan.raw_scan_data.reviews.total || 0;
      reviewVelocity = Math.min(100, reviewCount * 5); // 20 reviews = 100
    }

    // 4. Review Rating
    let reviewRating = 0;
    if (latestScan?.raw_scan_data?.reviews?.rating) {
      reviewRating = Math.round((latestScan.raw_scan_data.reviews.rating / 5) * 100);
    }

    // 5. GBP Completeness — based on profile fields filled
    let gbpCompleteness = 0;
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("business_name, address, city, state, zip, phone, website, email")
      .eq("user_id", userId)
      .single();
    if (profile) {
      const fields = [profile.business_name, profile.address, profile.city, profile.state, profile.zip, profile.phone, profile.website, profile.email];
      const filled = fields.filter(Boolean).length;
      gbpCompleteness = Math.round((filled / fields.length) * 100);
    }

    // 6. Schema Presence — based on generated schema content
    let schemaPresence = 0;
    const { count: schemaCount } = await supabase
      .from("generated_content")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("content_type", "schema");
    schemaPresence = schemaCount && schemaCount > 0 ? 80 : 0;

    // 7. Content Depth — based on content pieces generated
    let contentDepth = 0;
    const { count: contentCount } = await supabase
      .from("generated_content")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    contentDepth = Math.min(100, (contentCount ?? 0) * 10);

    // 8. AI Visibility — from scorecard
    let aiVisibility = 0;
    const { data: scorecard } = await supabase
      .from("ai_visibility_scorecards")
      .select("overall_score")
      .eq("user_id", userId)
      .single();
    if (scorecard) {
      aiVisibility = scorecard.overall_score;
    }

    // ── Compute overall trust score ─────────────────────────────
    // Weighted average: NAP (20%), Citations (20%), Reviews (15%), GBP (15%), Schema (10%), Content (10%), AI (10%)
    const overallTrustScore = Math.round(
      napConsistency * 0.20 +
      citationCoverage * 0.20 +
      reviewVelocity * 0.075 +
      reviewRating * 0.075 +
      gbpCompleteness * 0.15 +
      schemaPresence * 0.10 +
      contentDepth * 0.10 +
      aiVisibility * 0.10
    );

    // Determine tier
    const trustTier =
      overallTrustScore >= 85 ? "platinum" :
      overallTrustScore >= 70 ? "gold" :
      overallTrustScore >= 50 ? "silver" :
      overallTrustScore >= 25 ? "bronze" : "unrated";

    // Breakdown
    const signalsBreakdown = {
      nap_consistency: { score: napConsistency, weight: 0.20, label: "NAP Consistency" },
      citation_coverage: { score: citationCoverage, weight: 0.20, label: "Citation Coverage" },
      review_velocity: { score: reviewVelocity, weight: 0.075, label: "Review Volume" },
      review_rating: { score: reviewRating, weight: 0.075, label: "Review Rating" },
      gbp_completeness: { score: gbpCompleteness, weight: 0.15, label: "GBP Completeness" },
      schema_presence: { score: schemaPresence, weight: 0.10, label: "Schema Markup" },
      content_depth: { score: contentDepth, weight: 0.10, label: "Content Depth" },
      ai_visibility: { score: aiVisibility, weight: 0.10, label: "AI Visibility" },
    };

    // Upsert
    const { data: result, error } = await supabase
      .from("trust_signal_scores")
      .upsert({
        user_id: userId,
        nap_consistency: napConsistency,
        citation_coverage: citationCoverage,
        review_velocity: reviewVelocity,
        review_rating: reviewRating,
        gbp_completeness: gbpCompleteness,
        schema_presence: schemaPresence,
        content_depth: contentDepth,
        ai_visibility: aiVisibility,
        overall_trust_score: overallTrustScore,
        trust_tier: trustTier,
        signals_breakdown: signalsBreakdown,
        last_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Trust score upsert error:", error);
      return NextResponse.json({ error: "Failed to save trust score" }, { status: 500 });
    }

    return NextResponse.json({ score: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
