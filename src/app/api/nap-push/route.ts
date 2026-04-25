import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { verifyAndSync } from "@/lib/foursquare";

/**
 * POST /api/nap-push — Start a NAP push batch
 * GET /api/nap-push — Get batch status
 */

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    // Get business profile
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "No business profile found. Set up your profile first." }, { status: 400 });
    }

    // Get directories relevant to this business
    const { data: directories } = await supabase
      .from("citation_directories")
      .select("*")
      .eq("active", true);

    if (!directories || directories.length === 0) {
      return NextResponse.json({ error: "No directories configured" }, { status: 400 });
    }

    // Create batch
    const businessData = {
      businessName: profile.business_name,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      phone: profile.phone,
      website: profile.website,
      email: profile.email,
    };

    const { data: batch, error: batchError } = await supabase
      .from("nap_push_batches")
      .insert({
        user_id: user.id,
        canonical_nap_hash: profile.nap_hash,
        business_data: businessData,
        total_directories: directories.length,
        status: "pending",
      })
      .select()
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
    }

    // Create per-directory results
    const results = directories.map((dir: any) => ({
      batch_id: batch.id,
      user_id: user.id,
      directory_id: dir.id,
      directory_name: dir.name,
      sync_mode: dir.sync_mode || "unknown",
      status: "pending",
    }));

    const { error: resultsError } = await supabase
      .from("nap_push_results")
      .insert(results);

    if (resultsError) {
      console.error("Failed to create push results:", resultsError);
    }

    // Process each directory based on sync mode
    let pushed = 0, failed = 0, skipped = 0, guided = 0;

    for (const dir of directories) {
      const mode = dir.sync_mode || "unknown";

      if (mode === "direct") {
        // Attempt direct API push
        try {
          const pushResult = await pushToDirectory(dir, businessData);
          if (pushResult.success) {
            pushed++;
            await supabase
              .from("nap_push_results")
              .update({
                status: "pushed",
                result_detail: pushResult.message,
                url: pushResult.url || null,
                pushed_at: new Date().toISOString(),
              })
              .eq("batch_id", batch.id)
              .eq("directory_id", dir.id);
          } else {
            failed++;
            await supabase
              .from("nap_push_results")
              .update({
                status: "failed",
                result_detail: pushResult.message,
              })
              .eq("batch_id", batch.id)
              .eq("directory_id", dir.id);
          }
        } catch (err: any) {
          failed++;
          await supabase
            .from("nap_push_results")
            .update({ status: "failed", result_detail: err.message })
            .eq("batch_id", batch.id)
            .eq("directory_id", dir.id);
        }
      } else if (mode === "distribution") {
        // Queue for aggregator push
        try {
          await queueAggregatorSync(supabase, user.id, dir, businessData);
          pushed++;
          await supabase
            .from("nap_push_results")
            .update({
              status: "pushed",
              result_detail: "Queued for aggregator distribution",
              pushed_at: new Date().toISOString(),
            })
            .eq("batch_id", batch.id)
            .eq("directory_id", dir.id);
        } catch {
          failed++;
          await supabase
            .from("nap_push_results")
            .update({ status: "failed", result_detail: "Aggregator queue failed" })
            .eq("batch_id", batch.id)
            .eq("directory_id", dir.id);
        }
      } else if (mode === "guided") {
        // Generate step-by-step instructions
        guided++;
        await supabase
          .from("nap_push_results")
          .update({
            status: "guided",
            result_detail: generateGuidedInstructions(dir, businessData),
          })
          .eq("batch_id", batch.id)
          .eq("directory_id", dir.id);
      } else {
        skipped++;
        await supabase
          .from("nap_push_results")
          .update({ status: "skipped", result_detail: "No sync method available" })
          .eq("batch_id", batch.id)
          .eq("directory_id", dir.id);
      }
    }

    // Update batch
    await supabase
      .from("nap_push_batches")
      .update({
        pushed_count: pushed,
        failed_count: failed,
        skipped_count: skipped,
        status: failed > 0 && pushed > 0 ? "partial" : pushed > 0 ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    return NextResponse.json({
      batchId: batch.id,
      total: directories.length,
      pushed,
      failed,
      skipped,
      guided,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (batchId) {
      // Get specific batch with results
      const { data: batch } = await supabase
        .from("nap_push_batches")
        .select("*")
        .eq("id", batchId)
        .eq("user_id", user.id)
        .single();

      if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const { data: results } = await supabase
        .from("nap_push_results")
        .select("*")
        .eq("batch_id", batchId)
        .order("directory_name");

      return NextResponse.json({ batch, results: results ?? [] });
    }

    // Get recent batches
    const { data: batches } = await supabase
      .from("nap_push_batches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ batches: batches ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────

async function pushToDirectory(dir: any, data: Record<string, any>): Promise<{ success: boolean; message: string; url?: string }> {
  // Direct API push implementations per directory
  if (dir.name?.toLowerCase().includes("foursquare")) {
    try {
      const result = await verifyAndSync({
        name: data.businessName,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        website: data.website,
      });

      if (result.action === "error" || result.action === "not_found") {
        return { success: false, message: result.details, url: result.claimUrl };
      }

      return {
        success: true,
        message: result.details,
        url: result.claimUrl || (result.venue ? `https://foursquare.com/v/${result.venue.id}` : undefined),
      };
    } catch {
      return { success: false, message: "Foursquare API error" };
    }
  }

  // Generic: directory has no direct API
  return { success: false, message: `No direct API for ${dir.name}` };
}

async function queueAggregatorSync(supabase: any, userId: string, dir: any, data: Record<string, any>) {
  // Queue an aggregator sync job for this directory
  await supabase.from("aggregator_sync_jobs").insert({
    user_id: userId,
    provider: "yext", // Default to Yext for distribution
    status: "queued",
    business_data: data,
  });
}

function generateGuidedInstructions(dir: any, data: Record<string, any>): string {
  return [
    `1. Go to ${dir.name} (${dir.url || "search online"})`,
    `2. Create or claim your business listing`,
    `3. Enter your business name exactly: "${data.businessName}"`,
    `4. Address: ${data.address}, ${data.city}, ${data.state} ${data.zip}`,
    `5. Phone: ${data.phone}`,
    `6. Website: ${data.website}`,
    `7. Verify ownership via phone, email, or postcard`,
    `8. Confirm all details match your canonical NAP exactly`,
  ].join("\n");
}
