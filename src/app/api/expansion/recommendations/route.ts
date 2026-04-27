import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { ExpansionManager, generateAIRationale, getNearbyCitiesLive } from "@/lib/smart-expansion";
import type { CityExpansionInput, ServiceExpansionInput, DirectoryExpansionInput } from "@/lib/smart-expansion";

/**
 * POST /api/expansion/recommendations
 * Generate fresh expansion recommendations for the authenticated user.
 *
 * Body (optional overrides):
 *   { industry?, serviceRadius?, existingCityPages?, existingServicePages?, existingDirectories? }
 */
export async function POST(req: NextRequest) {
  const gate = await requirePlan(req, "growth");
  if (gate.error) return gate.error;

  const supabase = await createServerSupabase();
  const userId = gate.user.id;

  // ── Gather business context ─────────────────────────────────
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("business_name, city, state, website_url")
    .eq("id", userId)
    .single();

  const { data: latestScan } = await supabase
    .from("scans")
    .select("business_name, city, state, raw_scan_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const businessName = latestScan?.business_name || profile?.business_name || "My Business";
  const city = latestScan?.city || profile?.city || "";
  const state = latestScan?.state || profile?.state || "";
  const industry = inferIndustry(businessName, profile?.website_url, latestScan?.raw_scan_data);

  // ── Parse optional overrides ────────────────────────────────
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // ── Determine existing pages (from content system if available) ──
  const { data: existingContent } = await supabase
    .from("generated_content")
    .select("type, city, service, title")
    .eq("user_id", userId)
    .limit(200);

  const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const existingCityPages = (existingContent || [])
    .filter((c: any) => c.type === "city_page")
    .map((c: any) => c.city || c.title)
    .filter(Boolean)
    .map((value: string) => slugify(value));
  const existingServicePages = (existingContent || [])
    .filter((c: any) => c.type === "service_page")
    .map((c: any) => c.service || c.title)
    .filter(Boolean)
    .map((value: string) => slugify(value));

  // ── Get competitor services from stored competitors ─────────
  const { data: competitors } = await supabase
    .from("competitors")
    .select("domain, business_name")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(10);

  const competitorDomains = (competitors || []).map((c: any) => ({
    competitor_domain: c.domain,
    competitor_name: c.business_name,
    rank_position: null,
    has_dedicated_page: true,
    directory_listed: false,
    review_count: null,
    last_seen: null,
  }));

  // ── Build inputs ────────────────────────────────────────────
  const cityInput: CityExpansionInput = {
    currentCity: city,
    currentState: state,
    currentServices: body.services || inferServices(industry),
    competitors: competitorDomains,
    existingCityPages: body.existingCityPages || existingCityPages,
    serviceRadius: body.serviceRadius || 30,
    industry,
  };

  const serviceInput: ServiceExpansionInput = {
    currentServices: cityInput.currentServices,
    industry,
    city,
    state,
    existingServicePages: body.existingServicePages || existingServicePages,
    competitorServices: [], // expanded by keyword research in production
    searchVolumeData: body.searchVolumeData,
  };

  const dirInput: DirectoryExpansionInput = {
    industry,
    city,
    state,
    existingDirectories: body.existingDirectories || [],
  };

  // ── Generate recommendations ────────────────────────────────
  const manager = new ExpansionManager(supabase);
  const recommendation = await manager.generateAndSave(
    userId,
    businessName,
    cityInput,
    serviceInput,
    dirInput
  );

  // ── Enhance top targets with AI-generated rationale ──────────
  const topTargets = [
    ...recommendation.top_city_targets.slice(0, 5),
    ...recommendation.top_service_targets.slice(0, 5),
  ];
  await Promise.all(
    topTargets.map(async (t) => {
      const aiRationale = await generateAIRationale({
        targetName: t.name,
        targetType: t.type,
        industry,
        currentCity: city,
        impactScore: t.impact_score,
        signals: t.signals.map((s) => ({ type: s.type, value: s.value, source: s.source })),
        competitorGaps: t.competitor_presence
          .filter((c) => !c.has_dedicated_page)
          .map((c) => c.competitor_domain),
        businessName,
      });
      // Update rationale in DB with AI-enhanced version
      await supabase
        .from("expansion_targets")
        .update({ rationale: aiRationale, updated_at: new Date().toISOString() })
        .eq("id", t.id);
      t.rationale = aiRationale;
    })
  );

  return NextResponse.json(recommendation);
}

// ── Helpers ──────────────────────────────────────────────────

function inferIndustry(name?: string, website?: string, scanData?: any): string {
  const text = [name, website, scanData?.title, scanData?.description].filter(Boolean).join(" ").toLowerCase();
  const map: [RegExp, string][] = [
    [/insurance|agency|broker/, "insurance"],
    [/law|attorney|legal/, "legal"],
    [/dentist|dental|orthodont/, "dental"],
    [/roofer|roofing/, "roofing"],
    [/plumb|plumbing/, "plumbing"],
    [/hvac|heating|cooling|air conditioning/, "hvac"],
    [/real estate|realtor/, "real estate"],
    [/medspa|spa|aesthetics/, "med spa"],
    [/auto|mechanic|car repair/, "auto"],
  ];
  for (const [re, label] of map) { if (re.test(text)) return label; }
  return "local business";
}

function inferServices(industry: string): string[] {
  const map: Record<string, string[]> = {
    hvac: ["AC Repair", "Heating Installation", "Duct Cleaning"],
    plumbing: ["Plumbing Repair", "Water Heater Service", "Drain Cleaning"],
    dental: ["General Dentistry", "Teeth Whitening", "Dental Implants"],
    legal: ["Personal Injury", "Family Law", "Estate Planning"],
    roofing: ["Roof Repair", "Roof Replacement", "Storm Damage"],
    insurance: ["Auto Insurance", "Home Insurance", "Life Insurance"],
    "real estate": ["Buyer Representation", "Seller Representation", "Property Management"],
    "med spa": ["Botox", "Dermal Fillers", "Laser Treatments"],
    auto: ["Oil Change", "Brake Repair", "Engine Diagnostics"],
  };
  return map[industry] ?? ["Consultation", "Repair", "Installation"];
}
