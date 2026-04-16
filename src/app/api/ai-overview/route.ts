import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { runAICitationScan, type AICheckResult } from "@/lib/ai-citation-scanner";
import { getCachedAIOverview } from "@/lib/cached-ai";
import { requirePlan } from "@/lib/plan-gate";

interface GoogleAiOverviewResult {
  source: "google";
  found: boolean;
  mentionedText: string | null;
  confidence: "high" | "medium" | "low" | "none";
  snippet: string;
  recommendations: string[];
}

export interface AiOverviewResponse {
  query: string;
  businessName: string;
  googleResult: GoogleAiOverviewResult;
  aiResults: AICheckResult[];
  realApiCount: number;
  overallVisibility: "high" | "medium" | "low" | "none";
  topRecommendations: string[];
}

export async function POST(req: NextRequest) {
  try {
    // AI overview visibility requires growth plan or above
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { businessName, city, businessType } = await req.json();

    if (!businessName || !city) {
      return NextResponse.json(
        { error: "businessName and city are required" },
        { status: 400 }
      );
    }

    const query = `${city} ${businessType || "insurance agency"}`;
    const serpApiKey = process.env.SERP_API_KEY;

    // Use cache for AI scans (24h TTL) + always fetch Google fresh (SERP API has its own caching)
    const [googleResult, { data: aiScanData, fromCache }] = await Promise.all([
      checkGoogleAiOverview(query, businessName, serpApiKey),
      getCachedAIOverview(
        businessName,
        city,
        businessType || "insurance agency",
        () => runAICitationScan({ businessName, businessType: businessType || "insurance agency", city })
      ),
    ]);

    const { results: aiResults, realApiCount } = aiScanData;

    const foundCount =
      (googleResult.found ? 1 : 0) + aiResults.filter((r) => r.found).length;
    const totalChecked = 1 + aiResults.filter((r) => r.status !== "skipped").length;

    const overallVisibility: "high" | "medium" | "low" | "none" =
      foundCount >= 3
        ? "high"
        : foundCount === 2
        ? "medium"
        : foundCount === 1
        ? "low"
        : "none";

    // Build top recommendations from AI results
    const recMap: Record<string, string[]> = {
      chatgpt: [
        "Create a comprehensive Wikipedia-style page about your business",
        "Get mentioned in local blog posts, news articles, and roundup pieces",
        "Build your presence on authoritative data sources (LinkedIn, Crunchbase)",
        "Consistently use the same business name across all platforms",
      ],
      perplexity: [
        "Ensure your business is listed on data aggregators (Acxiom, Neustar/Localeze)",
        "Build review volume on Google, Yelp, and BBB",
        "Publish expert content that establishes topical authority in your area",
        "Get listed in local chamber of commerce and industry directories",
      ],
      claude: [
        "Add detailed structured FAQ content about your services and location",
        "Create authoritative 'About' content explaining your expertise and history",
        "Earn quality backlinks from local organizations and news outlets",
      ],
      gemini: [
        "Optimize your Google Business Profile with complete, accurate information",
        "Build local citations across authoritative directories (Yelp, BBB, Bing Places)",
        "Create comprehensive FAQ content targeting local search queries",
      ],
    };

    const allRecs: string[] = [];
    for (const r of aiResults) {
      if (!r.found && r.status !== "skipped") {
        allRecs.push(...(recMap[r.engine] || []));
      }
    }
    if (!googleResult.found) {
      allRecs.push(...(googleResult.recommendations || []));
    }

    const seen = new Set<string>();
    const topRecommendations = allRecs
      .filter((rec) => {
        if (seen.has(rec)) return false;
        seen.add(rec);
        return true;
      })
      .slice(0, 5);

    const response: AiOverviewResponse = {
      query,
      businessName,
      googleResult,
      aiResults,
      realApiCount,
      overallVisibility,
      topRecommendations,
    };

    // Add cache header for transparency
    const headers = fromCache ? { "X-Cache": "HIT" } : { "X-Cache": "MISS" };
    return NextResponse.json(response, { headers });
  } catch (err) {
    console.error("AI overview error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function checkGoogleAiOverview(
  query: string,
  businessName: string,
  serpApiKey: string | undefined
): Promise<GoogleAiOverviewResult> {
  if (!serpApiKey) {
    return {
      source: "google",
      found: false,
      mentionedText: null,
      confidence: "none",
      snippet: "__DEMO_MODE__",
      recommendations: [
        "Optimize your Google Business Profile with complete, accurate information",
        "Build local citations across authoritative directories (Yelp, BBB, Bing Places)",
        "Create comprehensive FAQ content targeting local search queries",
      ],
    };
  }

  try {
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&hl=en&gl=us`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = (await res.json()) as {
      ai_overview?: { snippets?: { snippet?: string }[] };
    };

    const aiOverview = data.ai_overview;
    if (!aiOverview) {
      return {
        source: "google",
        found: false,
        mentionedText: null,
        confidence: "none",
        snippet:
          "No AI Overview found for this query. Google AI Overviews appear for some queries.",
        recommendations: [
          "Create comprehensive FAQ content about your service area",
          "Build topical authority with locally-relevant content",
          "Earn backlinks from authoritative local sources",
        ],
      };
    }

    const snippetText =
      aiOverview.snippets?.map((s) => s.snippet).join(" ") || "";
    const found = snippetText.toLowerCase().includes(businessName.toLowerCase());

    return {
      source: "google",
      found,
      mentionedText: found ? snippetText.slice(0, 300) : null,
      confidence: found ? "high" : "none",
      snippet:
        snippetText.slice(0, 400) || "AI Overview present but no snippet extracted.",
      recommendations: found
        ? ["Your business appears in Google AI Overviews — maintain your current SEO strategy"]
        : [
            "Add structured data (LocalBusiness schema) to your website",
            "Create content that directly answers common local queries",
            "Get featured in local news and authoritative sites",
          ],
    };
  } catch {
    return {
      source: "google",
      found: false,
      mentionedText: null,
      confidence: "none",
      snippet: "Could not reach SerpAPI. Check your API key.",
      recommendations: ["Ensure your SerpAPI key is valid and has remaining credits"],
    };
  }
}
