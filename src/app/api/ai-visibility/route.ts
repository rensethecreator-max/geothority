import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { runAICitationScan, type AICheckResult } from "@/lib/ai-citation-scanner";

/**
 * GET /api/ai-visibility — Get AI visibility scorecard + query sets + history
 * POST /api/ai-visibility — Run a visibility check and persist results
 */

interface VisibilityCheckInput {
  query: string;
  city: string;
  vertical: string;
  businessName: string;
  engine: string;
  found: boolean;
  mentionedText: string | null;
  snippet: string;
  confidence: string;
  isReal: boolean;
  competitors: string[];
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    // Get scorecard
    const { data: scorecard } = await supabase
      .from("ai_visibility_scorecards")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get query sets
    const { data: querySets } = await supabase
      .from("ai_query_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Get recent checks (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentChecks } = await supabase
      .from("ai_visibility_checks")
      .select("*")
      .eq("user_id", user.id)
      .gte("checked_at", thirtyDaysAgo)
      .order("checked_at", { ascending: false })
      .limit(100);

    // Get content recommendations
    const { data: recommendations } = await supabase
      .from("ai_content_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .limit(10);

    // Compute trend data (last 10 scorecard snapshots)
    const checksByDate = new Map<string, { found: number; total: number }>();
    for (const check of recentChecks ?? []) {
      const date = new Date(check.checked_at).toISOString().slice(0, 10);
      const existing = checksByDate.get(date) ?? { found: 0, total: 0 };
      existing.total++;
      if (check.found) existing.found++;
      checksByDate.set(date, existing);
    }

    const trendData = Array.from(checksByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, data]) => ({
        date,
        found: data.found,
        total: data.total,
        rate: data.total > 0 ? Math.round((data.found / data.total) * 100) : 0,
      }));

    // Per-engine summary
    const engineSummary: Record<string, { checks: number; found: number; lastChecked: string | null }> = {};
    for (const check of recentChecks ?? []) {
      if (!engineSummary[check.engine]) {
        engineSummary[check.engine] = { checks: 0, found: 0, lastChecked: null };
      }
      engineSummary[check.engine].checks++;
      if (check.found) engineSummary[check.engine].found++;
      if (!engineSummary[check.engine].lastChecked || check.checked_at > engineSummary[check.engine].lastChecked!) {
        engineSummary[check.engine].lastChecked = check.checked_at;
      }
    }

    return NextResponse.json({
      scorecard: scorecard ?? null,
      querySets: querySets ?? [],
      recentChecks: recentChecks ?? [],
      recommendations: recommendations ?? [],
      trendData,
      engineSummary,
    });
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

    const body = await req.json();
    const { action = "check", ...params } = body;

    if (action === "check") {
      return await runAndPersistCheck(supabase, user.id, params);
    } else if (action === "save_query_set") {
      return await saveQuerySet(supabase, user.id, params);
    } else if (action === "dismiss_recommendation") {
      return await dismissRecommendation(supabase, user.id, params);
    } else if (action === "compute_scorecard") {
      return await computeScorecard(supabase, user.id);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function runAndPersistCheck(supabase: any, userId: string, params: Record<string, any>) {
  const { businessName, city, businessType, querySetId } = params;
  if (!businessName || !city) {
    return NextResponse.json({ error: "businessName and city are required" }, { status: 400 });
  }

  const query = `${city} ${businessType || "insurance agency"}`;

  // Run the AI citation scan
  const scanResult = await runAICitationScan({
    businessName,
    businessType: businessType || "insurance agency",
    city,
  });

  // Persist per-engine results
  const engines = [
    { engine: "google_ai", found: false, snippet: "", confidence: "none", mentionedText: null, isReal: false, competitors: [] },
    ...scanResult.results.map((r: AICheckResult) => ({
      engine: r.engine,
      found: r.found,
      snippet: r.snippet || "",
      confidence: r.confidence || "none",
      mentionedText: r.mentioned || null,
      isReal: r.isReal,
      competitors: r.competitors || [],
    })),
  ];

  const checkRows = engines.map(e => ({
    user_id: userId,
    query_set_id: querySetId || null,
    query,
    city,
    vertical: businessType || null,
    business_name: businessName,
    engine: e.engine,
    found: e.found,
    mentioned_text: e.mentionedText,
    snippet: e.snippet?.slice(0, 2000),
    confidence: e.confidence,
    is_real: e.isReal,
    competitors: e.competitors,
    check_source: "manual",
    checked_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("ai_visibility_checks")
    .insert(checkRows);

  if (insertError) {
    console.error("Failed to persist AI visibility checks:", insertError);
  }

  // Compute and update scorecard
  await computeScorecard(supabase, userId);

  return NextResponse.json({
    checksSaved: checkRows.length,
    found: engines.filter(e => e.found).length,
    total: engines.length,
  });
}

async function saveQuerySet(supabase: any, userId: string, params: Record<string, any>) {
  const { name, vertical, city, state, queries } = params;
  if (!name || !city || !queries) {
    return NextResponse.json({ error: "name, city, and queries are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ai_query_sets")
    .insert({
      user_id: userId,
      name,
      vertical,
      city,
      state,
      queries,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save query set" }, { status: 500 });
  return NextResponse.json({ querySet: data });
}

async function dismissRecommendation(supabase: any, userId: string, params: Record<string, any>) {
  const { recommendationId } = params;
  if (!recommendationId) return NextResponse.json({ error: "recommendationId required" }, { status: 400 });

  const { error } = await supabase
    .from("ai_content_recommendations")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", recommendationId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  return NextResponse.json({ success: true });
}

async function computeScorecard(supabase: any, userId: string) {
  // Get all checks for this user
  const { data: checks } = await supabase
    .from("ai_visibility_checks")
    .select("engine, found, confidence, checked_at")
    .eq("user_id", userId)
    .order("checked_at", { ascending: false });

  if (!checks || checks.length === 0) {
    return NextResponse.json({ scorecard: null });
  }

  // Get the latest check per engine
  const latestByEngine = new Map<string, any>();
  for (const check of checks) {
    if (!latestByEngine.has(check.engine)) {
      latestByEngine.set(check.engine, check);
    }
  }

  // Compute per-engine scores (0-100)
  const engineScores: Record<string, number> = {};
  for (const [engine, check] of Array.from(latestByEngine.entries())) {
    if (check.found) {
      engineScores[engine] = check.confidence === "high" ? 90 : check.confidence === "medium" ? 65 : 40;
    } else {
      engineScores[engine] = 0;
    }
  }

  // Overall score (average across engines)
  const engineValues = Object.values(engineScores);
  const overallScore = engineValues.length > 0
    ? Math.round(engineValues.reduce((a, b) => a + b, 0) / engineValues.length)
    : 0;

  const overallVisibility: string =
    overallScore >= 60 ? "high" :
    overallScore >= 35 ? "medium" :
    overallScore >= 10 ? "low" : "none";

  // Total queries checked
  const uniqueQueries = Array.from(new Set(checks.map((c: any) => c.query)));
  const foundQueriesArr = Array.from(new Set(checks.filter((c: any) => c.found).map((c: any) => c.query)));

  // Get previous score
  const { data: existingCard } = await supabase
    .from("ai_visibility_scorecards")
    .select("overall_score")
    .eq("user_id", userId)
    .single();

  const previousScore = existingCard?.overall_score ?? 0;
  const scoreDelta = overallScore - previousScore;

  // Build gap analysis
  const gapAnalysis: Record<string, any> = {};
  for (const [engine, score] of Object.entries(engineScores)) {
    if (score < 50) {
      gapAnalysis[engine] = {
        missing: true,
        recommendations: getEngineGapRecommendations(engine),
      };
    } else {
      gapAnalysis[engine] = { missing: false };
    }
  }

  // Build top recommendations
  const topRecommendations = buildTopRecommendations(engineScores, gapAnalysis);

  // Upsert scorecard
  const { data: scorecard, error } = await supabase
    .from("ai_visibility_scorecards")
    .upsert({
      user_id: userId,
      overall_score: overallScore,
      overall_visibility: overallVisibility,
      google_ai_score: engineScores["google_ai"] ?? 0,
      chatgpt_score: engineScores["chatgpt"] ?? 0,
      perplexity_score: engineScores["perplexity"] ?? 0,
      claude_score: engineScores["claude"] ?? 0,
      gemini_score: engineScores["gemini"] ?? 0,
      previous_overall_score: previousScore || null,
      score_delta: scoreDelta || null,
      total_queries: uniqueQueries.length,
      found_queries: foundQueriesArr.length,
      gap_analysis: gapAnalysis,
      top_recommendations: topRecommendations,
      last_computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert scorecard:", error);
  }

  // Generate content recommendations from gaps
  await generateContentRecommendations(supabase, userId, scorecard?.id, gapAnalysis);

  return NextResponse.json({ scorecard });
}

function getEngineGapRecommendations(engine: string): string[] {
  const recs: Record<string, string[]> = {
    google_ai: [
      "Add LocalBusiness structured data to your website",
      "Create comprehensive FAQ content targeting local queries",
      "Build citations on authoritative directories",
      "Get featured in local news and community sites",
    ],
    chatgpt: [
      "Create a detailed business profile on LinkedIn and Crunchbase",
      "Get mentioned in blog posts, roundups, and industry lists",
      "Build a comprehensive Wikipedia-style page about your business",
      "Ensure consistent NAP across all platforms",
    ],
    perplexity: [
      "Ensure your business is on data aggregators (Foursquare, Acxiom)",
      "Build review volume on Google, Yelp, and BBB",
      "Publish expert content establishing topical authority",
      "Get listed in local chamber of commerce directories",
    ],
    claude: [
      "Add detailed structured FAQ content about your services",
      "Create authoritative About content explaining your expertise",
      "Earn quality backlinks from local organizations",
      "Build entity-rich content about your service area",
    ],
    gemini: [
      "Optimize your Google Business Profile with complete information",
      "Build local citations across authoritative directories",
      "Create comprehensive FAQ content targeting local search",
      "Ensure your website has clear service descriptions",
    ],
  };
  return recs[engine] || recs.chatgpt;
}

function buildTopRecommendations(engineScores: Record<string, number>, gapAnalysis: Record<string, any>): string[] {
  const recs: string[] = [];

  // Prioritize engines where the business is not found
  const missingEngines = Object.entries(engineScores)
    .filter(([_, score]) => score < 30)
    .sort(([_, a], [__, b]) => a - b);

  if (missingEngines.length > 0) {
    recs.push(`Focus on ${missingEngines[0][0].replace("_", " ")} visibility first — you're not appearing there`);
  }

  const avgScore = Object.values(engineScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(engineScores).length);
  if (avgScore < 30) {
    recs.push("Create a comprehensive FAQ page targeting your local service queries");
    recs.push("Add LocalBusiness schema markup to every page of your website");
    recs.push("Build consistent citations across Google, Yelp, and Bing Places");
  } else if (avgScore < 60) {
    recs.push("Strengthen existing visibility with entity-rich content about your expertise");
    recs.push("Earn quality backlinks from local news, chambers, and industry sites");
  } else {
    recs.push("Maintain your strong AI visibility — keep content fresh and citations accurate");
  }

  return recs.slice(0, 5);
}

async function generateContentRecommendations(supabase: any, userId: string, scorecardId: string | undefined, gapAnalysis: Record<string, any>) {
  const recs: Array<{
    recommendation_type: string;
    title: string;
    description: string;
    priority: number;
    impact_estimate: string;
    target_engine: string;
  }> = [];

  for (const [engine, gap] of Object.entries(gapAnalysis)) {
    if (!gap.missing) continue;

    if (engine === "google_ai") {
      recs.push({
        recommendation_type: "schema",
        title: "Add LocalBusiness Schema Markup",
        description: "Google AI Overviews rely heavily on structured data. Add comprehensive LocalBusiness schema to your website.",
        priority: 95,
        impact_estimate: "high",
        target_engine: engine,
      });
      recs.push({
        recommendation_type: "faq_page",
        title: "Create Local FAQ Page",
        description: "Build a comprehensive FAQ page answering the most common questions about your service in your area.",
        priority: 90,
        impact_estimate: "high",
        target_engine: engine,
      });
    }

    if (engine === "chatgpt") {
      recs.push({
        recommendation_type: "entity_page",
        title: "Build Business Entity Page",
        description: "Create a detailed, Wikipedia-style page about your business with history, services, team, and community involvement.",
        priority: 85,
        impact_estimate: "high",
        target_engine: engine,
      });
    }

    if (engine === "perplexity") {
      recs.push({
        recommendation_type: "citation",
        title: "Expand Citation Footprint",
        description: "Perplexity pulls from data aggregators and authoritative directories. Ensure you're listed on Foursquare, Yelp, BBB, and Bing Places.",
        priority: 80,
        impact_estimate: "medium",
        target_engine: engine,
      });
    }

    if (engine === "claude") {
      recs.push({
        recommendation_type: "trust_content",
        title: "Create Authoritative About Content",
        description: "Claude values detailed, well-structured About content. Create a comprehensive page about your expertise and local presence.",
        priority: 75,
        impact_estimate: "medium",
        target_engine: engine,
      });
    }

    if (engine === "gemini") {
      recs.push({
        recommendation_type: "local_page",
        title: "Optimize Google Business Profile",
        description: "Gemini draws heavily from Google's own data. Ensure your GBP is complete with description, services, hours, and posts.",
        priority: 85,
        impact_estimate: "high",
        target_engine: engine,
      });
    }
  }

  if (recs.length === 0) return;

  // Insert recommendations (avoid duplicates)
  const rows = recs.map(r => ({
    user_id: userId,
    scorecard_id: scorecardId || null,
    ...r,
    status: "pending",
  }));

  const { error } = await supabase
    .from("ai_content_recommendations")
    .insert(rows);

  if (error) {
    console.error("Failed to insert AI content recommendations:", error);
  }
}
