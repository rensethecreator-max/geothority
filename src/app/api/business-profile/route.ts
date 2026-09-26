import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { ensureUserProfileExists } from "@/lib/supabase/ensure-user-profile";

type CitationSyncSummaryRow = {
  directory_id: string;
  sync_status: string;
  consistency_score: number | null;
  last_checked: string | null;
  drift_detected: boolean | null;
};

type BusinessProfileInput = {
  businessName: string;
  city: string;
  state: string;
  address?: string | null;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  categories?: string[];
  primaryCategory?: string | null;
  description?: string | null;
  hoursJson?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
};

function isBusinessProfileInput(value: unknown): value is BusinessProfileInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  for (const key of ["businessName", "city", "state"]) {
    if (typeof input[key] !== "string" || !input[key].trim() || input[key].length > 200) return false;
  }
  for (const key of ["address", "zip", "phone", "website", "email", "primaryCategory", "description"]) {
    if (input[key] != null && (typeof input[key] !== "string" || input[key].length > 10000)) return false;
  }
  if (input.categories !== undefined && (!Array.isArray(input.categories) || input.categories.length > 100 || !input.categories.every(category => typeof category === "string"))) return false;
  if (input.hoursJson != null && (typeof input.hoursJson !== "object" || Array.isArray(input.hoursJson))) return false;
  if (input.latitude != null && (typeof input.latitude !== "number" || !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90)) return false;
  if (input.longitude != null && (typeof input.longitude !== "number" || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180)) return false;
  return true;
}

/**
 * GET /api/business-profile — Get the user's canonical business profile
 * POST /api/business-profile — Create or update the canonical profile
 * DELETE /api/business-profile — Delete the profile
 */

function isMissingTableError(error: any) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /relation .* does not exist/i.test(error?.message || "")
    || /Could not find the table .* in the schema cache/i.test(error?.message || "");
}

function isSchemaDriftError(error: any) {
  return isMissingTableError(error)
    || error?.code === "PGRST204"
    || /Could not find the '.*' column of '.*' in the schema cache/i.test(error?.message || "");
}

function normalizeNAP(input: { businessName: string; address?: string | null; city: string; state: string; zip?: string | null; phone?: string | null }) {
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

    if (error && error.code !== "PGRST116" && !isSchemaDriftError(error)) {
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Also fetch citation sync summary
    const { data: syncStates, error: syncError } = await supabase
      .from("citation_sync_states")
      .select("directory_id, sync_status, consistency_score, last_checked, drift_detected")
      .eq("user_id", user.id);

    if (syncError && !isSchemaDriftError(syncError)) {
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const states: CitationSyncSummaryRow[] = syncStates ?? [];
    const syncSummary = {
      totalDirectories: states.length,
      found: states.filter(s => s.sync_status === "found" || s.sync_status === "synced").length,
      mismatches: states.filter(s => s.sync_status === "mismatch").length,
      notFound: states.filter(s => s.sync_status === "not_found" || s.sync_status === "unchecked").length,
      driftDetected: states.filter(s => s.drift_detected).length,
      avgConsistency: states.length
        ? Math.round(states.reduce((sum, s) => sum + (s.consistency_score ?? 0), 0) / states.length)
        : null,
    };

    return NextResponse.json({
      profile: isSchemaDriftError(error) ? null : (profile ?? null),
      syncSummary,
      setupRequired: isSchemaDriftError(error) || isSchemaDriftError(syncError),
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

    const body: unknown = await req.json().catch(() => null);
    if (!isBusinessProfileInput(body)) {
      return NextResponse.json({ error: "Valid businessName, city, and state are required. Check that optional business details have valid values." }, { status: 400 });
    }
    const {
      address, zip, phone,
      website, email, categories, primaryCategory,
      description, hoursJson, latitude, longitude,
    } = body;
    const businessName = body.businessName.trim();
    const city = body.city.trim();
    const state = body.state.trim();

    const napHash = normalizeNAP({ businessName, address, city, state, zip, phone });

    const profileSeed = await ensureUserProfileExists(supabase, user);
    if (profileSeed.error) {
      console.error("Failed to prepare user business profile:", profileSeed.error);
      return NextResponse.json({ error: "Failed to prepare your account profile" }, { status: 500 });
    }

    // Whitelist business fields so profile saves cannot alter billing or roles.
    const { data: savedUserProfile, error: userProfileError } = await supabase
      .from("user_profiles")
      .update({ business_name: businessName, city, state, ...(website !== undefined ? { website_url: website?.trim() || null } : {}) })
      .eq("id", user.id)
      .select("id, website_url")
      .maybeSingle();
    if (userProfileError || !savedUserProfile) {
      console.error("Failed to save user business details:", userProfileError);
      return NextResponse.json({ error: "Failed to save your account's business details" }, { status: 500 });
    }

    // Upsert business profile
    const { data: profile, error } = await supabase
      .from("business_profiles")
      .upsert({
        user_id: user.id,
        business_name: businessName,
        address,
        city,
        state,
        zip,
        phone,
        website: website?.trim() || savedUserProfile.website_url || null,
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
      if (isSchemaDriftError(error)) {
        return NextResponse.json({
          error: "Your business profile could not be saved because database setup is incomplete.",
          setupRequired: true,
        }, { status: 503 });
      }
      return NextResponse.json({ error: "Failed to save profile", details: error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Business profile save could not be verified" }, { status: 500 });
    }

    return NextResponse.json({ profile, setupRequired: false });
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

    if (error && !isSchemaDriftError(error)) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
