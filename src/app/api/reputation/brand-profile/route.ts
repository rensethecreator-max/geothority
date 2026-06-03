import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { getPreferredBusinessName, isMissingTableError } from "@/lib/reputation/request-service";

async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const businessName = await getPreferredBusinessName(supabase, user.id);
    const businessIdentity = getReputationBusinessIdentity(businessName);
    const { data, error } = await supabase
      .from("business_brand_profiles")
      .select("business_name, website_url, logo_url, primary_color, accent_color, business_category, motif, tone, confidence_score, extraction_notes")
      .eq("user_id", user.id)
      .eq("business_key", businessIdentity.businessKey)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ profile: null, suggestedBusinessName: businessName, setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: data
        ? {
            businessName: data.business_name ?? businessName,
            websiteUrl: data.website_url ?? "",
            logoUrl: data.logo_url ?? "",
            primaryColor: data.primary_color ?? "",
            accentColor: data.accent_color ?? "",
            businessCategory: data.business_category ?? "",
            motif: data.motif ?? "",
            tone: data.tone ?? "",
            confidenceScore: data.confidence_score ?? 0,
            extractionNotes: data.extraction_notes ?? [],
          }
        : null,
      suggestedBusinessName: businessName,
      setupRequired: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load brand profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const fallbackBusinessName = await getPreferredBusinessName(supabase, user.id);
    const businessName = cleanText(body.businessName) || fallbackBusinessName;
    const businessIdentity = getReputationBusinessIdentity(businessName);
    const payload = {
      user_id: user.id,
      business_key: businessIdentity.businessKey,
      business_name: businessIdentity.displayName,
      website_url: cleanText(body.websiteUrl) || null,
      logo_url: cleanText(body.logoUrl) || null,
      primary_color: cleanText(body.primaryColor) || null,
      accent_color: cleanText(body.accentColor) || null,
      business_category: cleanText(body.businessCategory) || null,
      motif: cleanText(body.motif) || null,
      tone: cleanText(body.tone) || null,
      manual_overrides: {
        logoUrl: cleanText(body.logoUrl) || null,
        primaryColor: cleanText(body.primaryColor) || null,
        accentColor: cleanText(body.accentColor) || null,
        businessCategory: cleanText(body.businessCategory) || null,
        motif: cleanText(body.motif) || null,
        tone: cleanText(body.tone) || null,
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("business_brand_profiles").upsert(payload, { onConflict: "user_id,business_key" });
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Brand profile table is not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save brand profile" }, { status: 500 });
  }
}
