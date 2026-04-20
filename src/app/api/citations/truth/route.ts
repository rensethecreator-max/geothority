import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createHash } from "crypto";

/**
 * GET /api/citations/truth — Get citation truth model: sync states per directory with honest coverage
 * POST /api/citations/truth — Sync citation states from a fresh check into the truth model
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's canonical profile
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get all directories
    const { data: directories } = await supabase
      .from("citation_directories")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: false });

    // Get sync states
    const { data: syncStates } = await supabase
      .from("citation_sync_states")
      .select("*")
      .eq("user_id", user.id);

    const syncMap = new Map((syncStates ?? []).map(s => [s.directory_id, s]));

    // Get drift log entries (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: driftLog } = await supabase
      .from("citation_drift_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("detected_at", thirtyDaysAgo)
      .order("detected_at", { ascending: false });

    // Build response
    const directoryStates = (directories ?? []).map(dir => {
      const state = syncMap.get(dir.id);
      return {
        id: dir.id,
        name: dir.name,
        icon: dir.icon,
        tier: dir.tier,
        syncMode: dir.sync_mode,
        distributionSource: dir.distribution_source,
        checkMethod: dir.check_method,
        claimUrl: state?.claim_url ?? dir.claim_url,
        // Current state
        syncStatus: state?.sync_status ?? "unchecked",
        listingFound: state?.listing_found ?? null,
        nameMatch: state?.name_match ?? null,
        addressMatch: state?.address_match ?? null,
        phoneMatch: state?.phone_match ?? null,
        consistencyScore: state?.consistency_score ?? null,
        listingUrl: state?.listing_url ?? null,
        lastChecked: state?.last_checked ?? null,
        lastSynced: state?.last_synced ?? null,
        driftDetected: state?.drift_detected ?? false,
        driftDetails: state?.drift_details ?? {},
        fixSteps: state?.fix_steps ?? [],
      };
    });

    // Summary stats
    const checked = directoryStates.filter(d => d.syncStatus !== "unchecked");
    const found = checked.filter(d => d.syncStatus === "found" || d.syncStatus === "synced");
    const mismatches = checked.filter(d => d.syncStatus === "mismatch");
    const notFound = checked.filter(d => d.syncStatus === "not_found");
    const withDrift = directoryStates.filter(d => d.driftDetected);

    // Sync mode breakdown (honesty layer)
    const directSync = directoryStates.filter(d => d.syncMode === "direct");
    const distributionSync = directoryStates.filter(d => d.syncMode === "distribution");
    const guided = directoryStates.filter(d => d.syncMode === "guided");
    const unknown = directoryStates.filter(d => d.syncMode === "unknown");

    return NextResponse.json({
      hasProfile: !!profile,
      profile: profile ?? null,
      directories: directoryStates,
      summary: {
        total: directoryStates.length,
        checked: checked.length,
        found: found.length,
        mismatches: mismatches.length,
        notFound: notFound.length,
        driftAlerts: withDrift.length,
        avgConsistency: checked.length > 0
          ? Math.round(checked.reduce((sum, d) => sum + (d.consistencyScore ?? 0), 0) / checked.length)
          : null,
      },
      syncModes: {
        direct: { count: directSync.length, label: "Automatic sync", description: "We push your data directly via API" },
        distribution: { count: distributionSync.length, label: "Distribution sync", description: "We push to a data aggregator that feeds these directories" },
        guided: { count: guided.length, label: "Guided workflow", description: "We provide step-by-step instructions to claim/update" },
        unknown: { count: unknown.length, label: "Presence check only", description: "We can check if you're listed but can't push data" },
      },
      recentDrift: (driftLog ?? []).slice(0, 20),
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

    const { citations, businessProfileId } = await req.json();
    if (!Array.isArray(citations)) {
      return NextResponse.json({ error: "citations array required" }, { status: 400 });
    }

    // Map old citation check results to directory IDs and sync states
    const directoryNameToId: Record<string, string> = {
      "Google Business Profile": "google",
      "Yelp": "yelp",
      "Bing Places": "bing",
      "Apple Maps": "apple",
      "Foursquare": "foursquare",
      "BBB": "bbb",
      "Manta": "manta",
      "MapQuest": "mapquest",
      "Nextdoor": "nextdoor",
      "Hotfrog": "hotfrog",
      "Chamber of Commerce": "chamber",
      "Superpages": "superpages",
      "Brownbook": "brownbook",
      "EZLocal": "ezlocal",
      "ShowMeLocal": "showmelocal",
      "US City": "uscity",
      "Tupalo": "tupalo",
      "CitySearch": "citysearch",
    };

    // Get current NAP hash for drift detection
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("nap_hash")
      .eq("user_id", user.id)
      .single();

    const currentNapHash = profile?.nap_hash;

    // Fetch existing sync states
    const { data: existingStates } = await supabase
      .from("citation_sync_states")
      .select("id, directory_id, nap_hash_at_check, consistency_score, listing_found, name_match, address_match, phone_match")
      .eq("user_id", user.id);

    const existingMap = new Map((existingStates ?? []).map(s => [s.directory_id, s]));

    const rows = [];
    const driftEntries = [];

    for (const citation of citations) {
      const dirId = directoryNameToId[citation.directory] || citation.directoryId;
      if (!dirId) continue;

      // Determine sync status
      let syncStatus: string;
      if (!citation.found) syncStatus = "not_found";
      else if (citation.nameMatch === false || citation.phoneMatch === false || (citation.consistencyScore ?? 0) < 80) syncStatus = "mismatch";
      else syncStatus = "found";

      const existing = existingMap.get(dirId);
      const previousNapHash = existing?.nap_hash_at_check;
      const driftDetected = existing && currentNapHash && previousNapHash && currentNapHash !== previousNapHash;

      // Detect specific field drift
      const driftDetails: Record<string, any> = {};
      if (existing) {
        if (existing.listing_found && !citation.found) {
          driftDetails.listing_lost = true;
          driftEntries.push({
            user_id: user.id,
            citation_sync_state_id: existing.id,
            directory_id: dirId,
            drift_type: "listing_lost",
            before_value: "found",
            after_value: "not_found",
            severity: "critical",
          });
        }
        if (existing.name_match === true && citation.nameMatch === false) {
          driftDetails.name_mismatch = true;
          driftEntries.push({
            user_id: user.id,
            citation_sync_state_id: existing.id,
            directory_id: dirId,
            drift_type: "name_mismatch",
            before_value: "matched",
            after_value: "mismatched",
            severity: "warning",
          });
        }
        if (existing.phone_match === true && citation.phoneMatch === false) {
          driftDetails.phone_mismatch = true;
          driftEntries.push({
            user_id: user.id,
            citation_sync_state_id: existing.id,
            directory_id: dirId,
            drift_type: "phone_mismatch",
            before_value: "matched",
            after_value: "mismatched",
            severity: "warning",
          });
        }
        if (existing.consistency_score && citation.consistencyScore && citation.consistencyScore < existing.consistency_score - 10) {
          driftDetails.score_drop = { before: existing.consistency_score, after: citation.consistencyScore };
          driftEntries.push({
            user_id: user.id,
            citation_sync_state_id: existing.id,
            directory_id: dirId,
            drift_type: "score_drop",
            before_value: String(existing.consistency_score),
            after_value: String(citation.consistencyScore),
            severity: "info",
          });
        }
      }

      rows.push({
        user_id: user.id,
        directory_id: dirId,
        business_profile_id: businessProfileId || null,
        listing_found: citation.found,
        name_match: citation.nameMatch ?? null,
        address_match: citation.addressMatch ?? null,
        phone_match: citation.phoneMatch ?? null,
        consistency_score: citation.consistencyScore ?? 0,
        listing_url: citation.url || null,
        sync_status: syncStatus,
        last_checked: new Date().toISOString(),
        nap_hash_at_check: currentNapHash,
        drift_detected: driftDetected || Object.keys(driftDetails).length > 0,
        drift_details: driftDetails,
        claim_url: citation.claimUrl || null,
        fix_steps: citation.fixSteps || [],
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert sync states
    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("citation_sync_states")
        .upsert(rows, { onConflict: "user_id,directory_id" });

      if (upsertError) {
        console.error("Failed to upsert citation sync states:", upsertError);
      }
    }

    // Insert drift log entries
    if (driftEntries.length > 0) {
      const { error: driftError } = await supabase
        .from("citation_drift_log")
        .insert(driftEntries);

      if (driftError) {
        console.error("Failed to insert drift log entries:", driftError);
      }
    }

    return NextResponse.json({
      synced: rows.length,
      driftDetected: driftEntries.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
