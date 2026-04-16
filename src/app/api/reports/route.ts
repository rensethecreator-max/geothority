import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/reports?scanId=uuid
 * POST /api/reports { scanId }
 *
 * Generate a comprehensive JSON report from scan data.
 * Includes Trust Stack score breakdown and actionable recommendations.
 */

export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get("scanId");
  return generateReport(scanId);
}

export async function POST(req: NextRequest) {
  try {
    const { scanId } = await req.json();
    return generateReport(scanId);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function generateReport(scanId: string | null) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!scanId) {
      // Return list of available scans for report generation
      const { data: scans } = await supabase
        .from("scans")
        .select("id, business_name, url, city, state, geothority_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      return NextResponse.json({
        message: "Provide a scanId to generate a report",
        availableScans: scans || [],
      });
    }

    // Fetch the scan
    const { data: scan, error } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .eq("user_id", user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json(
        { error: "Scan not found or access denied" },
        { status: 404 }
      );
    }

    const layerScores = scan.layer_scores || {};
    const rawData = scan.raw_scan_data || {};
    const quickWins = scan.quick_wins || [];
    const competitorGaps = scan.competitor_gaps || [];

    // Build Trust Stack breakdown
    const trustStack = {
      overallScore: scan.geothority_score,
      grade: getGrade(scan.geothority_score),
      layers: [
        {
          name: "Foundation (NAP/GBP)",
          layer: 1,
          score: layerScores.layer1 || 0,
          weight: "25%",
          grade: getGrade(layerScores.layer1 || 0),
          factors: [
            { name: "Phone number visible", pass: rawData.hasPhone || false },
            { name: "Address visible", pass: rawData.hasAddress || false },
            { name: "NAP consistency", pass: rawData.hasNAP || false },
            { name: "Business name in title", pass: (rawData.title || "").toLowerCase().includes((scan.business_name || "").toLowerCase()) },
            { name: "City in title", pass: (rawData.title || "").toLowerCase().includes((scan.city || "").toLowerCase()) },
          ],
        },
        {
          name: "Trust Pages",
          layer: 2,
          score: layerScores.layer2 || 0,
          weight: "20%",
          grade: getGrade(layerScores.layer2 || 0),
          factors: [
            { name: "About page", pass: rawData.hasAboutPage || false },
            { name: "Service area page", pass: rawData.hasServiceAreaPage || false },
            { name: "Licensing/credentials", pass: rawData.hasLicensing || false },
            { name: "FAQ page", pass: rawData.hasFAQPage || false },
          ],
        },
        {
          name: "Geo Content",
          layer: 3,
          score: layerScores.layer3 || 0,
          weight: "25%",
          grade: getGrade(layerScores.layer3 || 0),
          factors: [
            { name: "City-specific pages", value: (rawData.cityPages || []).length },
            { name: "City in meta description", pass: (rawData.description || "").toLowerCase().includes((scan.city || "").toLowerCase()) },
          ],
        },
        {
          name: "Reviews & Social Proof",
          layer: 4,
          score: layerScores.layer4 || 0,
          weight: "15%",
          grade: getGrade(layerScores.layer4 || 0),
          factors: [
            { name: "Reviews mentioned", pass: rawData.hasReviewsMentioned || false },
            { name: "Google Reviews link", pass: rawData.hasGoogleReviewsLink || false },
          ],
        },
        {
          name: "AI Optimization",
          layer: 5,
          score: layerScores.layer5 || 0,
          weight: "15%",
          grade: getGrade(layerScores.layer5 || 0),
          factors: [
            { name: "Schema markup", pass: rawData.hasSchema || false },
            { name: "LocalBusiness schema", pass: rawData.hasLocalBusinessSchema || false },
            { name: "FAQ schema", pass: rawData.hasFAQSchema || false },
            { name: "Meta description quality", pass: (rawData.description || "").length > 50 },
            { name: "Title tag quality", pass: (rawData.title || "").length > 10 && (rawData.title || "").length < 70 },
          ],
        },
      ],
    };

    // Technical SEO section (if enhanced scan data available)
    const technicalSeo = {
      ssl: { valid: rawData.sslValid ?? null, issuer: rawData.sslIssuer ?? null },
      pageLoadTimeMs: rawData.pageLoadTimeMs ?? null,
      robotsTxt: rawData.hasRobotsTxt ?? null,
      sitemapXml: rawData.hasSitemapXml ?? null,
      h1Tag: { present: rawData.hasH1 ?? null, text: rawData.h1Text ?? null },
      viewportMeta: rawData.hasViewportMeta ?? null,
      ogTags: {
        title: rawData.hasOgTitle ?? null,
        description: rawData.hasOgDescription ?? null,
        image: rawData.hasOgImage ?? null,
      },
      twitterCard: rawData.hasTwitterCard ?? null,
      images: {
        total: rawData.imagesTotal ?? null,
        withAlt: rawData.imagesWithAlt ?? null,
        missingAlt: rawData.imagesMissingAlt ?? null,
      },
    };

    const report = {
      reportId: `rpt_${scanId}`,
      generatedAt: new Date().toISOString(),
      business: {
        name: scan.business_name,
        url: scan.url,
        city: scan.city,
        state: scan.state,
      },
      trustStack,
      technicalSeo,
      quickWins,
      competitorGaps,
      pageMetrics: {
        title: rawData.title || "",
        metaDescription: rawData.description || "",
        internalLinkCount: (rawData.internalLinks || []).length,
        externalLinkCount: (rawData.externalLinks || []).length,
      },
      summary: generateSummary(scan.geothority_score, layerScores),
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", message: error.message },
      { status: 500 }
    );
  }
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

function generateSummary(
  overallScore: number,
  layerScores: Record<string, number>
): string {
  const weakest = Object.entries(layerScores).reduce((min, [k, v]) =>
    (v as number) < (min[1] as number) ? [k, v] : min
  );

  const layerNames: Record<string, string> = {
    layer1: "Foundation (NAP/GBP)",
    layer2: "Trust Pages",
    layer3: "Geo Content",
    layer4: "Reviews & Social Proof",
    layer5: "AI Optimization",
  };

  if (overallScore >= 80) {
    return `Your Geothority Score of ${overallScore}/100 is excellent. Focus on maintaining your strengths and pushing ${layerNames[weakest[0]] || "your weakest area"} higher.`;
  } else if (overallScore >= 60) {
    return `Your Geothority Score of ${overallScore}/100 shows a solid foundation with room to grow. Priority: improve ${layerNames[weakest[0]] || "your weakest layer"} (currently ${weakest[1]}/100).`;
  } else if (overallScore >= 40) {
    return `Your Geothority Score of ${overallScore}/100 indicates significant gaps in local authority. Start with the quick wins above — they'll have the biggest impact on visibility.`;
  } else {
    return `Your Geothority Score of ${overallScore}/100 means you're largely invisible in local search and AI results. The good news: the quick wins above can dramatically improve your score in days, not months.`;
  }
}
