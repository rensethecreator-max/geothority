// ============================================================
// API: /api/keyword-research — Local Keyword Research & Gap Analysis
// Geothority Module
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { runFullResearch, type FullResearchInput } from "@/lib/keyword-research";

export async function POST(req: NextRequest) {
  try {
    // Keyword research requires growth plan or above
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;

    const body = await req.json();
    const {
      businessName,
      city,
      state,
      businessType,
      services,
      competitorDomains,
      websiteUrl,
      existingPages,
    } = body;

    if (!businessName || !city || !state || !businessType || !services?.length) {
      return NextResponse.json(
        { error: "businessName, city, state, businessType, and services are required" },
        { status: 400 }
      );
    }

    const input: FullResearchInput = {
      userId: user.id,
      scanId: body.scanId || null,
      businessName,
      city,
      state,
      businessType,
      services,
      competitorDomains: competitorDomains || [],
      websiteUrl: websiteUrl || null,
      existingPages: existingPages || [],
    };

    const result = await runFullResearch(input);

    // Store results in Supabase for persistence
    const supabase = await createServerSupabase();
    const { error: dbError } = await supabase.from("keyword_research_jobs").upsert({
      id: result.id,
      user_id: result.user_id,
      scan_id: result.scan_id,
      business_name: result.business_name,
      city: result.city,
      state: result.state,
      business_type: result.business_type,
      services: result.services,
      competitors: result.competitors,
      status: result.status,
      keywords: result.keywords,
      content_gaps: result.contentGaps,
      topic_clusters: result.topicClusters,
      content_briefs: result.contentBriefs,
      created_at: result.created_at,
      completed_at: result.completed_at,
    });

    if (dbError) {
      console.error("Failed to persist keyword research results:", dbError);
      // Still return results even if persistence fails
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Keyword research API error:", error);
    return NextResponse.json(
      { error: "Keyword research failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;

    const supabase = await createServerSupabase();
    const url = new URL(req.url);
    const jobId = url.searchParams.get("id");

    if (jobId) {
      const { data, error } = await supabase
        .from("keyword_research_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // List recent jobs
    const { data, error } = await supabase
      .from("keyword_research_jobs")
      .select("id, business_name, city, state, status, created_at, completed_at")
      .eq("user_id", gate.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json({ jobs: data });
  } catch (error) {
    console.error("Keyword research GET error:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
