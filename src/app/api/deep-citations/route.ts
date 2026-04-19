import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateDeepCitationAndLinkReport, formatReportAsMarkdown } from "@/lib/deep-citation/report-builder";
import type { DeepCitationReportConfig } from "@/lib/deep-citation/report-builder";

/**
 * POST /api/deep-citations
 * Deep Citation & Local Link Authority analysis
 * Body: { businessName, address, phone, city, state, zip, website, industry, categories, services, hours }
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { businessName, address, phone, city, state, zip, website, industry, categories, services, hours, format } = body;

    if (!businessName || !city || !state || !industry) {
      return NextResponse.json(
        { error: "businessName, city, state, and industry are required" },
        { status: 400 }
      );
    }

    const config: DeepCitationReportConfig = {
      businessName,
      address: address || "",
      phone: phone || "",
      city,
      state,
      zip: zip || "",
      website: website || "",
      industry,
      categories: categories || [],
      services: services || [],
      hours: hours || undefined,
    };

    const report = await generateDeepCitationAndLinkReport(config);

    if (format === "markdown") {
      const md = formatReportAsMarkdown(report);
      return new NextResponse(md, {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Deep citation report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", message: msg },
      { status: 500 }
    );
  }
}
