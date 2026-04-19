import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/gbp/profile
 * Returns the user's GBP profile data, audit, reviews summary, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", message: "Please sign in to continue." },
        { status: 401 }
      );
    }

    // Fetch GBP profile
    const { data: profile, error: profileError } = await supabase
      .from("gbp_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows — that's fine, means no profile yet
      console.error("Profile fetch error:", profileError);
    }

    if (!profile) {
      return NextResponse.json({ profile: null, audit: null, hasGBP: false });
    }

    // Fetch latest audit
    const { data: audit } = await supabase
      .from("gbp_audits")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch recent reviews (last 10)
    const { data: recentReviews } = await supabase
      .from("gbp_reviews")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .order("create_time", { ascending: false })
      .limit(10);

    // Fetch recent posts (last 5)
    const { data: recentPosts } = await supabase
      .from("gbp_posts")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .order("create_time", { ascending: false })
      .limit(5);

    // Fetch unanswered questions
    const { data: unansweredQs } = await supabase
      .from("gbp_questions")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .is("answer_text", null);

    // Fetch all questions for display
    const { data: allQuestions } = await supabase
      .from("gbp_questions")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .order("create_time", { ascending: false })
      .limit(10);

    // Fetch weekly metrics (last 8 weeks)
    const { data: weeklyMetrics } = await supabase
      .from("gbp_weekly_metrics")
      .select("*")
      .eq("gbp_profile_id", profile.id)
      .order("week_start", { ascending: false })
      .limit(8);

    return NextResponse.json({
      hasGBP: true,
      profile,
      audit,
      recentReviews: recentReviews || [],
      recentPosts: recentPosts || [],
      unansweredQuestions: unansweredQs || [],
      allQuestions: allQuestions || [],
      weeklyMetrics: weeklyMetrics || [],
    });
  } catch (error: any) {
    console.error("GBP profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP data", message: error.message },
      { status: 500 }
    );
  }
}
