import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendCitationDriftAlert } from "@/lib/email-alerts";

/**
 * GET /api/cron/citation-drift
 * Scheduled check for citation drift: re-checks directories where
 * the user's NAP has changed since last check, or where enough time
 * has passed since the last check.
 *
 * Auth: CRON_SECRET via Authorization header.
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
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

  console.log("[cron/citation-drift] Starting drift check");

  try {
    // Find users with business profiles that have NAP changes
    const { data: profiles, error: profileError } = await supabase
      .from("business_profiles")
      .select("id, user_id, business_name, address, city, state, zip, phone, nap_hash, updated_at");

    if (profileError) {
      console.error("[cron/citation-drift] Error fetching profiles:", profileError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, usersChecked: 0, driftDetected: 0 });
    }

    let usersChecked = 0;
    let driftDetected = 0;
    const notifications: any[] = [];

    for (const profile of profiles) {
      try {
        // Get sync states for this user
        const { data: syncStates } = await supabase
          .from("citation_sync_states")
          .select("id, directory_id, nap_hash_at_check, last_checked, consistency_score")
          .eq("user_id", profile.user_id);

        if (!syncStates || syncStates.length === 0) continue;

        const currentNapHash = profile.nap_hash;

        for (const state of syncStates) {
          // Drift condition 1: NAP hash has changed since last check
          const napChanged = currentNapHash && state.nap_hash_at_check && currentNapHash !== state.nap_hash_at_check;

          // Drift condition 2: Hasn't been checked in 14+ days
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
          const stale = !state.last_checked || state.last_checked < fourteenDaysAgo;

          if (napChanged || stale) {
            const newNAP = normalizeNAP({
              businessName: profile.business_name,
              address: profile.address,
              city: profile.city,
              state: profile.state,
              zip: profile.zip,
              phone: profile.phone,
            });

            // Mark drift detected
            const driftDetails: Record<string, any> = {};
            if (napChanged) {
              driftDetails.nap_change = {
                before_hash: state.nap_hash_at_check,
                after_hash: currentNapHash,
                message: "Your business NAP (Name/Address/Phone) has changed since the last directory check",
              };
            }
            if (stale) {
              driftDetails.stale_check = {
                last_checked: state.last_checked,
                message: "Directory listing hasn't been verified in 14+ days",
              };
            }

            await supabase
              .from("citation_sync_states")
              .update({
                drift_detected: true,
                drift_details: { ...driftDetails, current_nap_hash: newNAP },
                updated_at: new Date().toISOString(),
              })
              .eq("id", state.id);

            // Get directory name for notification
            const { data: dir } = await supabase
              .from("citation_directories")
              .select("name")
              .eq("id", state.directory_id)
              .single();

            // Log drift entry
            await supabase.from("citation_drift_log").insert({
              user_id: profile.user_id,
              citation_sync_state_id: state.id,
              directory_id: state.directory_id,
              drift_type: napChanged ? "nap_change" : "stale_check",
              before_value: state.nap_hash_at_check || "unknown",
              after_value: newNAP,
              severity: napChanged ? "warning" : "info",
            });

            driftDetected++;

            // Queue notification for significant drift
            if (napChanged) {
              notifications.push({
                user_id: profile.user_id,
                type: "warning",
                title: `Citation drift detected on ${dir?.name || state.directory_id}`,
                message: `Your business information has changed but your listing on ${dir?.name || state.directory_id} may still show old data. Re-check and update your citations.`,
                link: `${appUrl}/citations`,
                read: false,
              });
            }
          }
        }

        usersChecked++;
      } catch (userErr) {
        console.error(`[cron/citation-drift] Error for user ${profile.user_id}:`, userErr);
      }
    }

    // Send notifications in batch
    if (notifications.length > 0) {
      const { error: notifError } = await supabase.from("notifications").insert(notifications);
      if (notifError) {
        console.error("[cron/citation-drift] Notification insert error:", notifError);
      }

      // Send email alerts grouped by user
      const driftByUser = new Map<string, Array<{ directory: string; field: string; expected: string; found: string; severity: string }>>();
      for (const notif of notifications) {
        if (!driftByUser.has(notif.user_id)) driftByUser.set(notif.user_id, []);
        // Parse the notification for drift details
        driftByUser.get(notif.user_id)!.push({
          directory: notif.title.replace("Citation drift detected on ", ""),
          field: "NAP",
          expected: "Your canonical business info",
          found: "Potentially outdated listing",
          severity: notif.type === "warning" ? "warning" : "info",
        });
      }

      for (const [userId, drifts] of Array.from(driftByUser.entries())) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(userId);
          const email = authData?.user?.email;
          const { data: profile } = await supabase.from("business_profiles").select("business_name").eq("user_id", userId).single();
          if (email) {
            await sendCitationDriftAlert(email, profile?.business_name || "Your Business", drifts);
          }
        } catch (emailErr) {
          console.error(`[cron/citation-drift] Email alert failed for ${userId}:`, emailErr);
        }
      }
    }

    console.log(`[cron/citation-drift] Done. Users: ${usersChecked}, Drift: ${driftDetected}`);
    return NextResponse.json({
      success: true,
      usersChecked,
      driftDetected,
      notificationsSent: notifications.length,
    });
  } catch (err) {
    console.error("[cron/citation-drift] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
