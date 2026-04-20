import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createHash } from "crypto";

/**
 * GET /api/business-profile — Get the user's canonical business profile
 * POST /api/business-profile — Create or update the canonical profile
 * DELETE /api/business-profile — Delete the profile
 */

function normalizeNAP(input: { businessName: string; address?: string; city: string; state: string; zip?: string; phone?: string }) {
  const parts = [
    input.businessName?.trim().toLowerCase(),
    input.address?.trim().toLowerCase().replace(/[.,]/g, ""),
    input.city?.trim().toLowerCase(),
    input.state?.trim().toLowerCase(),
    input.zip?.trim(),
    input.phone?.replace(/\D/g, ""),
  ].filter(Boolean);
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Also fetch citation sync summary
    const { data: syncStates } = await supabase
      .from("citation_sync_states")
      .select("directory_id, sync_status, consistency_score, last_checked, drift_detected")
      .eq("user_id", user.id);

    const syncSummary = {
      totalDirectories: syncStates?.length ?? 0,
      found: syncStates?.filter(s => s.sync_status === "found" || s.sync_status === "synced").length ?? 0,
      mismatches: syncStates?.filter(s => s.sync_status === "mismatch").length ?? 0,
      notFound: syncStates?.filter(s => s.sync_status === "not_found" || s.sync_status === "unchecked").length ?? 0,
      driftDetected: syncStates?.filter(s => s.drift_detected).length ?? 0,
      avgConsistency: syncStates?.length
        ? Math.round(syncStates.reduce((sum, s) => sum + (s.consistency_score ?? 0), 0) / syncStates.length)
        : null,
    };

    return NextResponse.json({
      profile: profile ?? null,
      syncSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      businessName, address, city, state, zip, phone,
      website, email, categories, primaryCategory,
      description, hoursJson, latitude, longitude,
    } = body;

    if (!businessName || !city || !state) {
      return NextResponse.json({ error: "businessName, city, and state are required" }, { status: 400 });
    }

    const napHash = normalizeNAP({ businessName, address, city, state, zip, phone });

    // Check if user_profiles has existing data to seed from
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("business_name, city, state, website_url")
      .eq("id", user.id)
      .single();

    // Upsert business profile
    const { data: profile, error } = await supabase
      .from("business_profiles")
      .upsert({
        user_id: user.id,
        business_name: businessName || userProfile?.business_name,
        address,
        city: city || userProfile?.city,
        state: state || userProfile?.state,
        zip,
        phone,
        website: website || userProfile?.website_url,
        email,
        categories: categories ?? [],
        primary_category: primaryCategory,
        description,
        hours_json: hoursJson,
        latitude,
        longitude,
        nap_hash: napHash,
        last_verified: new Date().toISOString(),
        verification_source: "manual",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save profile", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("business_profiles")
      .delete()
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

