import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendAIVisibilityChangeAlert } from "@/lib/email-alerts";

/**
 * Cron endpoint: Recurring AI visibility checks for all users with query sets.
 * Called by Vercel cron or external scheduler.
 * POST /api/cron/ai-visibility (with cron_secret)
 */

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, supabaseKey);

  try {
    // Get all query sets that haven't been checked in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleQuerySets, error: qsError } = await supabase
      .from("ai_query_sets")
      .select("id, user_id, name, city, state, vertical, queries")
      .or(`last_checked_at.is.null,last_checked_at.lt.${twentyFourHoursAgo}`)
      .limit(50);

    if (qsError) {
      console.error("Failed to fetch stale query sets:", qsError);
      return NextResponse.json({ error: "Failed to fetch query sets" }, { status: 500 });
    }

    if (!staleQuerySets || staleQuerySets.length === 0) {
      return NextResponse.json({ message: "No stale query sets to check", checked: 0 });
    }

    // Get user business profiles for the query set owners
    const userIds = Array.from(new Set(staleQuerySets.map((qs: any) => qs.user_id)));
    const { data: profiles } = await supabase
      .from("business_profiles")
      .select("user_id, business_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.business_name]));

    // Get user profiles as fallback
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("id, business_name")
      .in("id", userIds);

    for (const up of userProfiles ?? []) {
      if (!profileMap.has(up.id)) profileMap.set(up.id, up.business_name);
    }

    let checkedCount = 0;

    // Process each query set
    for (const qs of staleQuerySets) {
      const businessName = profileMap.get(qs.user_id) || "Your Business";
      const vertical = qs.vertical || "insurance agency";
      const queries = qs.queries as Array<{ query: string; priority: number }>;

      if (!queries || queries.length === 0) continue;

      // Check top 3 queries per set (to stay within API budgets)
      const topQueries = queries
        .sort((a: any, b: any) => (a.priority ?? 5) - (b.priority ?? 5))
        .slice(0, 3);

      for (const q of topQueries) {
        try {
          // Call the internal AI visibility check endpoint
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : `http://localhost:${process.env.PORT || 3000}`;

          const checkRes = await fetch(`${baseUrl}/api/ai-visibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "check",
              businessName,
              city: qs.city,
              businessType: vertical,
              querySetId: qs.id,
            }),
          });

          if (checkRes.ok) checkedCount++;
        } catch (err) {
          console.error(`Failed to check query "${q.query}" for user ${qs.user_id}:`, err);
        }
      }

      // Update last_checked_at
      await supabase
        .from("ai_query_sets")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", qs.id);
    }

    // Send email alerts for AI visibility score changes
    for (const qs of staleQuerySets) {
      try {
        // Get previous and current scorecard
        const { data: scorecard } = await supabase
          .from("ai_visibility_scorecards")
          .select("overall_score, previous_overall_score, score_delta")
          .eq("user_id", qs.user_id)
          .single();

        if (scorecard && scorecard.score_delta !== null && scorecard.score_delta !== 0) {
          // Get user email
          const { data: authData } = await supabase.auth.admin.getUserById(qs.user_id);
          const email = authData?.user?.email;
          const { data: profile } = await supabase.from("business_profiles").select("business_name").eq("user_id", qs.user_id).single();

          if (email) {
            const prev = scorecard.previous_overall_score ?? 0;
            const curr = scorecard.overall_score;
            await sendAIVisibilityChangeAlert(email, profile?.business_name || "Your Business", [
              {
                engine: "Overall AI Visibility",
                previous: `${prev}/100`,
                current: `${curr}/100`,
                delta: scorecard.score_delta,
              },
            ]);
          }
        }
      } catch (alertErr) {
        console.error(`[cron/ai-visibility] Email alert failed for ${qs.user_id}:`, alertErr);
      }
    }

    return NextResponse.json({
      message: `AI visibility cron completed`,
      querySetsChecked: staleQuerySets.length,
      checksRun: checkedCount,
    });
  } catch (err: any) {
    console.error("AI visibility cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
