import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/plan-gate";
import { generateBrief } from "@/lib/content-generation";
import type { ContentType } from "@/lib/content-generation";

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "authority");
    if (gate.error) return gate.error;

    const { contentType, businessName, city, state, service, targetKeyword, industry, competitorContext } = await req.json();

    if (!city || !businessName) {
      return NextResponse.json({ error: "City and business name are required" }, { status: 400 });
    }

    const brief = await generateBrief({
      contentType: (contentType || "landing_page") as ContentType,
      businessName,
      city,
      state,
      service,
      targetKeyword,
      industry,
      competitorContext,
    });

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("Brief generation error:", error);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
